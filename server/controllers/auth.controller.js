// server/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Otp = require('../models/Otp');
const LoginLog = require('../models/LoginLog');
const { generateOtp, hashOtp, verifyOtpHash, checkOtpRateLimit } = require('../utils/otp');
const { logger } = require('../utils/logger');

// In-memory fallback caches when MongoDB Atlas is connecting or IP is unwhitelisted
const memoryOtpCache = new Map();
const memoryUserCache = new Map();

const isDbConnected = () => mongoose.connection.readyState === 1;

// Sign JWT helper
const createJwtToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role
    },
    process.env.JWT_SECRET || 'biteshare_jwt_secret_key_2026_super_safe',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// Record LoginLog
const logLogin = async (userId, role, method, req) => {
  if (!isDbConnected()) return;
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    await LoginLog.create({
      user: userId,
      role,
      method,
      ip,
      userAgent
    });
  } catch (err) {
    logger.warn(`Failed to create LoginLog: ${err.message}`);
  }
};

/**
 * @desc    Signup for any role (community, customer, rider)
 * @route   POST /api/auth/signup
 */
const signup = async (req, res, next) => {
  try {
    const { name, phone, email, password, role } = req.body;
    const cleanPhone = phone.trim();

    if (isDbConnected()) {
      try {
        const existingUser = await User.findOne({ phone: cleanPhone });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Phone number already registered. Please login.',
            messageHi: 'फ़ोन नंबर पहले से पंजीकृत है। कृपया लॉगिन करें।'
          });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await User.create({
          name: name.trim(),
          phone: cleanPhone,
          email: email ? email.trim().toLowerCase() : '',
          passwordHash,
          role: role || 'customer',
          isVerified: true
        });

        const token = createJwtToken(user);
        await logLogin(user._id, user.role, 'password', req);
        logger.info(`New user registered: ${user.name} (${user.role})`);

        return res.status(201).json({
          success: true,
          message: 'Account created successfully!',
          messageHi: 'खाता सफलतापूर्वक बनाया गया!',
          token,
          user
        });
      } catch (dbErr) {
        logger.warn(`Mongo signup failed (${dbErr.message}), falling back to memory store.`);
      }
    }

    // Memory Fallback
    if (memoryUserCache.has(cleanPhone)) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered. Please login.',
        messageHi: 'फ़ोन नंबर पहले से पंजीकृत है। कृपया लॉगिन करें।'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const fakeId = new mongoose.Types.ObjectId();

    const memUser = {
      _id: fakeId,
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : '',
      passwordHash,
      role: role || 'customer',
      isVerified: true,
      location: { type: 'Point', coordinates: [77.391, 28.5355] },
      comparePassword: async (pwd) => bcrypt.compare(pwd, passwordHash)
    };

    memoryUserCache.set(cleanPhone, memUser);
    const token = createJwtToken(memUser);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! (Offline demo mode)',
      messageHi: 'खाता सफलतापूर्वक बनाया गया!',
      token,
      user: {
        _id: memUser._id,
        name: memUser.name,
        phone: memUser.phone,
        email: memUser.email,
        role: memUser.role,
        isVerified: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Password Login
 * @route   POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { phone, password, role } = req.body;
    const cleanPhone = phone.trim();

    let user = null;
    if (isDbConnected()) {
      try {
        user = await User.findOne({ phone: cleanPhone });
      } catch (err) {
        logger.warn(`Mongo login find failed: ${err.message}`);
      }
    }

    if (!user) {
      user = memoryUserCache.get(cleanPhone);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
        messageHi: 'अमान्य क्रेडेंशियल्स। उपयोगकर्ता नहीं मिला।'
      });
    }

    if (user.isBlocked || user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact administrator.',
        messageHi: 'खाता निलंबित कर दिया गया है। कृपया व्यवस्थापक से संपर्क करें।'
      });
    }

    let isMatch = false;
    if (typeof user.comparePassword === 'function') {
      isMatch = await user.comparePassword(password);
    } else if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
        messageHi: 'अमान्य फ़ोन या पासवर्ड'
      });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Role mismatch: This account is registered as '${user.role}'`,
        messageHi: `भूमिका बेमेल: यह खाता '${user.role}' के रूप में पंजीकृत है`
      });
    }

    const token = createJwtToken(user);
    await logLogin(user._id, user.role, 'password', req);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      messageHi: `स्वागत है, ${user.name}!`,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request 6-digit Demo OTP
 * @route   POST /api/auth/otp/request
 */
const requestOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone.trim();

    // Check rate limit: 3 requests per phone per 10 minutes
    const rateCheck = checkOtpRateLimit(cleanPhone);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateCheck.message,
        messageHi: 'बहुत अधिक ओटीपी अनुरोध। कृपया कुछ समय बाद पुनः प्रयास करें।'
      });
    }

    const rawOtp = generateOtp();
    const codeHash = await hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Always update in-memory cache as instant fallback
    memoryOtpCache.set(cleanPhone, {
      codeHash,
      rawOtp,
      expiresAt,
      attempts: 0
    });

    // If MongoDB is reachable, save to Mongo collection as well
    if (isDbConnected()) {
      try {
        await Otp.deleteMany({ phone: cleanPhone });
        await Otp.create({
          phone: cleanPhone,
          codeHash,
          expiresAt,
          attempts: 0
        });
      } catch (dbErr) {
        logger.warn(`Mongo Otp save failed, using memory fallback: ${dbErr.message}`);
      }
    }

    const isDemoMode = process.env.DEMO_MODE === 'true';

    if (isDemoMode) {
      console.log(`\n\x1b[33m\x1b[1m🔑 [DEMO OTP FOR ${cleanPhone}]: ${rawOtp} (Valid for 5 mins)\x1b[0m\n`);
    }

    logger.info(`OTP requested for phone: ${cleanPhone}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully! (Valid for 5 minutes)',
      messageHi: 'ओटीपी सफलतापूर्वक भेजा गया! (5 मिनट के लिए वैध)',
      ...(isDemoMode && { otp: rawOtp, demoMode: true }),
      expiresInMinutes: 5
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and return JWT (Create user if new)
 * @route   POST /api/auth/otp/verify
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { phone, code, role } = req.body;
    const cleanPhone = phone.trim();
    const enteredCode = code.toString().trim();

    let otpRecord = null;
    let isMemoryRecord = false;

    if (isDbConnected()) {
      try {
        otpRecord = await Otp.findOne({ phone: cleanPhone });
      } catch (err) {
        logger.warn(`Mongo Otp find failed: ${err.message}`);
      }
    }

    if (!otpRecord) {
      otpRecord = memoryOtpCache.get(cleanPhone);
      isMemoryRecord = true;
    }

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found. Please request a new code.',
        messageHi: 'कोई सक्रिय ओटीपी नहीं मिला। कृपया नया कोड अनुरोध करें।'
      });
    }

    // Check max 5 attempts
    if (otpRecord.attempts >= 5) {
      if (!isMemoryRecord && isDbConnected()) {
        await Otp.deleteOne({ _id: otpRecord._id }).catch(() => {});
      }
      memoryOtpCache.delete(cleanPhone);
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP verification attempts exceeded (5). Please request a new code.',
        messageHi: 'अधिकतम ओटीपी सत्यापन प्रयास पार हो गए (5)। कृपया नया कोड अनुरोध करें।'
      });
    }

    const isMatch = await verifyOtpHash(enteredCode, otpRecord.codeHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      if (!isMemoryRecord && isDbConnected()) {
        await otpRecord.save().catch(() => {});
      } else {
        memoryOtpCache.set(cleanPhone, otpRecord);
      }
      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. Attempts remaining: ${5 - otpRecord.attempts}`,
        messageHi: `अमान्य ओटीपी कोड। शेष प्रयास: ${5 - otpRecord.attempts}`
      });
    }

    // OTP matched! Delete used OTP
    if (!isMemoryRecord && isDbConnected()) {
      await Otp.deleteOne({ _id: otpRecord._id }).catch(() => {});
    }
    memoryOtpCache.delete(cleanPhone);

    // Find or create user
    let user = null;
    if (isDbConnected()) {
      try {
        user = await User.findOne({ phone: cleanPhone });
        if (!user) {
          user = await User.create({
            name: `User-${cleanPhone.slice(-4)}`,
            phone: cleanPhone,
            role: role || 'customer',
            isVerified: true
          });
        }
      } catch (err) {
        logger.warn(`Mongo user find/create failed: ${err.message}`);
      }
    }

    if (!user) {
      user = memoryUserCache.get(cleanPhone);
      if (!user) {
        user = {
          _id: new mongoose.Types.ObjectId(),
          name: `User-${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          role: role || 'customer',
          isVerified: true,
          location: { type: 'Point', coordinates: [77.391, 28.5355] }
        };
        memoryUserCache.set(cleanPhone, user);
      }
    }

    if (user.isBlocked || user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Contact administrator.',
        messageHi: 'खाता निलंबित। व्यवस्थापक से संपर्क करें।'
      });
    }

    const token = createJwtToken(user);
    await logLogin(user._id, user.role, 'otp', req);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully! Logged in.',
      messageHi: 'ओटीपी सफलतापूर्वक सत्यापित! लॉग इन हो गया।',
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Current User Profile
 * @route   GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  requestOtp,
  verifyOtp,
  getMe
};
