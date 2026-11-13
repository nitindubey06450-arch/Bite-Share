// server/models/SearchHistory.js
const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    userEmail: {
      type: String,
      default: 'Guest User'
    },
    role: {
      type: String,
      default: 'guest'
    },
    query: {
      type: String,
      required: true,
      trim: true
    },
    aiResponse: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: 'general'
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
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

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
