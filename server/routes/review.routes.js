// server/routes/review.routes.js
const express = require('express');
const router = express.Router();
const { submitReview, getUserReviews } = require('../controllers/review.controller');
const { protect } = require('../middleware/auth');
const { validateReview } = require('../middleware/validators');

router.post('/', protect, validateReview, submitReview);
router.get('/user/:userId', getUserReviews);

module.exports = router;
