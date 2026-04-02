const { getPool } = require('../config/database');

async function getSummary() {
  const pool = getPool();

  const [[{ total_income }]] = await pool.execute(
    "SELECT COALESCE(SUM(amount), 0) as total_income FROM transactions WHERE type='income' AND deleted_at IS NULL"
  );
  const [[{ total_expenses }]] = await pool.execute(
    "SELECT COALESCE(SUM(amount), 0) as total_expenses FROM transactions WHERE type='expense' AND deleted_at IS NULL"
  );
  const [[{ total_transactions }]] = await pool.execute(
    'SELECT COUNT(*) as total_transactions FROM transactions WHERE deleted_at IS NULL'
  );

  const inc = parseFloat(total_income  || 0);
  const exp = parseFloat(total_expenses || 0);
  return {
    total_income:       +inc.toFixed(2),
    total_expenses:     +exp.toFixed(2),
    net_balance:        +(inc - exp).toFixed(2),
    total_transactions: Number(total_transactions),
  };
}

async function getCategoryTotals({ type } = {}) {
  const pool = getPool();
  let sql = `
    SELECT category, type, ROUND(SUM(amount), 2) as total, COUNT(*) as count
    FROM transactions WHERE deleted_at IS NULL
  `;
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' GROUP BY category, type ORDER BY total DESC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getRecentActivity(limit = 10) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT t.id, t.amount, t.type, t.category, t.date, t.description,
            u.name as created_by_name, t.created_at
     FROM transactions t JOIN users u ON t.created_by = u.id
     WHERE t.deleted_at IS NULL
     ORDER BY t.created_at DESC LIMIT ?`,
    [limit]
  );
  return rows;
}

async function getMonthlyTrends({ months = 12 } = {}) {
  const pool = getPool();

  // Calculate cutoff date in JS — avoids INTERVAL ? MONTH in prepared statements
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(date, '%Y-%m') as month, type,
            ROUND(SUM(amount), 2) as total, COUNT(*) as count
     FROM transactions
     WHERE deleted_at IS NULL AND date >= ?
     GROUP BY month, type
     ORDER BY month ASC`,
    [cutoffStr]
  );

  const map = {};
  for (const r of rows) {
    if (!map[r.month]) map[r.month] = { month: r.month, income: 0, expenses: 0 };
    if (r.type === 'income')  map[r.month].income   = parseFloat(r.total);
    if (r.type === 'expense') map[r.month].expenses = parseFloat(r.total);
  }
  return Object.values(map).map(m => ({
    ...m,
    net: +(m.income - m.expenses).toFixed(2),
  }));
}

async function getWeeklyTrends({ weeks = 8 } = {}) {
  const pool = getPool();

  // Calculate cutoff date in JS — avoids INTERVAL ? DAY in prepared statements
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (weeks * 7));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(date, '%x-W%v') as week, type,
            ROUND(SUM(amount), 2) as total, COUNT(*) as count
     FROM transactions
     WHERE deleted_at IS NULL AND date >= ?
     GROUP BY week, type
     ORDER BY week ASC`,
    [cutoffStr]
  );

  const map = {};
  for (const r of rows) {
    if (!map[r.week]) map[r.week] = { week: r.week, income: 0, expenses: 0 };
    if (r.type === 'income')  map[r.week].income   = parseFloat(r.total);
    if (r.type === 'expense') map[r.week].expenses = parseFloat(r.total);
  }
  return Object.values(map).map(w => ({
    ...w,
    net: +(w.income - w.expenses).toFixed(2),
  }));
}

module.exports = { getSummary, getCategoryTotals, getRecentActivity, getMonthlyTrends, getWeeklyTrends };
