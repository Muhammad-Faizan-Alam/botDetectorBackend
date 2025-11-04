const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Rate limiting for behavior data collection
const collectBehaviorLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many behavior data submissions, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for API data retrieval
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    message: 'Too many API requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = {
  collectBehaviorLimiter,
  apiLimiter,
  corsOptions,
  helmet
};