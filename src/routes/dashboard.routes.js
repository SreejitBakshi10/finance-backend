const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const dashService = require('../services/dashboard.service');

router.get('/summary', authenticate, async (req, res, next) => {
  try { res.json(await dashService.getSummary()); }
  catch (err) { next(err); }
});

router.get('/recent-activity', authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    res.json(await dashService.getRecentActivity(limit));
  } catch (err) { next(err); }
});

router.get('/categories', authenticate, requireRole('analyst'), async (req, res, next) => {
  try { res.json(await dashService.getCategoryTotals({ type: req.query.type })); }
  catch (err) { next(err); }
});

router.get('/trends/monthly', authenticate, requireRole('analyst'), async (req, res, next) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 24);
    res.json(await dashService.getMonthlyTrends({ months }));
  } catch (err) { next(err); }
});

router.get('/trends/weekly', authenticate, requireRole('analyst'), async (req, res, next) => {
  try {
    const weeks = Math.min(parseInt(req.query.weeks) || 8, 52);
    res.json(await dashService.getWeeklyTrends({ weeks }));
  } catch (err) { next(err); }
});

module.exports = router;