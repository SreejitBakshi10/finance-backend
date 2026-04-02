const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [payload.sub]
    );
    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.status === 'inactive') return res.status(403).json({ error: 'Account is inactive' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };