// server/utils/logger.js
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Sensitive field sanitizer
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('codehash') ||
      lowerKey.includes('otp')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('phone') && typeof sanitized[key] === 'string') {
      // Mask phone number: e.g. +91 9876543210 -> +91 98****3210
      const phone = sanitized[key];
      if (phone.length > 6) {
        sanitized[key] = phone.slice(0, 4) + '****' + phone.slice(-4);
      }
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
      const reqIdStr = requestId ? `[ReqID: ${requestId}] ` : '';
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(sanitizeData(meta))}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] ${reqIdStr}${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
          const reqIdStr = requestId ? `\x1b[90m[${requestId}]\x1b[0m ` : '';
          const metaStr = Object.keys(meta).length ? ` \x1b[90m${JSON.stringify(sanitizeData(meta))}\x1b[0m` : '';
          return `${timestamp} ${level} ${reqIdStr}${message}${metaStr}`;
        })
      )
    })
  ]
});

// Express middleware to attach unique Request ID and log incoming requests
const requestLoggerMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`, {
      requestId: req.id,
      ip: req.ip || req.connection.remoteAddress,
      statusCode: res.statusCode
    });
  });

  next();
};

module.exports = {
  logger,
  requestLoggerMiddleware,
  sanitizeData
};
