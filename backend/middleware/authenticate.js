'use strict';

const jwt = require('jsonwebtoken');

/**
 * authenticate middleware
 * ──────────────────────
 * Verifies the JWT in "Authorization: Bearer <token>".
 * On success attaches req.user = { id, email } and calls next().
 * On failure returns 401 immediately — never exposes JWT internals.
 */
module.exports = function authenticate(req, res, next) {
  // --- Guest & Preflight Bypass ---
  // 1. Always allow OPTIONS (CORS preflight)
  // 2. Allow AI routes (for guest generation)
  if (req.method === 'OPTIONS' || req.originalUrl.includes('/ai/')) {
    return next();
  }

  const header = req.headers['authorization'];

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Attach only what routes need — never forward the raw token
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};
