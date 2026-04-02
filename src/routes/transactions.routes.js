const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createRules, updateRules, listQueryRules } = require('../validators/transaction.validator');
const txService = require('../services/transaction.service');

const analystUp = [authenticate, requireRole('analyst')];
const adminOnly = [authenticate, requireRole('admin')];

router.get('/', ...analystUp, listQueryRules, validate, async (req, res, next) => {
  try {
    const { page, limit, type, category, from, to, search, sortBy, order } = req.query;
    res.json(await txService.getAll({ page: +page || 1, limit: +limit || 20, type, category, from, to, search, sortBy, order }));
  } catch (err) { next(err); }
});

router.get('/:id', ...analystUp, async (req, res, next) => {
  try { res.json(await txService.getById(req.params.id)); }
  catch (err) { next(err); }
});

router.post('/', ...analystUp, createRules, validate, async (req, res, next) => {
  try { res.status(201).json(await txService.create(req.body, req.user.id)); }
  catch (err) { next(err); }
});

router.put('/:id', ...analystUp, updateRules, validate, async (req, res, next) => {
  try { res.json(await txService.update(req.params.id, req.body)); }
  catch (err) { next(err); }
});

router.delete('/:id', ...adminOnly, async (req, res, next) => {
  try { await txService.softDelete(req.params.id); res.status(204).send(); }
  catch (err) { next(err); }
});

module.exports = router;