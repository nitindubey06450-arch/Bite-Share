// server/utils/otp.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Rate limiting map for OTP requests: phone -> { count, firstRequestTime }
const otpRateLimitMap = new Map();

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash the OTP using bcrypt
 */
const hashOtp = async (code) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(code, salt);
};

/**
 * Compare code against codeHash
 */
const verifyOtpHash = async (code, codeHash) => {
  return await bcrypt.compare(code, codeHash);
};

/**
 * Rate limit OTP requests to 3 per phone per 10 minutes
 */
const checkOtpRateLimit = (phone) => {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 3;

  const record = otpRateLimitMap.get(phone);
  if (!record) {
    otpRateLimitMap.set(phone, { count: 1, firstRequestTime: now });
    return { allowed: true };
  }

  // Check if window expired
  if (now - record.firstRequestTime > windowMs) {
    otpRateLimitMap.set(phone, { count: 1, firstRequestTime: now });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    const remainingMins = Math.ceil((windowMs - (now - record.firstRequestTime)) / 60000);
    return {
      allowed: false,
      message: `Too many OTP requests. Maximum ${maxRequests} requests per 10 minutes. Please try again in ${remainingMins} minute(s).`
    };
  }

  record.count += 1;
  return { allowed: true };
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  checkOtpRateLimit
};
