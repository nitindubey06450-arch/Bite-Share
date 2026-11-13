// server/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  getDisputedOrders,
  resolveDispute,
  getActiveRiders
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');

// Strict Admin protection for all admin routes
router.use(protect, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.patch('/users/:userId/status', updateUserStatus);
router.get('/disputes', getDisputedOrders);
router.patch('/disputes/:orderId/resolve', resolveDispute);
router.get('/riders/live', getActiveRiders);

module.exports = router;
