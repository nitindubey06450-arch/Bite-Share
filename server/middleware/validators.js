// server/middleware/validators.js
const { body, param, query, validationResult } = require('express-validator');

// Error formatter producing bilingual messages (English & Hindi)
const formatValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => {
      let enMsg = err.msg;
      let hiMsg = err.msg;

      if (typeof err.msg === 'object') {
        enMsg = err.msg.en || 'Invalid field';
        hiMsg = err.msg.hi || 'अमान्य फ़ील्ड';
      }

      return {
        field: err.path || err.param,
        en: enMsg,
        hi: hiMsg
      };
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed / सत्यापन विफल रहा',
      errors: formatted
    });
  }
  next();
};

const validateSignup = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage({ en: 'Name is required', hi: 'नाम आवश्यक है' }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage({ en: 'Phone number is required', hi: 'फ़ोन नंबर आवश्यक है' })
    .matches(/^[+]?[0-9]{10,13}$/)
    .withMessage({ en: 'Please enter a valid phone number', hi: 'कृपया एक वैध फ़ोन नंबर दर्ज करें' }),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage({ en: 'Invalid email address', hi: 'अमान्य ईमेल पता' }),
  body('password')
    .isLength({ min: 6 })
    .withMessage({ en: 'Password must be at least 6 characters', hi: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' }),
  body('role')
    .isIn(['community', 'customer', 'rider', 'admin'])
    .withMessage({ en: 'Role must be community, customer, rider, or admin', hi: 'भूमिका कम्युनिटी, ग्राहक, राइडर, या व्यवस्थापक होनी चाहिए' }),
  formatValidationErrors
];

const validateLogin = [
  body('password')
    .notEmpty()
    .withMessage({ en: 'Password is required', hi: 'पासवर्ड आवश्यक है' }),
  formatValidationErrors
];

const validateOtpRequest = [
  body('phone')
    .optional()
    .trim(),
  formatValidationErrors
];

const validateOtpVerify = [
  body('code')
    .optional()
    .trim(),
  formatValidationErrors
];

const validateLocation = [
  body('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage({ en: 'Valid latitude (-90 to 90) required', hi: 'वैध अक्षांश (-90 से 90) आवश्यक है' }),
  body('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage({ en: 'Valid longitude (-180 to 180) required', hi: 'वैध देशांतर (-180 से 180) आवश्यक है' }),
  formatValidationErrors
];

const validateOrderCreate = [
  body('pickup.address')
    .optional()
    .notEmpty(),
  body('drop.address')
    .optional()
    .notEmpty(),
  formatValidationErrors
];

const validateHandoff = [
  body('code')
    .trim()
    .isLength({ min: 4, max: 4 })
    .withMessage({ en: 'Handoff OTP must be exactly 4 digits', hi: 'हैंडऑफ़ ओटीपी ठीक 4 अंकों का होना चाहिए' }),
  body('type')
    .isIn(['pickup', 'delivery'])
    .withMessage({ en: 'Handoff type must be pickup or delivery', hi: 'हैंडऑफ़ प्रकार पिकअप या डिलीवरी होना चाहिए' }),
  formatValidationErrors
];

const validateReview = [
  body('orderId')
    .isMongoId()
    .withMessage({ en: 'Valid Order ID is required', hi: 'वैध ऑर्डर आईडी आवश्यक है' }),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage({ en: 'Rating must be between 1 and 5 stars', hi: 'रेटिंग 1 से 5 स्टार के बीच होनी चाहिए' }),
  body('comment')
    .optional()
    .isString(),
  body('targetType')
    .isIn(['community', 'rider'])
    .withMessage({ en: 'Target must be community or rider', hi: 'लक्ष्य कम्युनिटी या राइडर होना चाहिए' }),
  formatValidationErrors
];

const validateListingCreate = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage({ en: 'Listing title is required', hi: 'सूची शीर्षक आवश्यक है' }),
  body('category')
    .optional()
    .isIn(['veg', 'non-veg'])
    .withMessage({ en: 'Category must be veg or non-veg', hi: 'श्रेणी शाकाहारी या मांसाहारी होनी चाहिए' }),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage({ en: 'Quantity must be at least 1', hi: 'मात्रा कम से कम 1 होनी चाहिए' }),
  formatValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateOtpRequest,
  validateOtpVerify,
  validateLocation,
  validateOrderCreate,
  validateHandoff,
  validateReview,
  validateListingCreate
};
