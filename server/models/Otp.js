// server/models/Otp.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    codeHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index to auto-expire documents
    },
    attempts: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Otp', otpSchema);
