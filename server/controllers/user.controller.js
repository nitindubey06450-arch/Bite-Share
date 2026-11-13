// server/controllers/user.controller.js
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * @desc    Toggle favourite community
 * @route   POST /api/user/favourites/:communityId
 */
const toggleFavourite = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const user = await User.findById(req.user._id);

    const index = user.favourites.indexOf(communityId);
    let isFavourited = false;

    if (index > -1) {
      user.favourites.splice(index, 1);
      isFavourited = false;
    } else {
      user.favourites.push(communityId);
      isFavourited = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      isFavourited,
      message: isFavourited ? 'Added to favourites!' : 'Removed from favourites',
      messageHi: isFavourited ? 'पसंदीदा में जोड़ा गया!' : 'पसंदीदा से हटाया गया',
      favourites: user.favourites
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user favourites
 * @route   GET /api/user/favourites
 */
const getFavourites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('favourites', 'name phone ratings location');
    return res.status(200).json({
      success: true,
      favourites: user.favourites || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update language preference ('en' or 'hi')
 * @route   PATCH /api/user/language
 */
const updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    if (!['en', 'hi'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Language must be "en" or "hi"',
        messageHi: 'भाषा "en" या "hi" होनी चाहिए'
      });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { language }, { new: true });
    return res.status(200).json({
      success: true,
      language: user.language,
      message: 'Language preference saved!',
      messageHi: 'भाषा प्राथमिकता सहेजी गई!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Repeat past order ("Order again")
 * @route   POST /api/user/orders/:orderId/repeat
 */
const repeatOrder = async (req, res, next) => {
  try {
    const pastOrder = await Order.findById(req.params.orderId);
    if (!pastOrder) {
      return res.status(404).json({
        success: false,
        message: 'Original order not found',
        messageHi: 'मूल ऑर्डर नहीं मिला'
      });
    }

    // Clone order structure for re-submission
    const newOrderData = {
      customer: req.user._id,
      provider: pastOrder.provider,
      listing: pastOrder.listing,
      items: pastOrder.items,
      pickup: pastOrder.pickup,
      drop: pastOrder.drop,
      status: 'placed',
      deliveryFee: pastOrder.deliveryFee || 40,
      riderEarning: pastOrder.riderEarning || 35,
      paymentMethod: 'online',
      paymentStatus: 'pending',
      statusHistory: [
        {
          status: 'placed',
          timestamp: new Date(),
          note: 'Re-ordered via "Order Again"',
          actorId: req.user._id,
          actorRole: req.user.role
        }
      ]
    };

    const newOrder = await Order.create(newOrderData);

    return res.status(201).json({
      success: true,
      message: 'Past order successfully duplicated and placed!',
      messageHi: 'पिछला ऑर्डर सफलतापूर्वक दोहराया गया!',
      order: newOrder
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleFavourite,
  getFavourites,
  updateLanguage,
  repeatOrder
};
