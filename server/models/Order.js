// server/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null
    },
    items: [
      {
        title: { type: String, required: true },
        portions: { type: Number, required: true, default: 1 },
        dietary: { type: String, default: 'veg' }
      }
    ],
    pickup: {
      address: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [lng, lat]
      },
      contactPhone: { type: String, default: '' },
      pickupWindow: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '21:00' }
      }
    },
    drop: {
      address: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [lng, lat]
      },
      contactPhone: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['placed', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
      default: 'placed',
      index: true
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actorRole: { type: String, default: 'system' }
      }
    ],

    // Handoff OTPs (4-digit codes)
    pickupHandoffCodeHash: { type: String, default: null },
    pickupHandoffAttempts: { type: Number, default: 0 },
    pickupHandoffVerified: { type: Boolean, default: false },

    deliveryHandoffCodeHash: { type: String, default: null },
    deliveryHandoffAttempts: { type: Number, default: 0 },
    deliveryHandoffVerified: { type: Boolean, default: false },

    // Plain codes in DEMO_MODE for easy testing and display in UI
    demoPickupCode: { type: String, default: null },
    demoDeliveryCode: { type: String, default: null },

    // Live Rider Coordinates
    riderLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      updatedAt: { type: Date }
    },

    // Payment details
    paymentMethod: {
      type: String,
      enum: ['online', 'cod'],
      default: 'online'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cod', 'refunded'],
      default: 'pending'
    },
    amount: {
      type: Number,
      default: 0 // Free community food (only platform/delivery fee)
    },
    deliveryFee: {
      type: Number,
      default: 40
    },
    riderEarning: {
      type: Number,
      default: 35
    },
    payoutStatus: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending'
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    // Dispute / Complaints
    isDisputed: { type: Boolean, default: false },
    disputeReason: { type: String, default: null },
    disputeStatus: { type: String, enum: ['none', 'open', 'resolved', 'refunded'], default: 'none' },

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

// GeoSpatial index for pickup and drop
orderSchema.index({ 'pickup.location': '2dsphere' });
orderSchema.index({ 'drop.location': '2dsphere' });

/**
 * Validate status transitions per state machine:
 * placed -> accepted -> picked_up -> on_the_way -> delivered
 * or cancelled from placed / accepted
 */
orderSchema.methods.isValidTransition = function (newStatus) {
  const allowed = {
    placed: ['accepted', 'cancelled'],
    accepted: ['picked_up', 'cancelled'],
    picked_up: ['on_the_way', 'cancelled'],
    on_the_way: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
  };
  return allowed[this.status] ? allowed[this.status].includes(newStatus) : false;
};

module.exports = mongoose.model('Order', orderSchema);
