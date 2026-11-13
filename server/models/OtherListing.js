// server/models/OtherListing.js
const mongoose = require('mongoose');

const otherListingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      required: [true, 'Type is required (e.g. clothes, books, household)'],
      trim: true,
      index: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 1,
      default: 1
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    },
    image: {
      type: String, // alias for backwards compatibility
      default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    },
    pickupAddress: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true,
      default: 'Community Distribution Hub'
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [77.391, 28.5355]
      }
    },
    status: {
      type: String,
      enum: ['available', 'removed'],
      default: 'available',
      index: true
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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

otherListingSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('OtherListing', otherListingSchema);
