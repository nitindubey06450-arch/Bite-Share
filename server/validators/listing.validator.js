// server/validators/listing.validator.js
const { body, validationResult } = require('express-validator');

// Consistent error formatter returning { success: false, error: { message, details } }
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({
      field: err.path || err.param,
      message: typeof err.msg === 'object' ? err.msg.en : err.msg
    }));

    const primaryMessage = errorList.length > 0 ? errorList[0].message : 'Validation failed';

    return res.status(400).json({
      success: false,
      error: {
        message: primaryMessage,
        details: errorList
      },
      message: primaryMessage,
      errors: errorList
    });
  }
  next();
};

/**
 * Validator for creating a meal listing
 * Validates: title, category (veg | non-veg), quantity, pickupWindow, expiresAt
 */
const validateMealListing = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 2, max: 120 })
    .withMessage('Title must be between 2 and 120 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['veg', 'non-veg'])
    .withMessage('Category must be either "veg" or "non-veg"'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer of at least 1'),

  body('pickupWindow')
    .custom((val) => {
      if (!val) {
        throw new Error('pickupWindow is required');
      }
      if (typeof val === 'object') {
        const from = val.from || val.start;
        const to = val.to || val.end;
        if (!from || !to) {
          throw new Error('pickupWindow must specify "from" and "to" times');
        }
        return true;
      }
      if (typeof val === 'string' && val.trim().length > 0) {
        return true;
      }
      throw new Error('Invalid pickupWindow format');
    }),

  body('expiresAt')
    .notEmpty()
    .withMessage('expiresAt is required')
    .custom((val) => {
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        throw new Error('expiresAt must be a valid date/time');
      }
      return true;
    }),

  handleValidationErrors
];

module.exports = {
  validateMealListing,
  handleValidationErrors
};
