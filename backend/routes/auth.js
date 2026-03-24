'use strict';

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db        = require('../db/database');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const authenticate = require('../middleware/authenticate');
const {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../middleware/validators');

const router = express.Router();

// ─── Constants ──────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS       = 12;
const ACCESS_TOKEN_TTL    = '15m';
const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60;     // 7 days in seconds
const VERIFY_TOKEN_TTL_S  = 24 * 60 * 60;          // 24 hours
const RESET_TOKEN_TTL_S   = 60 * 60;               // 1 hour

// ─── Helpers ────────────────────────────────────────────────────────────────
function issueAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function issueRefreshToken(userId) {
  const token     = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL_S;
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(userId, token, expiresAt);
  return { token, expiresAt };
}

function setRefreshCookie(res, token, expiresAt) {
  res.cookie('refreshToken', token, {
    httpOnly: true,            // not accessible by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(expiresAt * 1000),
    path: '/auth/refresh',     // scoped — only sent to the refresh endpoint
  });
}

// ─── POST /auth/register ─────────────────────────────────────────────────────
router.post('/register', registerLimiter, registerValidator, async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingUser) {
      // Return same message as "not found" — prevents user enumeration
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash  = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verifyToken   = uuidv4();
    const verifyExpires = Math.floor(Date.now() / 1000) + VERIFY_TOKEN_TTL_S;

    db.prepare(`
      INSERT INTO users (email, password_hash, verify_token, verify_token_expires)
      VALUES (?, ?, ?, ?)
    `).run(email.toLowerCase(), passwordHash, verifyToken, verifyExpires);

    // Send verification email (non-blocking — don't fail reg if SMTP is slow)
    sendVerificationEmail(email.toLowerCase(), verifyToken).catch(err =>
      console.error('Failed to send verification email:', err.message)
    );

    return res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── POST /auth/verify-email ─────────────────────────────────────────────────
router.post('/verify-email', verifyEmailValidator, (req, res) => {
  const { token } = req.body;

  const user = db.prepare('SELECT id, verify_token_expires, is_verified FROM users WHERE verify_token = ?').get(token);

  if (!user) return res.status(400).json({ error: 'Invalid or expired verification link.' });

  if (user.is_verified) return res.status(200).json({ message: 'Email already verified.' });

  const now = Math.floor(Date.now() / 1000);
  if (user.verify_token_expires < now) {
    return res.status(400).json({ error: 'Verification link has expired. Please register again.' });
  }

  db.prepare(
    'UPDATE users SET is_verified = 1, verify_token = NULL, verify_token_expires = NULL WHERE id = ?'
  ).run(user.id);

  return res.json({ message: 'Email verified! You can now log in.' });
});

// ─── POST /auth/login ────────────────────────────────────────────────────────
router.post('/login', loginLimiter, loginValidator, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    // Constant-time compare even on missing user — prevents timing attacks
    const dummyHash = '$2a$12$invalidhashfortimingprotectiononly000000000000000000000u';
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const accessToken  = issueAccessToken(user);
    const { token: refreshToken, expiresAt } = issueRefreshToken(user.id);
    setRefreshCookie(res, refreshToken, expiresAt);

    return res.json({
      accessToken,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── POST /auth/refresh ──────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) return res.status(401).json({ error: 'No refresh token.' });

  const now = Math.floor(Date.now() / 1000);
  const row = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > ?'
  ).get(token, now);

  if (!row) return res.status(401).json({ error: 'Invalid or expired refresh token.' });

  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(row.user_id);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  // Rotate refresh token — delete old, issue new (prevents replay)
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
  const { token: newRefresh, expiresAt } = issueRefreshToken(user.id);
  setRefreshCookie(res, newRefresh, expiresAt);

  const accessToken = issueAccessToken(user);
  return res.json({ accessToken });
});

// ─── POST /auth/logout ───────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
  }

  res.clearCookie('refreshToken', { path: '/auth/refresh' });
  return res.json({ message: 'Logged out.' });
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────
// Returns the current user's safe profile — NEVER returns password_hash or tokens
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user });
});

// ─── POST /auth/forgot-password ──────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordValidator, async (req, res) => {
  try {
    const { email } = req.body;

    // Always return the same response — prevents user enumeration
    const genericResponse = { message: 'If that email exists, a reset link has been sent.' };

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.json(genericResponse);

    const resetToken   = uuidv4();
    const resetExpires = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL_S;

    db.prepare(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
    ).run(resetToken, resetExpires, user.id);

    sendPasswordResetEmail(email.toLowerCase(), resetToken).catch(err =>
      console.error('Failed to send reset email:', err.message)
    );

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── POST /auth/reset-password ───────────────────────────────────────────────
router.post('/reset-password', resetPasswordValidator, async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = db.prepare('SELECT id, reset_token_expires FROM users WHERE reset_token = ?').get(token);

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link.' });

    const now = Math.floor(Date.now() / 1000);
    if (user.reset_token_expires < now) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Invalidate reset token and all refresh tokens (forces re-login everywhere)
    db.prepare(`
      UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?
    `).run(passwordHash, user.id);
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id);

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
