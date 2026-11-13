// server/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const {
  createOrderPayment,
  verifyPayment,
  handleWebhook,
  getRiderEarnings,
  requestRiderPayout
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Public Webhook receiver (must receive raw/parsed JSON)
router.post('/webhook', handleWebhook);

// Protected Customer / Order Payment endpoints
router.post('/create-order', protect, createOrderPayment);
router.post('/verify', protect, verifyPayment);

// Rider Earnings & Payouts (Rider only)
router.get('/rider/earnings', protect, requireRole('rider', 'admin'), getRiderEarnings);
router.post('/rider/payout', protect, requireRole('rider', 'admin'), requestRiderPayout);

module.exports = router;
