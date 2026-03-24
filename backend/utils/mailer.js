'use strict';

const nodemailer = require('nodemailer');

let _transporter = null;

/**
 * getTransporter
 * ─────────────
 * Lazily creates the Nodemailer transport.
 * If SMTP_USER / SMTP_PASS are not set in .env, creates a free
 * Ethereal test account automatically — perfect for local development.
 * Check Ethereal preview URLs logged to console for sent emails.
 */
async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Auto-create an Ethereal test account for local development
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Ethereal test account created:');
    console.log('   User:', testAccount.user);
    console.log('   Pass:', testAccount.pass);
    console.log('   Preview emails at: https://ethereal.email\n');

    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return _transporter;
}

/**
 * sendVerificationEmail
 * Sends an account verification link with a 24-hour expiry.
 */
async function sendVerificationEmail(toEmail, token) {
  const transport = await getTransporter();
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email.html?token=${token}`;

  const info = await transport.sendMail({
    from: `"Bachelor Savior" <${process.env.FROM_EMAIL}>`,
    to: toEmail,
    subject: 'Verify your Bachelor Savior account',
    html: `
      <h2>Welcome to Bachelor Savior! 🧑‍🍳</h2>
      <p>Click the link below to verify your email address.</p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#fff;border-radius:6px;text-decoration:none;">
        Verify Email
      </a>
      <p style="color:#888;font-size:12px;margin-top:16px;">If you didn't create an account, you can safely ignore this email.</p>
    `,
    text: `Verify your email: ${verifyUrl}`,
  });

  // In development, log the Ethereal preview URL
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log('📧 Verification email preview:', preview);
}

/**
 * sendPasswordResetEmail
 * Sends a password reset link with a 1-hour expiry.
 */
async function sendPasswordResetEmail(toEmail, token) {
  const transport = await getTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;

  const info = await transport.sendMail({
    from: `"Bachelor Savior" <${process.env.FROM_EMAIL}>`,
    to: toEmail,
    subject: 'Reset your Bachelor Savior password',
    html: `
      <h2>Password Reset Request 🔐</h2>
      <p>Click below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#14b8a6;color:#fff;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>
      <p style="color:#888;font-size:12px;margin-top:16px;">If you didn't request a password reset, you can safely ignore this email.</p>
    `,
    text: `Reset your password: ${resetUrl}`,
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log('📧 Password reset email preview:', preview);
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
