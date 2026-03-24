'use strict';

const rateLimit = require('express-rate-limit');

/**
 * loginLimiter
 * Max 5 failed login attempts per IP per 15 minutes.
 * Protects against brute-force credential attacks.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,  // only count failed (non-2xx) attempts
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

/**
 * registerLimiter
 * Max 10 registration attempts per IP per hour.
 * Prevents account-creation spam / email abuse.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
});

/**
 * apiLimiter
 * Max 100 requests per authenticated user per 15 minutes.
 * Shared across all recipe endpoints.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // standardHeaders: true,
  // legacyHeaders: false,
  // keyGenerator: (req) => req.user?.id ?? req.ip,
  message: { error: 'Rate limit exceeded. Please slow down.' },
});

module.exports = { loginLimiter, registerLimiter, apiLimiter };
