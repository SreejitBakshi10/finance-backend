const { getPool } = require('../config/database');

const SAFE_COLS = 'id, name, email, role, status, created_at, updated_at';

function notFound() {
  const err = new Error('User not found'); err.statusCode = 404; return err;
}

async function getAll({ page = 1, limit = 20, role, status, search } = {}) {
  const pool   = getPool();
  const offset = (page - 1) * limit;
  let where    = 'WHERE 1=1';
  const params = [];

  if (role)   { where += ' AND role = ?';   params.push(role); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [[{ cnt }]] = await pool.execute(
    `SELECT COUNT(*) as cnt FROM users ${where}`, params
  );
  const total = Number(cnt);

  const [data] = await pool.execute(
    `SELECT ${SAFE_COLS} FROM users ${where}
     ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

async function getById(id) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT ${SAFE_COLS} FROM users WHERE id = ?`, [id]
  );
  if (!rows.length) throw notFound();
  return rows[0];
}

async function update(id, { name, email }) {
  const pool = getPool();
  const [check] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) throw notFound();

  if (email) {
    const [clash] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?', [email, id]
    );
    if (clash.length) { const err = new Error('Email already in use'); err.statusCode = 409; throw err; }
  }

  const sets = [], params = [];
  if (name)  { sets.push('name = ?');  params.push(name); }
  if (email) { sets.push('email = ?'); params.push(email); }
  if (!sets.length) return getById(id);

  params.push(id);
  await pool.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  return getById(id);
}

async function updateRole(id, role) {
  const pool = getPool();
  const [check] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) throw notFound();
  await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  return getById(id);
}

async function updateStatus(id, status) {
  const pool = getPool();
  const [check] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) throw notFound();
  await pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  return getById(id);
}

async function remove(id, requesterId) {
  if (id === requesterId) {
    const err = new Error('You cannot delete your own account'); err.statusCode = 400; throw err;
  }
  const pool = getPool();
  const [check] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) throw notFound();
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
}

module.exports = { getAll, getById, update, updateRole, updateStatus, remove };
