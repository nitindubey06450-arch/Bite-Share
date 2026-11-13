// server/routes/otherListing.routes.js
const express = require('express');
const router = express.Router();
const {
  createOtherListing, getOtherListings, getOtherListingById,
  updateOtherListing, deleteOtherListing
} = require('../controllers/otherListing.controller');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validateOtherListing } = require('../validators/otherListing.validator');

router.get('/', protect, getOtherListings);
router.get('/:id', protect, getOtherListingById);
router.post('/', protect, requireRole('community', 'admin'), validateOtherListing, createOtherListing);
router.patch('/:id', protect, updateOtherListing);
router.delete('/:id', protect, deleteOtherListing);

module.exports = router;
