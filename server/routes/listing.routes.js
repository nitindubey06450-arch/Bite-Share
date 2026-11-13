// server/routes/listing.routes.js
const express = require('express');
const router = express.Router();
const {
  createListing, getListings, getListingById,
  updateListing, deleteListing, reserveListing,
  cancelReserve, verifyHandoff
} = require('../controllers/listing.controller');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validateMealListing } = require('../validators/listing.validator');

router.get('/', protect, getListings);
router.get('/:id', protect, getListingById);
router.post('/', protect, requireRole('community', 'admin'), validateMealListing, createListing);
router.patch('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);
router.post('/:id/reserve', protect, reserveListing);
router.post('/:id/cancel-reserve', protect, cancelReserve);
router.post('/:id/handoff', protect, verifyHandoff);

module.exports = router;
