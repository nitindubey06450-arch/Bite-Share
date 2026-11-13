// server/controllers/review.controller.js
const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * @desc    Submit review for rider or community after delivery
 * @route   POST /api/reviews
 */
const submitReview = async (req, res, next) => {
  try {
    const { orderId, rating, comment, targetType } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        messageHi: 'ऑर्डर नहीं मिला'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted after order is delivered',
        messageHi: 'समीक्षा केवल ऑर्डर डिलीवर होने के बाद ही सबमिट की जा सकती है'
      });
    }

    // Only customer of the order can review
    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the ordering customer can leave a review',
        messageHi: 'केवल ऑर्डर करने वाला ग्राहक ही समीक्षा दे सकता है'
      });
    }

    const targetUserId = targetType === 'rider' ? order.rider : order.provider;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: `No ${targetType} assigned to this order to review`,
        messageHi: `इस ऑर्डर पर समीक्षा के लिए कोई ${targetType} असाइन नहीं है`
      });
    }

    // Check one review per order per targetType
    const existing = await Review.findOne({ order: orderId, targetType });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `You have already reviewed the ${targetType} for this order`,
        messageHi: `आप पहले ही इस ऑर्डर के लिए ${targetType} की समीक्षा कर चुके हैं`
      });
    }

    const review = await Review.create({
      order: orderId,
      reviewer: req.user._id,
      target: targetUserId,
      targetType,
      rating: Number(rating),
      comment: comment || ''
    });

    // Recalculate target user average rating
    const allReviews = await Review.find({ target: targetUserId });
    const count = allReviews.length;
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / count;

    await User.findByIdAndUpdate(targetUserId, {
      ratings: {
        average: Number(avg.toFixed(1)),
        count
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      messageHi: 'समीक्षा सफलतापूर्वक सबमिट की गई!',
      review,
      newAverage: Number(avg.toFixed(1))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reviews for a user/community/rider
 * @route   GET /api/reviews/user/:userId
 */
const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ target: req.params.userId })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitReview,
  getUserReviews
};
