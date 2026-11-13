// server/validators/otherListing.validator.js
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
 * Validator for creating an other listing
 * Validates: title, description, type (free-text category), quantity, imageUrl, pickupAddress
 */
const validateOtherListing = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 2, max: 120 })
    .withMessage('Title must be between 2 and 120 characters'),

  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),

  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required (e.g. clothes, books, household)')
    .isLength({ min: 2, max: 60 })
    .withMessage('Type must be between 2 and 60 characters'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be an integer of at least 1'),

  body('imageUrl')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('imageUrl must be a valid string URL'),

  body('pickupAddress')
    .optional()
    .isString()
    .withMessage('pickupAddress must be a string'),

  handleValidationErrors
];

module.exports = {
  validateOtherListing,
  handleValidationErrors
};
