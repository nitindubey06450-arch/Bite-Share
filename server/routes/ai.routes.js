// server/routes/ai.routes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { searchAi, analyzeFood } = require('../controllers/ai.controller');
const { protect, optionalAuth } = require('../middleware/auth');

// Rate limit: 20 requests per user / IP per hour
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded: Maximum 20 AI queries per hour.',
    messageHi: 'दर सीमा पार: प्रति घंटे अधिकतम 20 AI प्रश्न।'
  }
});

// General AI question answering
router.post('/search', aiRateLimiter, optionalAuth, searchAi);

// AI Food Nutrition & Shelf-Life Analysis using OpenAI gpt-4o-mini (Supports authenticated & guest visitors)
router.post('/analyze', aiRateLimiter, optionalAuth, analyzeFood);

module.exports = router;
