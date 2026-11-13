// server/controllers/otherListing.controller.js
const mongoose = require('mongoose');
const OtherListing = require('../models/OtherListing');
const { logger } = require('../utils/logger');

const memoryOtherListings = new Map();
const isDbConnected = () => mongoose.connection.readyState === 1;

const createOtherListing = async (req, res, next) => {
  try {
    const { title, description, type, quantity, imageUrl, pickupAddress, location } = req.body;

    let coords = [77.391, 28.5355];
    if (location?.coordinates && location.coordinates.length === 2) {
      coords = [Number(location.coordinates[0]), Number(location.coordinates[1])];
    } else if (req.user?.location?.coordinates && req.user.location.coordinates.length === 2) {
      coords = req.user.location.coordinates;
    }

    const listingData = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      description: description ? description.trim() : '',
      type: type.trim(),
      quantity: Number(quantity || 1),
      imageUrl: imageUrl || '',
      pickupAddress: pickupAddress || '',
      location: { type: 'Point', coordinates: coords },
      status: 'available',
      postedBy: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let listing = null;
    if (isDbConnected()) {
      try {
        listing = await OtherListing.create(listingData);
      } catch (dbErr) {
        logger.warn(`Mongo OtherListing create failed: ${dbErr.message}`);
      }
    }

    if (!listing) {
      listing = listingData;
      memoryOtherListings.set(listing._id.toString(), listing);
    }

    return res.status(201).json({ success: true, data: listing, listing, message: 'Other listing created successfully' });
  } catch (error) {
    next(error);
  }
};

const getOtherListings = async (req, res, next) => {
  try {
    const { type, lat, lng, radiusKm, search } = req.query;

    const query = { status: 'available' };

    if (type) {
      query.type = { $regex: type, $options: 'i' };
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (req.query.my === 'true' && req.user) {
      query.postedBy = req.user._id;
    }
    if (lat && lng) {
      const radiusMeters = (Number(radiusKm) || 10) * 1000;
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: radiusMeters
        }
      };
    }

    let listings = [];
    if (isDbConnected()) {
      try {
        listings = await OtherListing.find(query)
          .populate('postedBy', 'name phone')
          .sort({ createdAt: -1 })
          .limit(50);
      } catch (dbErr) {
        logger.warn(`Mongo OtherListing find failed: ${dbErr.message}`);
      }
    }

    if (listings.length === 0) {
      listings = Array.from(memoryOtherListings.values()).filter((item) => {
        if (item.status === 'removed') return false;
        if (req.query.my === 'true' && req.user) {
          const ownerId = (item.postedBy?._id || item.postedBy)?.toString();
          if (ownerId !== req.user._id.toString()) return false;
        }
        if (type && !item.type.toLowerCase().includes(type.toLowerCase())) return false;
        if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
    }

    return res.status(200).json({ success: true, data: listings, listings, count: listings.length });
  } catch (error) {
    next(error);
  }
};

const getOtherListingById = async (req, res, next) => {
  try {
    let listing = null;
    if (isDbConnected()) {
      try {
        listing = await OtherListing.findById(req.params.id).populate('postedBy', 'name phone');
      } catch (e) { /* fall back */ }
    }
    if (!listing) {
      listing = memoryOtherListings.get(req.params.id.toString());
    }
    if (!listing || listing.status === 'removed') {
      return res.status(404).json({ success: false, error: { message: 'Listing not found' } });
    }
    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

const updateOtherListing = async (req, res, next) => {
  try {
    let listing = null;
    let isMemory = false;

    if (isDbConnected()) {
      try { listing = await OtherListing.findById(req.params.id); } catch (e) { /* fall back */ }
    }
    if (!listing) {
      listing = memoryOtherListings.get(req.params.id.toString());
      isMemory = true;
    }
    if (!listing || listing.status === 'removed') {
      return res.status(404).json({ success: false, error: { message: 'Listing not found' } });
    }

    const ownerId = (listing.postedBy?._id || listing.postedBy).toString();
    if (ownerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Only the owner can edit' } });
    }

    const updatable = ['title', 'description', 'type', 'quantity', 'imageUrl', 'pickupAddress', 'status'];
    for (const key of updatable) {
      if (req.body[key] !== undefined) listing[key] = req.body[key];
    }
    if (req.body.location?.coordinates) {
      listing.location = { type: 'Point', coordinates: [Number(req.body.location.coordinates[0]), Number(req.body.location.coordinates[1])] };
    }
    listing.updatedAt = new Date();

    if (!isMemory && isDbConnected()) {
      await listing.save();
    } else {
      memoryOtherListings.set(listing._id.toString(), listing);
    }

    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

const deleteOtherListing = async (req, res, next) => {
  try {
    let listing = null;
    let isMemory = false;

    if (isDbConnected()) {
      try { listing = await OtherListing.findById(req.params.id); } catch (e) { /* fall back */ }
    }
    if (!listing) {
      listing = memoryOtherListings.get(req.params.id.toString());
      isMemory = true;
    }
    if (!listing || listing.status === 'removed') {
      return res.status(404).json({ success: false, error: { message: 'Listing not found or already removed' } });
    }

    const ownerId = (listing.postedBy?._id || listing.postedBy).toString();
    if (ownerId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: Only the owner or an admin can remove this listing' } });
    }

    listing.status = 'removed';
    listing.updatedAt = new Date();

    if (!isMemory && isDbConnected()) {
      await listing.save();
    } else {
      memoryOtherListings.set(listing._id.toString(), listing);
    }

    return res.status(200).json({ success: true, data: { id: listing._id, status: 'removed', message: 'Listing removed successfully' }, message: 'Listing removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOtherListing, getOtherListings, getOtherListingById, updateOtherListing, deleteOtherListing };
