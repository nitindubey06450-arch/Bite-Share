// server/middleware/errorHandler.js
const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Map Mongo duplicate key error (code 11000) to 409 Conflict
  let statusCode = err.statusCode || (err.code === 11000 ? 409 : 500);
  let message = err.message || 'Internal Server Error';

  if (err.code === 11000) {
    message = 'Duplicate entry: you have already reviewed this or record already exists';
  }

  const requestId = req.id || 'unknown';

  logger.error(`Error on ${req.method} ${req.originalUrl}: ${err.message}`, {
    requestId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  return res.status(statusCode).json({
    success: false,
    requestId,
    message,
    messageHi: err.messageHi || 'आंतरिक सर्वर त्रुटि',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
