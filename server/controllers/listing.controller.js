// server/controllers/listing.controller.js
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const { generateHandoffCode, hashHandoffCode, verifyHandoffCode } = require('../utils/handoff');
const { logger } = require('../utils/logger');

const memoryListings = new Map();
const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @desc    Create a new surplus meal listing (Community only)
 * @route   POST /api/listings
 */
const createListing = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      quantity,
      imageUrl,
      image,
      pickupAddress,
      location,
      pickupWindow,
      expiresAt,
      // Legacy aliases
      portions,
      dietary,
      latitude,
      longitude
    } = req.body;

    // Default pickup location: user's current location if not explicitly provided
    let coords = [77.391, 28.5355];
    if (location?.coordinates && location.coordinates.length === 2) {
      coords = [Number(location.coordinates[0]), Number(location.coordinates[1])];
    } else if (longitude && latitude) {
      coords = [Number(longitude), Number(latitude)];
    } else if (req.user?.location?.coordinates && req.user.location.coordinates.length === 2) {
      coords = req.user.location.coordinates;
    }

    const listingData = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category === 'non-veg' || dietary === 'non-veg' ? 'non-veg' : 'veg',
      quantity: Number(quantity || portions || 1),
      imageUrl: imageUrl || image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      image: imageUrl || image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      pickupAddress: pickupAddress || 'Community Kitchen Center',
      location: {
        type: 'Point',
        coordinates: coords
      },
      pickupWindow: {
        from: pickupWindow?.from || pickupWindow?.start || '18:00',
        to: pickupWindow?.to || pickupWindow?.end || '21:00'
      },
      expiresAt: new Date(expiresAt || Date.now() + 6 * 3600 * 1000),
      status: 'available',
      postedBy: req.user._id,
      provider: req.user._id,
      reservedBy: null,
      handoffCodeHash: null,
      handoffAttempts: 0,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let listing = null;
    if (isDbConnected()) {
      try {
        listing = await Listing.create(listingData);
      } catch (dbErr) {
        logger.warn(`Mongo Listing create failed: ${dbErr.message}`);
      }
    }

    if (!listing) {
      listing = listingData;
      memoryListings.set(listing._id.toString(), listing);
    }

    return res.status(201).json({
      success: true,
      message: 'Meal listing posted successfully!',
      messageHi: 'भोजन सूची सफलतापूर्वक पोस्ट की गई!',
      data: listing,
      listing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get listings with filters (category, distance via $near, status, auto-hiding expired and removed)
 * @route   GET /api/listings
 */
const getListings = async (req, res, next) => {
  try {
    const { category, status, lat, lng, radiusKm, search } = req.query;
    const now = new Date();

    const query = {
      expiresAt: { $gt: now }
    };

    // Filter by status (default hides removed and expired)
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['available', 'reserved'] };
    }

    // Filter by category
    if (category && ['veg', 'non-veg'].includes(category)) {
      query.category = category;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (req.query.my === 'true' && req.user) {
      delete query.expiresAt;
      query.postedBy = req.user._id;
      query.status = { $ne: 'removed' };
    }

    // Distance filter using 2dsphere $near
    if (lat && lng) {
      const radiusMeters = (Number(radiusKm) || 10) * 1000;
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)]
          },
          $maxDistance: radiusMeters
        }
      };
    }

    let listings = [];
    if (isDbConnected()) {
      try {
        listings = await Listing.find(query)
          .populate('postedBy', 'name phone ratings')
          .populate('reservedBy', 'name phone')
          .sort({ createdAt: -1 })
          .limit(50);
      } catch (dbErr) {
        logger.warn(`Mongo Listing find failed: ${dbErr.message}`);
      }
    }

    if (listings.length === 0) {
      listings = Array.from(memoryListings.values()).filter((item) => {
        if (item.status === 'removed') return false;
        if (req.query.my === 'true' && req.user) {
          const ownerId = (item.postedBy?._id || item.postedBy || item.provider)?.toString();
          return ownerId === req.user._id.toString();
        }
        if (new Date(item.expiresAt) <= now) return false;
        if (status && item.status !== status) return false;
        if (category && item.category !== category) return false;
        if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
    }

    return res.status(200).json({
      success: true,
      count: listings.length,
      data: listings,
      listings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single listing details
 * @route   GET /api/listings/:id
 */
const getListingById = async (req, res, next) => {
  try {
    let listing = null;
    if (isDbConnected()) {
      try {
        listing = await Listing.findById(req.params.id)
          .populate('postedBy', 'name phone ratings')
          .populate('reservedBy', 'name phone');
      } catch (e) {
        // Fall back
      }
    }

    if (!listing) {
      listing = memoryListings.get(req.params.id.toString());
    }

    if (!listing || listing.status === 'removed') {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
        messageHi: 'सूची नहीं मिली'
      });
    }

    return res.status(200).json({
      success: true,
      listing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Edit a listing (Owner only)
 * @route   PATCH /api/listings/:id
 */
const updateListing = async (req, res, next) => {
  try {
    let listing = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        listing = await Listing.findById(req.params.id);
      } catch (e) {
        // Fall back
      }
    }

    if (!listing) {
      listing = memoryListings.get(req.params.id.toString());
      isMemory = true;
    }

    if (!listing || listing.status === 'removed') {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
        messageHi: 'सूची नहीं मिली'
      });
    }

    // Ownership check
    const ownerId = (listing.postedBy?._id || listing.postedBy || listing.provider).toString();
    if (ownerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit your own listings',
        messageHi: 'प्रतिबंधित: आप केवल अपनी सूचियों को संपादित कर सकते हैं'
      });
    }

    const updatable = ['title', 'description', 'category', 'quantity', 'imageUrl', 'image', 'pickupAddress', 'pickupWindow', 'expiresAt', 'status'];
    for (const key of updatable) {
      if (req.body[key] !== undefined) {
        listing[key] = req.body[key];
      }
    }

    if (req.body.location?.coordinates) {
      listing.location = {
        type: 'Point',
        coordinates: [Number(req.body.location.coordinates[0]), Number(req.body.location.coordinates[1])]
      };
    }

    listing.updatedAt = new Date();

    if (!isMemory && isDbConnected()) {
      await listing.save();
    } else {
      memoryListings.set(listing._id.toString(), listing);
    }

    return res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      messageHi: 'सूची सफलतापूर्वक अपडेट की गई',
      listing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete listing (set status to 'removed') - Owner or admin only
 * @route   DELETE /api/listings/:id
 */
const deleteListing = async (req, res, next) => {
  try {
    let listing = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        listing = await Listing.findById(req.params.id);
      } catch (e) {
        // Fall back
      }
    }

    if (!listing) {
      listing = memoryListings.get(req.params.id.toString());
      isMemory = true;
    }

    if (!listing || listing.status === 'removed') {
      return res.status(404).json({
        success: false,
        error: { message: 'Listing not found or already removed' },
        message: 'Listing not found or already removed',
        messageHi: 'सूची नहीं मिली या पहले ही हटा दी गई है'
      });
    }

    // Block deletion if meal is currently reserved
    if (listing.status === 'reserved') {
      return res.status(409).json({
        success: false,
        error: { message: 'Cannot delete a reserved listing. Cancel the reservation first.' },
        message: 'Cannot delete a reserved listing. Cancel the reservation first.'
      });
    }

    const ownerId = (listing.postedBy?._id || listing.postedBy || listing.provider).toString();
    if (ownerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Only the owner or an admin can remove this listing' },
        message: 'Forbidden: Only the owner or an admin can remove this listing'
      });
    }

    listing.status = 'removed';
    listing.isAvailable = false;
    listing.updatedAt = new Date();

    if (!isMemory && isDbConnected()) {
      await listing.save();
    } else {
      memoryListings.set(listing._id.toString(), listing);
    }

    return res.status(200).json({
      success: true,
      data: { id: listing._id, status: 'removed' },
      message: 'Listing removed successfully',
      messageHi: 'सूची सफलतापूर्वक हटा दी गई'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Customer Reserves a Surplus Meal (Atomic update + 4-digit handoff OTP)
 * @route   POST /api/listings/:id/reserve
 */
const reserveListing = async (req, res, next) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can reserve meals',
        messageHi: 'केवल ग्राहक ही भोजन आरक्षित कर सकते हैं'
      });
    }

    const rawHandoffCode = generateHandoffCode();
    const codeHash = await hashHandoffCode(rawHandoffCode);

    let listing = null;

    if (isDbConnected()) {
      try {
        // Atomic update preventing double-reservation
        listing = await Listing.findOneAndUpdate(
          {
            _id: req.params.id,
            status: 'available',
            expiresAt: { $gt: new Date() }
          },
          {
            $set: {
              status: 'reserved',
              reservedBy: req.user._id,
              handoffCodeHash: codeHash,
              handoffAttempts: 0,
              demoHandoffCode: rawHandoffCode,
              isAvailable: false
            }
          },
          { new: true }
        ).populate('postedBy', 'name phone');
      } catch (e) {
        // Fall back
      }
    }

    if (!listing) {
      const item = memoryListings.get(req.params.id.toString());
      if (item && item.status === 'available' && new Date(item.expiresAt) > new Date()) {
        item.status = 'reserved';
        item.reservedBy = req.user._id;
        item.handoffCodeHash = codeHash;
        item.handoffAttempts = 0;
        item.demoHandoffCode = rawHandoffCode;
        item.isAvailable = false;
        memoryListings.set(item._id.toString(), item);
        listing = item;
      }
    }

    if (!listing) {
      return res.status(400).json({
        success: false,
        message: 'Listing is no longer available or has already been reserved',
        messageHi: 'सूची अब उपलब्ध नहीं है या पहले ही आरक्षित हो चुकी है'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Meal reserved successfully! Present the 4-digit handoff code upon pickup.',
      messageHi: 'भोजन सफलतापूर्वक आरक्षित किया गया! पिकअप के समय 4-अंकीय हैंडऑफ़ कोड प्रस्तुत करें।',
      handoffCode: rawHandoffCode,
      listing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a meal reservation
 * @route   POST /api/listings/:id/cancel-reserve
 */
const cancelReserve = async (req, res, next) => {
  try {
    let listing = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        listing = await Listing.findById(req.params.id);
      } catch (e) {}
    }

    if (!listing) {
      listing = memoryListings.get(req.params.id.toString());
      isMemory = true;
    }

    if (!listing || listing.status !== 'reserved') {
      return res.status(400).json({
        success: false,
        message: 'Listing is not currently reserved',
        messageHi: 'सूची वर्तमान में आरक्षित नहीं है'
      });
    }

    // Check authority: reserving customer, owner, or admin
    const reservingId = (listing.reservedBy?._id || listing.reservedBy)?.toString();
    const ownerId = (listing.postedBy?._id || listing.postedBy || listing.provider)?.toString();
    const userId = req.user._id.toString();

    if (reservingId !== userId && ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the reserving customer or listing owner can cancel the reservation',
        messageHi: 'केवल आरक्षित करने वाला ग्राहक या स्वामी ही आरक्षण रद्द कर सकता है'
      });
    }

    listing.status = 'available';
    listing.reservedBy = null;
    listing.handoffCodeHash = null;
    listing.handoffAttempts = 0;
    listing.demoHandoffCode = null;
    listing.isAvailable = true;

    if (!isMemory && isDbConnected()) {
      await listing.save();
    } else {
      memoryListings.set(listing._id.toString(), listing);
    }

    return res.status(200).json({
      success: true,
      message: 'Reservation cancelled. Meal is available again.',
      messageHi: 'आरक्षण रद्द कर दिया गया। भोजन फिर से उपलब्ध है।',
      listing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify 4-digit Handoff OTP (Community marks listing as picked_up)
 * @route   POST /api/listings/:id/handoff
 */
const verifyHandoff = async (req, res, next) => {
  try {
    const { code } = req.body;
    let listing = null;
    let isMemory = false;

    if (isDbConnected()) {
      try {
        listing = await Listing.findById(req.params.id);
      } catch (e) {}
    }

    if (!listing) {
      listing = memoryListings.get(req.params.id.toString());
      isMemory = true;
    }

    if (!listing || listing.status !== 'reserved') {
      return res.status(400).json({
        success: false,
        message: 'Listing must be in reserved status to verify pickup handoff',
        messageHi: 'पिकअप हैंडऑफ़ सत्यापित करने के लिए सूची आरक्षित स्थिति में होनी चाहिए'
      });
    }

    if ((listing.handoffAttempts || 0) >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Maximum attempts exceeded (3). Handoff locked.',
        messageHi: 'अधिकतम प्रयास पार हो गए (3)। हैंडऑफ़ लॉक हो गया।'
      });
    }

    const isMatch = await verifyHandoffCode(code, listing.handoffCodeHash);
    if (!isMatch) {
      listing.handoffAttempts = (listing.handoffAttempts || 0) + 1;
      if (!isMemory && isDbConnected()) await listing.save();
      else memoryListings.set(listing._id.toString(), listing);

      return res.status(400).json({
        success: false,
        message: `Wrong 4-digit handoff code! Attempts remaining: ${3 - listing.handoffAttempts}`,
        messageHi: `गलत कोड! शेष प्रयास: ${3 - listing.handoffAttempts}`
      });
    }

    // Match! Transition to picked_up
    listing.status = 'picked_up';
    listing.isAvailable = false;
    listing.updatedAt = new Date();

    if (!isMemory && isDbConnected()) {
      await listing.save();
    } else {
      memoryListings.set(listing._id.toString(), listing);
    }

    return res.status(200).json({
      success: true,
      message: 'Handoff verified! Meal successfully marked as picked up.',
      messageHi: 'हैंडऑफ़ सत्यापित! भोजन सफलतापूर्वक प्राप्त हुआ चिह्नित किया गया।',
      listing
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  reserveListing,
  cancelReserve,
  verifyHandoff
};
