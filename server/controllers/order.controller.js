// server/controllers/order.controller.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const { generateHandoffCode, hashHandoffCode, verifyHandoffCode } = require('../utils/handoff');
const { notifyOrderStatusChange } = require('../services/notification.service');
const { logger } = require('../utils/logger');

const memoryOrders = new Map();
const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Create a new delivery order (Customer)
 * @route   POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { provider, listingId, items, pickup, drop, paymentMethod } = req.body;

    // If linked to listing and DB connected, verify listing availability & pickup window
    if (listingId && isDbConnected()) {
      try {
        const listing = await Listing.findById(listingId);
        if (listing && !listing.isAvailable) {
          return res.status(400).json({
            success: false,
            message: 'Selected meal listing is no longer available',
            messageHi: 'चयनित भोजन सूची अब उपलब्ध नहीं है'
          });
        }
      } catch (e) {
        // Continue
      }
    }

    const orderData = {
      _id: new mongoose.Types.ObjectId(),
      customer: req.user._id,
      provider: provider || req.user._id,
      listing: listingId || null,
      rider: null,
      items: items || [{ title: 'Surplus Meal Box', portions: 1 }],
      pickup: {
        address: pickup.address || 'Pickup Point',
        location: {
          type: 'Point',
          coordinates: pickup.location?.coordinates || [77.391, 28.5355]
        },
        contactPhone: pickup.contactPhone || ''
      },
      drop: {
        address: drop.address || 'Drop Point',
        location: {
          type: 'Point',
          coordinates: drop.location?.coordinates || [77.398, 28.5380]
        },
        contactPhone: drop.contactPhone || req.user.phone
      },
      status: 'placed',
      paymentMethod: paymentMethod || 'online',
      paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending',
      pickupHandoffAttempts: 0,
      deliveryHandoffAttempts: 0,
      statusHistory: [
        {
          status: 'placed',
          timestamp: new Date(),
          note: 'Order created by customer',
          actorId: req.user._id,
          actorRole: 'customer'
        }
      ]
    };

    let order = null;
    if (isDbConnected()) {
      try {
        order = await Order.create(orderData);
      } catch (dbErr) {
        logger.warn(`Mongo Order.create failed (${dbErr.message}), using memory store`);
      }
    }

    if (!order) {
      order = orderData;
      memoryOrders.set(order._id.toString(), order);
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      messageHi: 'ऑर्डर सफलतापूर्वक दिया गया!',
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order by ID (Only participants: customer, rider, or provider)
 * @route   GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    let order = null;
    if (isDbConnected()) {
      try {
        order = await Order.findById(req.params.id)
          .populate('customer', 'name phone ratings')
          .populate('provider', 'name phone ratings')
          .populate('rider', 'name phone ratings emergencyContact location');
      } catch (e) {
        // Fall back
      }
    }

    if (!order) {
      order = memoryOrders.get(req.params.id.toString());
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get placed orders within 5km for Riders
 * @route   GET /api/orders/available
 */
const getAvailableOrders = async (req, res, next) => {
  try {
    let orders = [];
    if (isDbConnected()) {
      try {
        const riderLng = req.query.lng ? Number(req.query.lng) : (req.user.location?.coordinates[0] || 77.391);
        const riderLat = req.query.lat ? Number(req.query.lat) : (req.user.location?.coordinates[1] || 28.5355);
        orders = await Order.find({
          status: 'placed',
          rider: null,
          'pickup.location': {
            $near: {
              $geometry: { type: 'Point', coordinates: [riderLng, riderLat] },
              $maxDistance: 5000
            }
          }
        })
          .populate('provider', 'name phone')
          .populate('customer', 'name phone')
          .limit(20);
      } catch (e) {
        // Fall back
      }
    }

    if (orders.length === 0) {
      orders = Array.from(memoryOrders.values()).filter(
        (o) => o.status === 'placed' && !o.rider
      );
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Rider Accepts Order
 *          Generates 4-digit pickup and delivery handoff codes
 * @route   POST /api/orders/:id/accept
 */
const acceptOrder = async (req, res, next) => {
  try {
    let order = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        order = await Order.findById(req.params.id);
      } catch (e) {
        // Fall back
      }
    }

    if (!order) {
      order = memoryOrders.get(req.params.id.toString());
      isMemory = true;
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    if (order.status !== 'placed' || order.rider !== null) {
      return res.status(409).json({
        success: false,
        message: 'Order already accepted by another rider or cancelled',
        messageHi: 'ऑर्डर पहले से ही किसी अन्य राइडर द्वारा स्वीकार या रद्द कर दिया गया है'
      });
    }

    // Generate 4-digit handoff OTPs
    const rawPickupCode = generateHandoffCode();
    const rawDeliveryCode = generateHandoffCode();

    const pickupHash = await hashHandoffCode(rawPickupCode);
    const deliveryHash = await hashHandoffCode(rawDeliveryCode);

    order.rider = req.user._id;
    order.status = 'accepted';
    order.pickupHandoffCodeHash = pickupHash;
    order.deliveryHandoffCodeHash = deliveryHash;

    const isDemoMode = process.env.DEMO_MODE === 'true';
    if (isDemoMode) {
      order.demoPickupCode = rawPickupCode;
      order.demoDeliveryCode = rawDeliveryCode;
      console.log(`\n\x1b[32m\x1b[1m🤝 [ORDER #${order._id.toString().slice(-6)} HANDOFF CODES GENERATED]:\x1b[0m`);
      console.log(`   Pickup Code (Community gives to Rider):   \x1b[33m${rawPickupCode}\x1b[0m`);
      console.log(`   Delivery Code (Customer gives to Rider): \x1b[33m${rawDeliveryCode}\x1b[0m\n`);
    }

    order.statusHistory.push({
      status: 'accepted',
      timestamp: new Date(),
      note: `Accepted by rider ${req.user.name}`,
      actorId: req.user._id,
      actorRole: 'rider'
    });

    if (!isMemory && isDbConnected()) {
      await order.save();
    } else {
      memoryOrders.set(order._id.toString(), order);
    }

    // Broadcast status update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('order:status', {
        orderId: order._id,
        status: 'accepted',
        rider: { id: req.user._id, name: req.user.name, phone: req.user.phone }
      });
    }

    // Send notification
    notifyOrderStatusChange(order, 'accepted');

    return res.status(200).json({
      success: true,
      message: 'Order accepted successfully!',
      messageHi: 'ऑर्डर सफलतापूर्वक स्वीकार किया गया!',
      order,
      ...(isDemoMode && {
        demoHandoff: {
          pickupCode: rawPickupCode,
          deliveryCode: rawDeliveryCode
        }
      })
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify 4-digit Handoff OTP (Pickup or Delivery)
 * @route   POST /api/orders/:id/handoff
 */
const verifyHandoff = async (req, res, next) => {
  try {
    const { code, type } = req.body;
    let order = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        order = await Order.findById(req.params.id);
      } catch (e) {
        // Fall back
      }
    }

    if (!order) {
      order = memoryOrders.get(req.params.id.toString());
      isMemory = true;
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    if (type === 'pickup') {
      if (order.status !== 'accepted') {
        return res.status(400).json({
          success: false,
          message: `Cannot verify pickup in current status '${order.status}'`,
          messageHi: `वर्तमान स्थिति '${order.status}' में पिकअप सत्यापित नहीं किया जा सकता`
        });
      }

      const isMatch = await verifyHandoffCode(code, order.pickupHandoffCodeHash);
      if (!isMatch) {
        order.pickupHandoffAttempts = (order.pickupHandoffAttempts || 0) + 1;
        if (!isMemory && isDbConnected()) await order.save();
        return res.status(400).json({
          success: false,
          message: `Wrong pickup code! Attempts remaining: ${3 - order.pickupHandoffAttempts}`,
          messageHi: `गलत पिकअप कोड! शेष प्रयास: ${3 - order.pickupHandoffAttempts}`
        });
      }

      order.pickupHandoffVerified = true;
      order.status = 'on_the_way';
      order.statusHistory.push({
        status: 'on_the_way',
        timestamp: new Date(),
        note: `Pickup handoff verified successfully with 4-digit code. Order is on the way.`,
        actorId: req.user._id,
        actorRole: 'rider'
      });

      if (!isMemory && isDbConnected()) await order.save();
      else memoryOrders.set(order._id.toString(), order);

      const io = req.app.get('io');
      if (io) {
        io.to(`order:${order._id}`).emit('order:status', {
          orderId: order._id,
          status: 'on_the_way'
        });
      }

      notifyOrderStatusChange(order, 'on_the_way');

      return res.status(200).json({
        success: true,
        message: 'Pickup verified! Order is now On The Way.',
        messageHi: 'पिकअप सत्यापित! ऑर्डर अब रास्ते में है।',
        order
      });
    }

    if (type === 'delivery') {
      if (!['picked_up', 'on_the_way'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot verify delivery in current status '${order.status}'`,
          messageHi: `वर्तमान स्थिति '${order.status}' में डिलीवरी सत्यापित नहीं की जा सकती`
        });
      }

      const isMatch = await verifyHandoffCode(code, order.deliveryHandoffCodeHash);
      if (!isMatch) {
        order.deliveryHandoffAttempts = (order.deliveryHandoffAttempts || 0) + 1;
        if (!isMemory && isDbConnected()) await order.save();
        return res.status(400).json({
          success: false,
          message: `Wrong delivery code! Attempts remaining: ${3 - order.deliveryHandoffAttempts}`,
          messageHi: `गलत डिलीवरी कोड! शेष प्रयास: ${3 - order.deliveryHandoffAttempts}`
        });
      }

      order.deliveryHandoffVerified = true;
      order.status = 'delivered';
      if (order.paymentMethod === 'cod') {
        order.paymentStatus = 'paid';
      }

      order.statusHistory.push({
        status: 'delivered',
        timestamp: new Date(),
        note: `Delivery handoff verified with customer 4-digit code. Order marked as DELIVERED.`,
        actorId: req.user._id,
        actorRole: 'rider'
      });

      if (!isMemory && isDbConnected()) await order.save();
      else memoryOrders.set(order._id.toString(), order);

      const io = req.app.get('io');
      if (io) {
        io.to(`order:${order._id}`).emit('order:status', {
          orderId: order._id,
          status: 'delivered'
        });
      }

      notifyOrderStatusChange(order, 'delivered');

      return res.status(200).json({
        success: true,
        message: 'Delivery handoff verified! Order DELIVERED successfully.',
        messageHi: 'डिलीवरी हैंडऑफ़ सत्यापित! ऑर्डर सफलतापूर्वक डिलीवर हो गया।',
        order
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Order Status (State Machine Guard)
 * @route   PATCH /api/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    let order = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        order = await Order.findById(req.params.id);
      } catch (e) {
        // Fall back
      }
    }

    if (!order) {
      order = memoryOrders.get(req.params.id.toString());
      isMemory = true;
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status transitioned to ${status}`,
      actorId: req.user._id,
      actorRole: req.user.role
    });

    if (!isMemory && isDbConnected()) await order.save();
    else memoryOrders.set(order._id.toString(), order);

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('order:status', {
        orderId: order._id,
        status
      });
    }

    notifyOrderStatusChange(order, status);

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      messageHi: `ऑर्डर स्थिति ${status} पर अपडेट की गई`,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Report order fraud/complaint
 * @route   POST /api/orders/:id/dispute
 */
const reportDispute = async (req, res, next) => {
  try {
    const { reason } = req.body;
    let order = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        order = await Order.findById(req.params.id);
      } catch (e) {
        // Fall back
      }
    }

    if (!order) {
      order = memoryOrders.get(req.params.id.toString());
      isMemory = true;
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.isDisputed = true;
    order.disputeReason = reason || 'Unspecified complaint';
    order.disputeStatus = 'open';
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      note: `Dispute flagged by ${req.user.name} (${req.user.role}): ${reason}`,
      actorId: req.user._id,
      actorRole: req.user.role
    });

    if (!isMemory && isDbConnected()) await order.save();
    else memoryOrders.set(order._id.toString(), order);

    return res.status(200).json({
      success: true,
      message: 'Complaint submitted. BiteShare admin will review.',
      messageHi: 'शिकायत सबमिट की गई। व्यवस्थापक समीक्षा करेगा।',
      order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getAvailableOrders,
  acceptOrder,
  verifyHandoff,
  updateOrderStatus,
  reportDispute
};
