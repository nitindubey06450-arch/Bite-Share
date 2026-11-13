// server/routes/order.routes.js
const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getAvailableOrders,
  acceptOrder,
  verifyHandoff,
  updateOrderStatus,
  reportDispute
} = require('../controllers/order.controller');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validateOrderCreate, validateHandoff } = require('../middleware/validators');

router.use(protect);

// Order creation (Customer only)
router.post('/', requireRole('customer', 'admin'), validateOrderCreate, createOrder);

// Rider available orders (Riders within 5km)
router.get('/available', requireRole('rider', 'admin'), getAvailableOrders);

// Order inspection (Customer, Provider, Rider, Admin)
router.get('/:id', getOrderById);

// Rider accepts order
router.post('/:id/accept', requireRole('rider', 'admin'), acceptOrder);

// 4-Digit Handoff OTP verification
router.post('/:id/handoff', requireRole('rider', 'admin'), validateHandoff, verifyHandoff);

// Status transition guard
router.patch('/:id/status', requireRole('rider', 'community', 'admin'), updateOrderStatus);

// Dispute / Complaint
router.post('/:id/dispute', reportDispute);

module.exports = router;
