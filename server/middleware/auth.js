// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'biteshare_jwt_secret_key_2026_super_safe');

      if (mongoose.connection.readyState === 1) {
        try {
          const user = await User.findById(decoded.id).select('-passwordHash');
          if (!user) {
            return res.status(401).json({
              success: false,
              message: 'User account no longer exists',
              messageHi: 'उपयोगकर्ता खाता अब मौजूद नहीं है'
            });
          }

          if (user.isBlocked || user.status === 'blocked') {
            return res.status(403).json({
              success: false,
              message: 'Your account has been suspended by an administrator. Please contact support.',
              messageHi: 'आपका खाता व्यवस्थापक द्वारा निलंबित कर दिया गया है। कृपया सहायता से संपर्क करें।'
            });
          }

          req.user = user;
          return next();
        } catch (dbErr) {
          // If DB query fails, fall back to decoded token
        }
      }

      // Memory/Fallback authentication when DB is offline
      req.user = {
        _id: decoded.id,
        name: decoded.name || 'BiteShare User',
        phone: decoded.phone || '',
        role: decoded.role || 'customer',
        location: { type: 'Point', coordinates: [77.391, 28.5355] },
        status: 'active',
        isBlocked: false
      };
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
        messageHi: 'अमान्य या समाप्त प्रमाणीकरण टोकन'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
      messageHi: 'पहुंच अस्वीकृत। कोई प्राधिकरण टोकन प्रदान नहीं किया गया।'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'biteshare_jwt_secret_key_2026_super_safe');
      if (mongoose.connection.readyState === 1) {
        try {
          req.user = await User.findById(decoded.id).select('-passwordHash');
          return next();
        } catch {
          // DB error fallback
        }
      }
      req.user = {
        _id: decoded.id,
        name: decoded.name || 'BiteShare User',
        phone: decoded.phone || '',
        role: decoded.role || 'customer'
      };
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

module.exports = { protect, optionalAuth };
