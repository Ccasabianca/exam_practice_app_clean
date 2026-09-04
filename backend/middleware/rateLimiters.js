/** limitation de débit @module middleware/rateLimiters */
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const logger = require('../utils/logger');

const WINDOW_15_MIN = 15 * 60 * 1000;

const common = {
  windowMs: WINDOW_15_MIN,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (req, res, _next, options) => {
    logger.warn('rate_limit.exceeded', { ip: req.ip, path: req.originalUrl });
    res.status(options.statusCode).json(options.message);
  },
};

const apiLimiter = rateLimit({
  ...common,
  limit: 300,
  message: { msg: 'Trop de requêtes, réessayez dans quelques minutes' },
});

// fix : anti force brute sur login et register, seuls les échecs comptent
const authLimiter = rateLimit({
  ...common,
  limit: config.rateLimitAuthMax,
  skipSuccessfulRequests: true,
  message: { msg: 'Trop de tentatives, réessayez dans 15 minutes' },
});

module.exports = { apiLimiter, authLimiter };
