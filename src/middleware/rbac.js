const ROLE_HIERARCHY = { viewer: 0, analyst: 1, admin: 2 };

function requireRole(...roles) {
  const minLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] ?? Infinity));
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user?.role] ?? -1;
    if (userLevel < minLevel) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions for this action' });
    }
    next();
  };
}

module.exports = { requireRole };