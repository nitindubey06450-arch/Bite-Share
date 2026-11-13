// server/controllers/ai.controller.js
const mongoose = require('mongoose');
const SearchHistory = require('../models/SearchHistory');
const { logger } = require('../utils/logger');

const getFallbackResponse = (query) => {
  const q = query.toLowerCase();
  if (q.includes('recipe') || q.includes('leftover') || q.includes('khana')) {
    return 'BiteShare Food Rescue Tip: Excess cooked grains or rice can be repurposed into nutritious fried rice, cutlets, or porridge within 24 hours. Keep refrigerated at or below 4°C.';
  }
  if (q.includes('store') || q.includes('safe') || q.includes('spoil') || q.includes('expiry')) {
    return 'BiteShare Safety Norms: Cooked meals should be stored in food-grade airtight containers. If warm, maintain above 60°C or chill to 4°C within 2 hours to prevent bacterial contamination.';
  }
  return `BiteShare Assistant: "${query}" — BiteShare bridges surplus meals to hungry hearts in real-time. You can explore available meals, post surplus batches, or track active volunteer deliveries!`;
};

const getFallbackNutritionAnalysis = (foodName) => {
  const f = foodName.toLowerCase();

  let category = 'wholesome cooked preparation';
  let protein = '8g to 12g per serving';
  let calories = '220 to 280 kcal per portion';
  let mainNutrients = 'Dietary Fiber, Complex Carbohydrates, Iron, Essential B-Vitamins';
  let roomTemp = '2 hours maximum at room temperature';
  let fridge = '3 to 4 days stored below 4°C in airtight containers';

  if (f.includes('dal') || f.includes('lentil') || f.includes('chana') || f.includes('rajma') || f.includes('chole')) {
    category = 'protein-rich plant legume & lentil dish';
    protein = '14g to 18g per cup serving';
    calories = '240 to 320 kcal';
    mainNutrients = 'Plant Protein, Folate, Iron, Soluble Fiber, Potassium';
    roomTemp = '2 hours at room temperature (sour/ferment risk if warm)';
    fridge = '3 to 4 days tightly covered in refrigerator at 4°C';
  } else if (f.includes('rice') || f.includes('biryani') || f.includes('pulao') || f.includes('khichdi')) {
    category = 'staple aromatic grain preparation';
    protein = '6g to 12g per serving';
    calories = '320 to 450 kcal';
    mainNutrients = 'Energy-dense Carbohydrates, Magnesium, Vitamin B1, Selenium';
    roomTemp = '1.5 to 2 hours max (Strict: prone to Bacillus cereus spore growth)';
    fridge = '2 to 3 days maximum at or below 4°C; reheat thoroughly to 74°C';
  } else if (f.includes('paneer') || f.includes('cheese') || f.includes('dairy') || f.includes('milk') || f.includes('kheer')) {
    category = 'fresh dairy-based delicacy';
    protein = '15g to 20g per 150g serving';
    calories = '320 to 410 kcal';
    mainNutrients = 'High Calcium, Phosphorus, Complete Casein Protein, Vitamin A';
    roomTemp = '1.5 hours max at room temp (rapid bacterial spoilage risk)';
    fridge = '2 to 3 days sealed at 2°C to 4°C';
  } else if (f.includes('roti') || f.includes('bread') || f.includes('naan') || f.includes('paratha') || f.includes('baguette') || f.includes('sourdough')) {
    category = 'whole grain bakery & flatbread staple';
    protein = '4g to 8g per piece';
    calories = '120 to 220 kcal per piece';
    mainNutrients = 'Dietary Fiber, Thiamine, Iron, Complex Carbs';
    roomTemp = '12 to 24 hours at room temp in cool, dry conditions';
    fridge = '3 to 5 days wrapped (can be frozen up to 3 months)';
  } else if (f.includes('salad') || f.includes('fruit') || f.includes('apple') || f.includes('vegetable')) {
    category = 'fresh fiber & antioxidant-rich garden produce';
    protein = '2g to 4g per bowl';
    calories = '80 to 140 kcal';
    mainNutrients = 'Vitamin C, Vitamin K, Potassium, Dietary Fiber, Polyphenols';
    roomTemp = '1 to 2 hours at room temperature once chopped or dressed';
    fridge = '1 to 2 days chilled at 4°C';
  } else if (f.includes('chicken') || f.includes('meat') || f.includes('fish') || f.includes('egg') || f.includes('mutton') || f.includes('non-veg')) {
    category = 'high-protein cooked non-vegetarian preparation';
    protein = '22g to 28g per serving';
    calories = '280 to 390 kcal';
    mainNutrients = 'Complete Protein, Heme Iron, Vitamin B12, Zinc, Omega Fatty Acids';
    roomTemp = '1.5 hours max at room temperature';
    fridge = '2 to 3 days strictly below 4°C; always reheat until steaming hot';
  }

  return {
    foodName,
    explanation: `${foodName} is a ${category}. When rescued and redistributed through BiteShare, it provides nutritious energy and wholesome sustenance to nearby families.`,
    protein,
    calories,
    mainNutrients,
    shelfLife: {
      roomTemperatureSafetyTime: roomTemp,
      refrigeratorStorageDuration: fridge
    },
    engine: 'BiteShare Food Safety & Nutrition Engine (Live Backup)'
  };
};

