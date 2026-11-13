// server/routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
  toggleFavourite,
  getFavourites,
  updateLanguage,
  repeatOrder
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/favourites/:communityId', toggleFavourite);
router.get('/favourites', getFavourites);
router.patch('/language', updateLanguage);
router.post('/orders/:orderId/repeat', repeatOrder);

module.exports = router;
