// server/middleware/errorHandler.js
const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const requestId = req.id || 'unknown';

  logger.error(`Error on ${req.method} ${req.originalUrl}: ${err.message}`, {
    requestId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  return res.status(statusCode).json({
    success: false,
    requestId,
    message: err.message || 'Internal Server Error',
    messageHi: err.messageHi || 'आंतरिक सर्वर त्रुटि',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
