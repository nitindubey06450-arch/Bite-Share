// server/controllers/impact.controller.js
const { v4: uuidv4 } = require('uuid');
const { calculateImpact } = require('../services/impact.service');
const { generateMonthlyReportPdf, generateDonorCertificatePdf } = require('../services/pdf.service');

/**
 * @desc    Get live platform impact counters
 * @route   GET /api/impact/counters
 */
const getLiveCounters = async (req, res, next) => {
  try {
    const impact = await calculateImpact();
    return res.status(200).json({
      success: true,
      impact
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export Community Monthly PDF Report
 * @route   GET /api/impact/monthly-report
 */
const downloadMonthlyReportPdf = async (req, res, next) => {
  try {
    const communityId = req.user.role === 'community' ? req.user._id : req.query.communityId;
    const communityName = req.user.name || 'Verified Community Partner';

    const date = new Date();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const stats = await calculateImpact(communityId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=BiteShare_Report_${month}_${year}.pdf`);

    generateMonthlyReportPdf(res, {
      communityName,
      month,
      year,
      stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export Donor Honor Certificate PDF
 * @route   GET /api/impact/donor-certificate
 */
const downloadDonorCertificatePdf = async (req, res, next) => {
  try {
    const donorName = req.query.name || req.user?.name || 'Valued Food Donor';
    const mealCount = req.query.meals || '25';
    const verificationId = `BS-CERT-${uuidv4().slice(0, 8).toUpperCase()}`;
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=BiteShare_Certificate_${verificationId}.pdf`);

    generateDonorCertificatePdf(res, {
      donorName,
      mealCount,
      date,
      verificationId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLiveCounters,
  downloadMonthlyReportPdf,
  downloadDonorCertificatePdf
};
