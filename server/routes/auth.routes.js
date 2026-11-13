// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { signup, login, requestOtp, verifyOtp, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const {
  validateSignup,
  validateLogin,
  validateOtpRequest,
  validateOtpVerify
} = require('../middleware/validators');

// Auth endpoints per specification
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/otp/request', validateOtpRequest, requestOtp);
router.post('/otp/send', validateOtpRequest, requestOtp); // Alias for frontend
router.post('/otp/verify', validateOtpVerify, verifyOtp);
router.post('/customer/register', validateSignup, signup); // Alias for frontend
router.post('/community/register', validateSignup, signup); // Alias for frontend
router.get('/me', protect, getMe);

module.exports = router;
