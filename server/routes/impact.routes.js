// server/routes/impact.routes.js
const express = require('express');
const router = express.Router();
const {
  getLiveCounters,
  downloadMonthlyReportPdf,
  downloadDonorCertificatePdf
} = require('../controllers/impact.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /api/impact & /api/impact/counters
router.get('/', getLiveCounters);
router.get('/counters', getLiveCounters);

// Community monthly report PDF
router.get('/monthly-report', protect, requireRole('community', 'admin'), downloadMonthlyReportPdf);

// Donor certificate PDF
router.get('/donor-certificate', optionalAuth, downloadDonorCertificatePdf);

module.exports = router;
