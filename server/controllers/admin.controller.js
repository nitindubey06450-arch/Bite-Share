// server/controllers/admin.controller.js
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * @desc    Get Admin Overview Statistics
 * @route   GET /api/admin/stats
 */
const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const communityCount = await User.countDocuments({ role: 'community' });
    const customerCount = await User.countDocuments({ role: 'customer' });
    const riderCount = await User.countDocuments({ role: 'rider' });
    const blockedCount = await User.countDocuments({ isBlocked: true });

    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({
      status: { $in: ['placed', 'accepted', 'picked_up', 'on_the_way'] }
    });
    const disputedOrdersCount = await Order.countDocuments({ isDisputed: true, disputeStatus: 'open' });

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        roles: {
          community: communityCount,
          customer: customerCount,
          rider: riderCount
        },
        blockedUsers: blockedCount,
        totalOrders,
        activeOrders,
        openDisputes: disputedOrdersCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List all users with pagination and role filtering
 * @route   GET /api/admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      total,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve, Block, or Unblock a User/Community/Rider
 * @route   PATCH /api/admin/users/:userId/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status, isBlocked } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        messageHi: 'उपयोगकर्ता नहीं मिला'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot block administrative accounts',
        messageHi: 'व्यवस्थापक खातों को ब्लॉक नहीं किया जा सकता'
      });
    }

    if (isBlocked !== undefined) user.isBlocked = Boolean(isBlocked);
    if (status) user.status = status;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.name} status updated to ${user.status} (Blocked: ${user.isBlocked})`,
      messageHi: `उपयोगकर्ता स्थिति सफलतापूर्वक अपडेट की गई`,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List reported / disputed orders with handoff audit logs
 * @route   GET /api/admin/disputes
 */
const getDisputedOrders = async (req, res, next) => {
  try {
    const disputes = await Order.find({
      $or: [{ isDisputed: true }, { disputeStatus: { $in: ['open', 'resolved', 'refunded'] } }]
    })
      .populate('customer', 'name phone')
      .populate('provider', 'name phone')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: disputes.length,
      disputes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve or Refund a Disputed Order
 * @route   PATCH /api/admin/disputes/:orderId/resolve
 */
const resolveDispute = async (req, res, next) => {
  try {
    const { action, resolutionNote } = req.body; // action: 'resolve' or 'refund'
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    if (action === 'refund') {
      order.disputeStatus = 'refunded';
      order.paymentStatus = 'refunded';
      order.status = 'cancelled';
    } else {
      order.disputeStatus = 'resolved';
    }

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      note: `Admin dispute ${action}: ${resolutionNote || 'Resolved by admin'}`,
      actorId: req.user._id,
      actorRole: 'admin'
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Dispute marked as ${order.disputeStatus}!`,
      messageHi: `विवाद सफलतापूर्वक सुलझाया गया!`,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get live fleet of active riders for admin map
 * @route   GET /api/admin/riders/live
 */
const getActiveRiders = async (req, res, next) => {
  try {
    const activeOrders = await Order.find({
      status: { $in: ['accepted', 'picked_up', 'on_the_way'] },
      rider: { $ne: null }
    })
      .populate('rider', 'name phone ratings emergencyContact location')
      .populate('customer', 'name phone')
      .populate('provider', 'name phone');

    const ridersFleet = activeOrders.map((ord) => ({
      orderId: ord._id,
      orderStatus: ord.status,
      rider: ord.rider,
      liveCoordinates: ord.riderLocation?.coordinates || ord.rider?.location?.coordinates || [77.391, 28.5355],
      pickupAddress: ord.pickup.address,
      dropAddress: ord.drop.address
    }));

    return res.status(200).json({
      success: true,
      count: ridersFleet.length,
      fleet: ridersFleet
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  getDisputedOrders,
  resolveDispute,
  getActiveRiders
};
