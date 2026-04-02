const { getPool }     = require('../config/database');
const { v4: uuidv4 } = require('uuid');

function toDateStr(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : d;
}
function notFound() {
  const err = new Error('Transaction not found'); err.statusCode = 404; return err;
}

function buildWhere({ type, category, from, to, search }) {
  let where  = 'WHERE t.deleted_at IS NULL';
  const params = [];
  if (type)     { where += ' AND t.type = ?';           params.push(type); }
  if (category) { where += ' AND t.category = ?';       params.push(category); }
  if (from)     { where += ' AND t.date >= ?';           params.push(from); }
  if (to)       { where += ' AND t.date <= ?';           params.push(to); }
  if (search)   { where += ' AND t.description LIKE ?'; params.push('%' + search + '%'); }
  return { where, params };
}

async function create({ amount, type, category, date, description }, userId) {
  const pool = getPool();
  const id   = uuidv4();
  await pool.execute(
    'INSERT INTO transactions (id, amount, type, category, date, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, amount, type, category, toDateStr(date), description || null, userId]
  );
  return getById(id);
}

async function getAll({
  page = 1, limit = 20, type, category, from, to, search,
  sortBy = 'date', order = 'desc'
} = {}) {
  const pool   = getPool();
  const offset = (page - 1) * limit;
  const col    = ['date','amount','created_at','category'].includes(sortBy) ? sortBy : 'date';
  const dir    = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const { where, params } = buildWhere({ type, category, from, to, search });

  const [[{ cnt }]] = await pool.execute(
    `SELECT COUNT(*) as cnt FROM transactions t ${where}`, params
  );
  const total = Number(cnt);

  const [data] = await pool.execute(
    `SELECT t.*, u.name as created_by_name
     FROM transactions t JOIN users u ON t.created_by = u.id
     ${where} ORDER BY t.${col} ${dir}
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

async function getById(id) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT t.*, u.name as created_by_name
     FROM transactions t JOIN users u ON t.created_by = u.id
     WHERE t.id = ? AND t.deleted_at IS NULL`,
    [id]
  );
  if (!rows.length) throw notFound();
  return rows[0];
}

async function update(id, { amount, type, category, date, description }) {
  const pool = getPool();
  const [check] = await pool.execute(
    'SELECT id FROM transactions WHERE id = ? AND deleted_at IS NULL', [id]
  );
  if (!check.length) throw notFound();

  const sets = [], params = [];
  if (amount      !== undefined) { sets.push('amount = ?');      params.push(amount); }
  if (type        !== undefined) { sets.push('type = ?');        params.push(type); }
  if (category    !== undefined) { sets.push('category = ?');    params.push(category); }
  if (date        !== undefined) { sets.push('date = ?');        params.push(toDateStr(date)); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }

  if (!sets.length) return getById(id);
  params.push(id);
  await pool.execute(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`, params);
  return getById(id);
}

async function softDelete(id) {
  const pool = getPool();
  const [check] = await pool.execute(
    'SELECT id FROM transactions WHERE id = ? AND deleted_at IS NULL', [id]
  );
  if (!check.length) throw notFound();
  await pool.execute('UPDATE transactions SET deleted_at = NOW() WHERE id = ?', [id]);
}

module.exports = { create, getAll, getById, update, softDelete };
