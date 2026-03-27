'use strict';

const { body, param, validationResult } = require('express-validator');

/**
 * Handle validation results.
 * If there are errors, return 400 with the error list.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return the first error as the main 'error' field so the frontend can show it easily
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

const registerValidator = [
  body('email').isEmail().withMessage('Invalid email address.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .withMessage('Password must include uppercase, lowercase, and a number.'),
  validate
];

const loginValidator = [
  body('email').isEmail().withMessage('Invalid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  validate
];

const verifyEmailValidator = [
  body('token').notEmpty().withMessage('Verification token is required.'),
  validate
];

const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Invalid email address.').normalizeEmail(),
  validate
];

const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .withMessage('Password must include uppercase, lowercase, and a number.'),
  validate
];

const recipeValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required.')
    .isLength({ max: 100 })
    .withMessage('Title must be at most 100 characters.'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required.')
    .isLength({ max: 5000 })
    .withMessage('Content must be at most 5000 characters.'),
  validate
];

const recipeIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid recipe ID.'),
  validate
];

const recipeUpdateValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid recipe ID.'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Title must be at most 100 characters.'),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 5000 })
    .withMessage('Content must be at most 5000 characters.'),
  validate
];

const aiGenerateValidator = [
  body('prompt')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Prompt is required.')
    .isLength({ max: 1000 })
    .withMessage('Prompt is too long (max 1000 characters).'),
  validate
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  recipeValidator,
  recipeIdValidator,
  recipeUpdateValidator,
  aiGenerateValidator
};
