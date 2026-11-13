// server/models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ['rider', 'community'],
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      default: ''
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

// One review per order per targetType (e.g. 1 review for rider, 1 for community per order)
reviewSchema.index({ order: 1, targetType: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
