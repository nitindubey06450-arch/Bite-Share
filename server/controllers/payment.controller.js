// server/controllers/payment.controller.js
const Order = require('../models/Order');
const {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature
} = require('../services/payment.service');
const { logger } = require('../utils/logger');

/**
 * @desc    Create Razorpay Order for delivery fee
 * @route   POST /api/payments/create-order
 */
const createOrderPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    const fee = order.deliveryFee || 40;
    const rzpOrder = await createRazorpayOrder(fee, order._id);

    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    return res.status(200).json({
      success: true,
      razorpayOrder: rzpOrder,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      amount: fee,
      currency: 'INR'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Razorpay payment signature from client
 * @route   POST /api/payments/verify
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, method } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    if (method === 'cod') {
      order.paymentMethod = 'cod';
      order.paymentStatus = 'cod';
      await order.save();
      return res.status(200).json({
        success: true,
        message: 'Order confirmed with Cash on Delivery (COD)!',
        messageHi: 'कैश ऑन डिलीवरी (सीओडी) के साथ ऑर्डर की पुष्टि की गई!',
        order
      });
    }

    // Never trust client payment status blindly - verify cryptographic signature
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic signature',
        messageHi: 'भुगतान सत्यापन विफल: अमान्य हस्ताक्षर'
      });
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpayPaymentId;
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      note: `Online payment verified via Razorpay ID: ${razorpayPaymentId}`,
      actorId: req.user._id,
      actorRole: req.user.role
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully!',
      messageHi: 'भुगतान सफलतापूर्वक सत्यापित हुआ!',
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Razorpay Server-to-Server Webhook
 * @route   POST /api/payments/webhook
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = JSON.stringify(req.body);

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Received invalid Razorpay webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    logger.info(`Razorpay Webhook Event Received: ${event}`);

    if (event === 'payment.captured') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const orderId = paymentEntity?.notes?.orderId || paymentEntity?.description;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          razorpayPaymentId: paymentEntity.id
        });
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error(`Webhook Processing Error: ${error.message}`);
    return res.status(500).send('Webhook error');
  }
};

/**
 * @desc    Get Rider Earnings & Payout Summary
 * @route   GET /api/payments/rider/earnings
 */
const getRiderEarnings = async (req, res, next) => {
  try {
    const riderId = req.user._id;

    const deliveredOrders = await Order.find({
      rider: riderId,
      status: 'delivered'
    }).sort({ createdAt: -1 });

    const totalDeliveries = deliveredOrders.length;
    const totalEarnings = deliveredOrders.reduce((sum, ord) => sum + (ord.riderEarning || 35), 0);

    const pendingPayouts = deliveredOrders
      .filter((o) => o.payoutStatus !== 'processed')
      .reduce((sum, ord) => sum + (ord.riderEarning || 35), 0);

    const processedPayouts = totalEarnings - pendingPayouts;

    return res.status(200).json({
      success: true,
      summary: {
        totalDeliveries,
        totalEarnings,
        pendingPayouts,
        processedPayouts,
        currency: 'INR'
      },
      recentDeliveries: deliveredOrders.slice(0, 15)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request / Simulate Payout for Rider
 * @route   POST /api/payments/rider/payout
 */
const requestRiderPayout = async (req, res, next) => {
  try {
    const riderId = req.user._id;

    // Mark pending orders as processed
    const result = await Order.updateMany(
      { rider: riderId, status: 'delivered', payoutStatus: 'pending' },
      { payoutStatus: 'processed' }
    );

    return res.status(200).json({
      success: true,
      message: `Payout processed successfully! ${result.modifiedCount} order(s) marked as paid.`,
      messageHi: `भुगतान सफलतापूर्वक संसाधित किया गया!`,
      payoutId: `PO_${Date.now()}`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrderPayment,
  verifyPayment,
  handleWebhook,
  getRiderEarnings,
  requestRiderPayout
};