/**
 * @desc    Process AI search query and record history
 * @route   POST /api/ai/search
 */
const searchAi = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        messageHi: 'खोज प्रश्न आवश्यक है'
      });
    }

    const cleanQuery = query.trim();
    let answer = '';

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are the BiteShare AI Assistant for a food rescue and community relief platform. Answer questions helpfully and concisely about surplus food rescue, safe storage, leftover recipe ideas, and nutrition.'
              },
              { role: 'user', content: cleanQuery }
            ],
            max_tokens: 350
          })
        });

        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          answer = data.choices?.[0]?.message?.content || getFallbackResponse(cleanQuery);
        } else {
          answer = getFallbackResponse(cleanQuery);
        }
      } catch (err) {
        logger.warn(`OpenAI search call failed (${err.message}). Using fallback domain response.`);
        answer = getFallbackResponse(cleanQuery);
      }
    } else {
      answer = getFallbackResponse(cleanQuery);
    }

    // Persist to SearchHistory
    if (mongoose.connection.readyState === 1) {
      try {
        await SearchHistory.create({
          userId: req.user ? req.user._id : null,
          userEmail: req.user?.email || req.user?.name || 'Guest User',
          role: req.user?.role || 'guest',
          query: cleanQuery,
          aiResponse: answer
        });
      } catch (dbErr) {
        // Non-blocking
      }
    }

    return res.status(200).json({
      success: true,
      query: cleanQuery,
      answer,
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Analyze food using OpenAI gpt-4o-mini
 *          Returns explanation, protein, calories, mainNutrients, shelfLife
 * @route   POST /api/ai/analyze
 */
const analyzeFood = async (req, res, next) => {
  try {
    const foodName = req.body.foodName || req.body.query;
    if (!foodName || !foodName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Food name is required for analysis',
        messageHi: 'विश्लेषण के लिए भोजन का नाम आवश्यक है'
      });
    }

    const cleanFood = foodName.trim();
    const apiKey = process.env.OPENAI_API_KEY;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const prompt = `You are a professional nutritionist and food safety inspector for BiteShare food rescue.
Analyze the following food item: "${cleanFood}".
Return ONLY a valid JSON object with the exact keys:
- explanation: A concise explanation of what this food is and its culinary/nutritional qualities.
- protein: Estimated protein in grams per typical serving (e.g. "7g per serving").
- calories: Estimated calories per typical serving (e.g. "150 kcal").
- mainNutrients: Summary of key vitamins, minerals, healthy fats, and fiber.
- shelfLife: Explicit safety guidance: 1) room temperature safety time (e.g. "2 to 4 hours"), and 2) refrigerator storage duration (e.g. "3 to 4 days at 4°C").`;

    let parsedResult = null;
    let usedFallback = false;

    if (apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are a nutrition and food safety expert. Respond strictly in valid JSON format.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          logger.warn(`OpenAI API error (${response.status}): ${errorText}`);
          usedFallback = true;
          parsedResult = getFallbackNutritionAnalysis(cleanFood);
        } else {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            parsedResult = JSON.parse(content);
          } else {
            usedFallback = true;
            parsedResult = getFallbackNutritionAnalysis(cleanFood);
          }
        }
      } catch (apiErr) {
        clearTimeout(timeoutId);
        logger.warn(`OpenAI analyze call failed (${apiErr.message}). Switching to BiteShare Food Safety Knowledge Engine.`);
        usedFallback = true;
        parsedResult = getFallbackNutritionAnalysis(cleanFood);
      }
    } else {
      usedFallback = true;
      parsedResult = getFallbackNutritionAnalysis(cleanFood);
    }

    const analysis = {
      foodName: cleanFood,
      explanation: parsedResult.explanation || parsedResult.description || `${cleanFood} is a wholesome food preparation.`,
      protein: parsedResult.protein || (parsedResult.nutrition?.protein?.amount || 'Varies by portion'),
      calories: parsedResult.calories || (parsedResult.nutrition?.calories?.amount || 'Varies by portion'),
      mainNutrients: typeof parsedResult.mainNutrients === 'object'
        ? Object.entries(parsedResult.mainNutrients).map(([k, v]) => `${k}: ${v}`).join(', ')
        : (parsedResult.mainNutrients || 'Carbohydrates, Fiber, Micronutrients'),
      shelfLife: parsedResult.shelfLife || parsedResult.typicalShelfLife || {
        roomTemperatureSafetyTime: '2 to 4 hours',
        refrigeratorStorageDuration: '3 to 4 days at 4°C'
      },
      provider: usedFallback ? 'BiteShare Smart Nutrition Engine (Fallback Active)' : 'OpenAI gpt-4o-mini'
    };

    // Save in SearchHistory
    if (mongoose.connection.readyState === 1) {
      try {
        await SearchHistory.create({
          userId: req.user ? req.user._id : null,
          userEmail: req.user?.email || req.user?.name || req.user?.phone || 'Authenticated User',
          role: req.user?.role || 'customer',
          query: `Analyze: ${cleanFood}`,
          aiResponse: JSON.stringify(analysis)
        });
      } catch (dbErr) {
        // Non-blocking
      }
    }

    return res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchAi,
  analyzeFood
};
