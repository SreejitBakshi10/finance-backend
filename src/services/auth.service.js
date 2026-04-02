const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register({ name, email, password, role = 'viewer' }) {
  const pool = getPool();

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) {
    const err = new Error('Email is already registered'); err.statusCode = 409; throw err;
  }

  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const hashed = await bcrypt.hash(password, rounds);
  const id     = uuidv4();

  await pool.execute(
    'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [id, name, email, hashed, role]
  );

  const [rows] = await pool.execute(
    'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [id]
  );
  return { user: rows[0], token: signToken(id) };
}

async function login({ email, password }) {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  const user   = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const err = new Error('Invalid email or password'); err.statusCode = 401; throw err;
  }
  if (user.status === 'inactive') {
    const err = new Error('Account is inactive. Contact an administrator.'); err.statusCode = 403; throw err;
  }

  const { password: _pw, ...safeUser } = user;
  return { user: safeUser, token: signToken(user.id) };
}

async function getMe(userId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [userId]
  );
  return rows[0];
}

module.exports = { register, login, getMe };
