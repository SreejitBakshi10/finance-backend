const router = require('express').Router();
const { registerRules, loginRules } = require('../validators/auth.validator');
const { validate }     = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const authService      = require('../services/auth.service');

router.post('/register', registerRules, validate, async (req, res, next) => {
  try { res.status(201).json(await authService.register(req.body)); }
  catch (err) { next(err); }
});

router.post('/login', loginRules, validate, async (req, res, next) => {
  try { res.json(await authService.login(req.body)); }
  catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try { res.json(await authService.getMe(req.user.id)); }
  catch (err) { next(err); }
});

module.exports = router;