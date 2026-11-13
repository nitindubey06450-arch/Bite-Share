// server/controllers/location.controller.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * @desc    Update user live location (PATCH /api/location)
 *          For riders, also updates their active order & emits location
 */
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const latitude = Number(lat);
    const longitude = Number(lng);

    const locationObj = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    let activeOrder = null;

    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findById(req.user._id);
        if (user) {
          user.location = locationObj;
          await user.save();
        }

        // If user is a rider, update live location on any active order
        if (req.user.role === 'rider') {
          activeOrder = await Order.findOne({
            rider: req.user._id,
            status: { $in: ['accepted', 'picked_up', 'on_the_way'] }
          });

          if (activeOrder) {
            activeOrder.riderLocation = {
              type: 'Point',
              coordinates: [longitude, latitude],
              updatedAt: new Date()
            };
            await activeOrder.save();

            const io = req.app.get('io');
            if (io) {
              io.to(`order:${activeOrder._id}`).emit('order:location', {
                orderId: activeOrder._id,
                lat: latitude,
                lng: longitude,
                updatedAt: new Date()
              });
            }
          }
        }
      } catch (dbErr) {
        // DB update error handled gracefully
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      messageHi: 'स्थान सफलतापूर्वक अपडेट किया गया',
      location: locationObj,
      activeOrderId: activeOrder ? activeOrder._id : null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateLocation
};
