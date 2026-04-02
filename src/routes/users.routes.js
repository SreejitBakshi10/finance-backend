const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { updateUserRules, roleRules, statusRules } = require('../validators/user.validator');
const userService = require('../services/user.service');

const adminOnly = [authenticate, requireRole('admin')];

router.get('/', ...adminOnly, async (req, res, next) => {
  try {
    const { page, limit, role, status, search } = req.query;
    res.json(await userService.getAll({ page: +page || 1, limit: +limit || 20, role, status, search }));
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id)
      return res.status(403).json({ error: 'Forbidden' });
    res.json(await userService.getById(req.params.id));
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, updateUserRules, validate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id)
      return res.status(403).json({ error: 'Forbidden' });
    res.json(await userService.update(req.params.id, req.body));
  } catch (err) { next(err); }
});

router.patch('/:id/role', ...adminOnly, roleRules, validate, async (req, res, next) => {
  try { res.json(await userService.updateRole(req.params.id, req.body.role)); }
  catch (err) { next(err); }
});

router.patch('/:id/status', ...adminOnly, statusRules, validate, async (req, res, next) => {
  try { res.json(await userService.updateStatus(req.params.id, req.body.status)); }
  catch (err) { next(err); }
});

router.delete('/:id', ...adminOnly, async (req, res, next) => {
  try { await userService.remove(req.params.id, req.user.id); res.status(204).send(); }
  catch (err) { next(err); }
});

module.exports = router;