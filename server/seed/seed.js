// server/seed/seed.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const Review = require('../models/Review');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    console.log('\n\x1b[36m🌱 Starting BiteShare Platform Seed...\x1b[0m');
    await connectDB();

    // Clear existing collections
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});
    console.log('✔ Cleared existing collections');

    const salt = await bcrypt.genSalt(10);

    // 1. Create Users for all 4 roles
    const adminPasswordHash = await bcrypt.hash('AdminPassword123', salt);
    const communityPasswordHash = await bcrypt.hash('CommunityPass123', salt);
    const customerPasswordHash = await bcrypt.hash('CustomerPass123', salt);
    const riderPasswordHash = await bcrypt.hash('RiderPass123', salt);

    const admin = await User.create({
      name: 'BiteShare Super Admin',
      phone: '9999900000',
      email: 'admin@biteshare.org',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isVerified: true
    });

    const community = await User.create({
      name: 'Feeding Hope Community NGO',
      phone: '9810011111',
      email: 'relief@feedinghope.org',
      passwordHash: communityPasswordHash,
      role: 'community',
      location: {
        type: 'Point',
        coordinates: [77.391, 28.5355]
      },
      ratings: { average: 4.9, count: 48 },
      isVerified: true
    });

    const customer = await User.create({
      name: 'Aarav Sharma',
      phone: '9876543210',
      email: 'aarav@example.com',
      passwordHash: customerPasswordHash,
      role: 'customer',
      location: {
        type: 'Point',
        coordinates: [77.385, 28.54]
      },
      isVerified: true
    });

    const rider = await User.create({
      name: 'Vikram Singh (Rider Partner)',
      phone: '9820033333',
      email: 'vikram@rider.biteshare.org',
      passwordHash: riderPasswordHash,
      role: 'rider',
      location: {
        type: 'Point',
        coordinates: [77.388, 28.538]
      },
      emergencyContact: {
        name: 'Anita Singh',
        phone: '9820044444'
      },
      ratings: { average: 4.8, count: 65 },
      isVerified: true
    });

    console.log('✔ Seeded 4 Multi-Role Users: Admin, Community, Customer, Rider');

    // 2. Create Active Listings
    const listing1 = await Listing.create({
      provider: community._id,
      title: 'Fresh Veg Biryani & Raita Portions',
      description: 'Surplus wedding catering containers packed hygienically in meal trays.',
      portions: 25,
      dietary: 'veg',
      mealType: 'cooked_meals',
      pickupWindow: { start: '12:00', end: '23:00' },
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000),
      pickupAddress: 'Community Center, Sector 62, Noida',
      location: {
        type: 'Point',
        coordinates: [77.391, 28.5355]
      },
      weightKgPerPortion: 0.5,
      isAvailable: true
    });

    const listing2 = await Listing.create({
      provider: community._id,
      title: 'Artisan Whole Wheat Sourdough Loaves',
      description: 'Fresh bakery surplus loaves baked this morning. Sealed in craft paper bags.',
      portions: 18,
      dietary: 'vegan',
      mealType: 'bakery',
      pickupWindow: { start: '10:00', end: '22:00' },
      expiresAt: new Date(Date.now() + 12 * 3600 * 1000),
      pickupAddress: 'Sunshine Food Bank, Green Park',
      location: {
        type: 'Point',
        coordinates: [77.395, 28.538]
      },
      weightKgPerPortion: 0.4,
      isAvailable: true
    });

    console.log('✔ Seeded 2 Surplus Food Listings');

    // 3. Create Sample Completed Order with Handoff logs & Review
    const completedOrder = await Order.create({
      customer: customer._id,
      provider: community._id,
      rider: rider._id,
      listing: listing1._id,
      items: [{ title: 'Fresh Veg Biryani Trays', portions: 4, dietary: 'veg' }],
      pickup: {
        address: 'Community Center, Sector 62, Noida',
        location: { type: 'Point', coordinates: [77.391, 28.5355] },
        contactPhone: '9810011111'
      },
      drop: {
        address: 'House #14, Block B, Green Glen Layout, Noida',
        location: { type: 'Point', coordinates: [77.385, 28.54] },
        contactPhone: '9876543210'
      },
      status: 'delivered',
      pickupHandoffVerified: true,
      deliveryHandoffVerified: true,
      demoPickupCode: '4821',
      demoDeliveryCode: '8392',
      deliveryFee: 40,
      riderEarning: 35,
      payoutStatus: 'pending',
      paymentMethod: 'online',
      paymentStatus: 'paid',
      statusHistory: [
        { status: 'placed', timestamp: new Date(Date.now() - 3600000), note: 'Order placed by customer' },
        { status: 'accepted', timestamp: new Date(Date.now() - 3000000), note: 'Accepted by rider Vikram Singh' },
        { status: 'picked_up', timestamp: new Date(Date.now() - 2000000), note: 'Verified pickup with code 4821' },
        { status: 'on_the_way', timestamp: new Date(Date.now() - 1500000), note: 'Rider en route to customer' },
        { status: 'delivered', timestamp: new Date(Date.now() - 600000), note: 'Verified delivery with code 8392' }
      ]
    });

    // 4. Create Sample Review
    await Review.create({
      order: completedOrder._id,
      reviewer: customer._id,
      target: rider._id,
      targetType: 'rider',
      rating: 5,
      comment: 'Super fast delivery! Rider was very polite and the food was hot.'
    });

    console.log('✔ Seeded 1 Completed Order with Handoff logs & 5-Star Review');

    console.log('\n\x1b[32m══════════════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[32m✔ SEED COMPLETED SUCCESSFULLY!\x1b[0m');
    console.log('\x1b[36mCredentials:\x1b[0m');
    console.log('  👑 Admin:     Phone: 9999900000  | Pass: AdminPassword123');
    console.log('  🤝 Community: Phone: 9810011111  | Pass: CommunityPass123');
    console.log('  👤 Customer:  Phone: 9876543210  | Pass: CustomerPass123');
    console.log('  🛵 Rider:     Phone: 9820033333  | Pass: RiderPass123');
    console.log('\x1b[32m══════════════════════════════════════════════════════════════════════\x1b[0m\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  }
};

seedData();
