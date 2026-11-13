// server/models/Listing.js
const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['veg', 'non-veg'],
      default: 'veg'
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
      type: String,
      default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    },
    pickupAddress: {
      type: String,
      required: [true, 'Pickup address is required']
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
    pickupWindow: {
      from: { type: String, default: '18:00' },
      to: { type: String, default: '21:00' },
      start: { type: String }, // alias support
      end: { type: String }   // alias support
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'picked_up', 'expired', 'removed'],
      default: 'available',
      index: true
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    handoffCodeHash: {
      type: String,
      default: null
    },
    handoffAttempts: {
      type: Number,
      default: 0
    },
    demoHandoffCode: {
      type: String,
      default: null
    },
    // Backward compatibility aliases
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    portions: {
      type: Number
    },
    dietary: {
      type: String
    },
    mealType: {
      type: String,
      default: 'cooked_meals'
    },
    weightKgPerPortion: {
      type: Number,
      default: 0.5 // 0.5 kg per meal default
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for radius/distance filtering
listingSchema.index({ location: '2dsphere' });

// Pre-save synchronization for aliases
listingSchema.pre('save', function (next) {
  if (this.postedBy && !this.provider) this.provider = this.postedBy;
  if (!this.postedBy && this.provider) this.postedBy = this.provider;
  if (this.quantity && !this.portions) this.portions = this.quantity;
  if (this.portions && !this.quantity) this.quantity = this.portions;
  if (this.category && !this.dietary) this.dietary = this.category;
  if (this.dietary && !this.category) this.category = this.dietary === 'non-veg' ? 'non-veg' : 'veg';
  if (this.image && !this.imageUrl) this.imageUrl = this.image;
  if (this.imageUrl && !this.image) this.image = this.imageUrl;
  this.isAvailable = this.status === 'available' && this.expiresAt > new Date();
  next();
});

listingSchema.methods.isWithinPickupWindow = function () {
  const now = new Date();
  if (now > this.expiresAt) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const startStr = this.pickupWindow?.from || this.pickupWindow?.start || '00:00';
  const endStr = this.pickupWindow?.to || this.pickupWindow?.end || '23:59';

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

module.exports = mongoose.model('Listing', listingSchema);
