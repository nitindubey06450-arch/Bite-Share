// server/routes/location.routes.js
const express = require('express');
const router = express.Router();
const { updateLocation } = require('../controllers/location.controller');
const { protect } = require('../middleware/auth');
const { validateLocation } = require('../middleware/validators');

// GET /api/location/config (returns public map config like googleMapsApiKey)
router.get('/config', (req, res) => {
  res.json({
    success: true,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

// PATCH /api/location { lat, lng } (auth)
router.patch('/', protect, validateLocation, updateLocation);

module.exports = router;
