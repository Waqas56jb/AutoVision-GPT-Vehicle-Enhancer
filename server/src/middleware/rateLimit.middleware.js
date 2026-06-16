import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

/**
 * Per-IP rate limiter for the (expensive) enhancement endpoint.
 */
export const enhanceRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests. Please slow down and try again later.' },
  },
});

export default enhanceRateLimiter;
