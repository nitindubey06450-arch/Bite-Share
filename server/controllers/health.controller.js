// server/controllers/health.controller.js
const mongoose = require('mongoose');

/**
 * @desc Health check endpoint
 * @route GET /api/health
 */
const healthCheck = (req, res) => {
  const dbConnected = mongoose.connection && mongoose.connection.readyState === 1; // 1 = connected
  res.status(200).json({
    success: true,
    status: 'healthy',
    project: 'BiteShare Food Rescue & Relief API',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dbConnected,
    features: [
      'Multi-Role Auth (Customer, Community, Rider, Admin)',
      'Handoff OTP Verification (4-digit security)',
      'Live Socket.io Delivery Tracking & Map',
      'AI Search Engine',
      'Impact Dashboard & PDF Export',
      'Admin Moderation Panel',
      'Razorpay & COD Payments'
    ]
  });
};

module.exports = { healthCheck };
