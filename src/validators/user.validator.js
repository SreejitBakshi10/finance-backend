const { body } = require('express-validator');

const updateUserRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
];
const roleRules = [
  body('role').isIn(['viewer', 'analyst', 'admin'])
    .withMessage('Role must be viewer, analyst, or admin'),
];
const statusRules = [
  body('status').isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),
];

module.exports = { updateUserRules, roleRules, statusRules };