// server/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { logger, requestLoggerMiddleware } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { initializeTrackingSockets } = require('./sockets/tracking');

// Routes
const authRoutes         = require('./routes/auth.routes');
const locationRoutes     = require('./routes/location.routes');
const orderRoutes        = require('./routes/order.routes');
const listingRoutes      = require('./routes/listing.routes');
const otherListingRoutes = require('./routes/otherListing.routes');
const userRoutes         = require('./routes/user.routes');
const reviewRoutes       = require('./routes/review.routes');
const impactRoutes       = require('./routes/impact.routes');
const adminRoutes        = require('./routes/admin.routes');
const paymentRoutes      = require('./routes/payment.routes');
const aiRoutes           = require('./routes/ai.routes');

const app    = express();
const server = http.createServer(app);

// ─── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] }
});
app.set('io', io);
initializeTrackingSockets(io);

// ─── Security middleware ─────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.FRONTEND_ORIGIN || 'http://localhost:5000',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5500'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      cb(null, true);
    } else {
      cb(new Error('CORS blocked'));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));

// ─── Health check  (before rate-limiter so it is always reachable) ───────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    project: 'BiteShare API v2',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
    features: [
      'Multi-Role Auth (Community / Customer / Rider / Admin)',
      'Handoff OTP (4-digit)',
      'Live Socket.io Delivery Tracking',
      'AI Analysis (OpenAI gpt-4o-mini)',
      'AI Search (Gemini / OpenAI)',
      'Meal Listings & Other Listings CRUD',
      'Impact Dashboard & PDF',
      'Admin Panel',
      'Razorpay + COD Payments'
    ]
  });
});

// ─── Rate limiter ────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests', messageHi: 'बहुत अधिक अनुरोध' }
}));

// ─── Body parsers & logger ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

// ─── Serve static frontend ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ─── API routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/location',       locationRoutes);
app.use('/api/orders',         orderRoutes);
app.use('/api/listings',       listingRoutes);
app.use('/api/other-listings', otherListingRoutes);
app.use('/api/user',           userRoutes);
app.use('/api/reviews',        reviewRoutes);
app.use('/api/impact',         impactRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/payments',       paymentRoutes);
app.use('/api/ai',             aiRoutes);

// ─── Error handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = () => {
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🍛  BiteShare server  →  http://localhost:${PORT}`);
    logger.info(`🩺  Health check     →  http://localhost:${PORT}/api/health`);
    logger.info(`📡  Socket.io        →  ws://localhost:${PORT}`);
  });

  // DB connection is non-fatal; server starts regardless
  connectDB().catch(err => logger.error(`MongoDB: ${err.message}`));
};

if (require.main === module) startServer();

module.exports = { app, server };
