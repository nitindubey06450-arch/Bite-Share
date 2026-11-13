// server/models/LoginLog.js
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['community', 'customer', 'rider'],
      required: true
    },
    method: {
      type: String,
      enum: ['password', 'otp'],
      required: true
    },
    ip: {
      type: String,
      default: '127.0.0.1'
    },
    userAgent: {
      type: String,
      default: 'Unknown Browser'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LoginLog', loginLogSchema);
