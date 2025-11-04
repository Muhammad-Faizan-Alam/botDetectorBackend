const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// CORS configuration - Allow ALL origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow ALL origins
    callback(null, true);
    
    // Optional: Log origins for monitoring (remove in production if needed)
    if (origin) {
      console.log('CORS request from origin:', origin);
    }
  },
  credentials: false, // Set to false to allow wildcard origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

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

module.exports = {
  collectBehaviorLimiter,
  apiLimiter,
  corsOptions,
  helmet
};