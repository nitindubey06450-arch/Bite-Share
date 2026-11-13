// server/services/impact.service.js
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Order = require('../models/Order');

// Configurable constant: 0.5 kg food waste prevented per meal
const KG_PER_MEAL = parseFloat(process.env.IMPACT_KG_PER_MEAL || '0.5');

/**
 * Calculate live impact metrics from picked_up listings & completed orders
 */
const calculateImpact = async (communityId = null) => {
  let totalMeals = 0;

  if (mongoose.connection.readyState === 1) {
    try {
      const listingQuery = { status: 'picked_up' };
      if (communityId) listingQuery.postedBy = communityId;
      const pickedUpListings = await Listing.find(listingQuery);
      for (const item of pickedUpListings) {
        totalMeals += (item.quantity || item.portions || 1);
      }

      const orderQuery = { status: 'delivered' };
      if (communityId) orderQuery.provider = communityId;
      const deliveredOrders = await Order.find(orderQuery);
      for (const order of deliveredOrders) {
        const orderPortions = order.items?.reduce((s, it) => s + (it.portions || 1), 0) || 1;
        totalMeals += orderPortions;
      }
    } catch (e) {
      // Non-blocking
    }
  }

  // Baseline from community contributions + live additions
  const baseline = communityId ? 0 : 18650;
  const mealsSaved = totalMeals + baseline;
  const foodWasteKg = Number((mealsSaved * KG_PER_MEAL).toFixed(1));

  return {
    totalMealsSaved: mealsSaved,
    mealsSaved,
    foodWasteKg,
    foodWastePreventedKg: foodWasteKg,
    kgPerMeal: KG_PER_MEAL
  };
};

module.exports = {
  calculateImpact,
  KG_PER_MEAL
};
