const { body, query } = require('express-validator');

const CATEGORIES = [
  'salary', 'freelance', 'investment', 'food', 'utilities',
  'entertainment', 'healthcare', 'transport', 'education', 'other',
];

const createRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').isIn(CATEGORIES)
    .withMessage('Category must be one of: ' + CATEGORIES.join(', ')),
  body('date').isISO8601().toDate().withMessage('Date must be a valid ISO 8601 date (YYYY-MM-DD)'),
  body('description').optional().isString().isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
];

const updateRules = [
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().isIn(CATEGORIES)
    .withMessage('Category must be one of: ' + CATEGORIES.join(', ')),
  body('date').optional().isISO8601().toDate().withMessage('Date must be a valid ISO 8601 date'),
  body('description').optional().isString().isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
];

const listQueryRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
  query('type').optional().isIn(['income', 'expense']).withMessage('type must be income or expense'),
  query('category').optional().isIn(CATEGORIES).withMessage('Invalid category'),
  query('from').optional().isISO8601().withMessage('from must be a valid date'),
  query('to').optional().isISO8601().withMessage('to must be a valid date'),
];

module.exports = { createRules, updateRules, listQueryRules, CATEGORIES };