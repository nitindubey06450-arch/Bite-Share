// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['community', 'customer', 'rider', 'admin'],
      required: [true, 'Role must be community, customer, rider, or admin']
    },
    passwordHash: {
      type: String,
      default: null
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.391, 28.5355]
      }
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en'
    },
    favourites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    ratings: {
      average: { type: Number, default: 5.0 },
      count: { type: Number, default: 0 }
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'pending'],
      default: 'active'
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

// 2dsphere index for location queries
userSchema.index({ location: '2dsphere' });

// Password comparison helper
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Safe JSON serialization (strip passwordHash)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
