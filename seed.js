require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function randomBetween(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPastDate(maxDaysAgo = 365) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * maxDaysAgo));
  return d.toISOString().slice(0, 10);
}

const INCOME_ENTRIES = [
  { category: 'salary', minAmt: 45000, maxAmt: 55000, description: 'Monthly salary' },
  { category: 'freelance', minAmt: 5000, maxAmt: 20000, description: 'Freelance project payment' },
  { category: 'investment', minAmt: 1000, maxAmt: 8000, description: 'Dividend income' },
  { category: 'freelance', minAmt: 3000, maxAmt: 12000, description: 'Consulting fee' },
];

const EXPENSE_ENTRIES = [
  { category: 'food', minAmt: 200, maxAmt: 800, description: 'Grocery shopping' },
  { category: 'food', minAmt: 100, maxAmt: 400, description: 'Restaurant dining' },
  { category: 'utilities', minAmt: 1500, maxAmt: 3000, description: 'Electricity bill' },
  { category: 'utilities', minAmt: 500, maxAmt: 1200, description: 'Internet & phone bill' },
  { category: 'transport', minAmt: 300, maxAmt: 1500, description: 'Fuel expenses' },
  { category: 'transport', minAmt: 200, maxAmt: 600, description: 'Cab & auto fares' },
  { category: 'entertainment', minAmt: 500, maxAmt: 2000, description: 'OTT subscriptions & movies' },
  { category: 'healthcare', minAmt: 500, maxAmt: 5000, description: 'Medical consultation' },
  { category: 'healthcare', minAmt: 200, maxAmt: 1500, description: 'Pharmacy' },
  { category: 'education', minAmt: 1000, maxAmt: 6000, description: 'Online course fee' },
  { category: 'other', minAmt: 500, maxAmt: 3000, description: 'Miscellaneous expense' },
];

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'finance_db',
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

    const users = [
      { id: uuidv4(), name: 'Priya Analyst', email: 'priya@finance.local', role: 'analyst', status: 'active' },
      { id: uuidv4(), name: 'Ravi Viewer', email: 'ravi@finance.local', role: 'viewer', status: 'active' },
    ];

    for (const u of users) {
      const [exists] = await pool.execute('SELECT id FROM users WHERE email = ?', [u.email]);
      if (exists.length) {
        console.log(`  skip  ${u.email} (already exists)`);
        continue;
      }
      const hashed = await bcrypt.hash('Demo@1234', rounds);
      await pool.execute(
        'INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, hashed, u.role, u.status]
      );
      console.log(`  created  ${u.role.padEnd(8)} ${u.email}`);
    }

    const [allUsers] = await pool.execute("SELECT id FROM users WHERE status = 'active'");
    const userIds = allUsers.map(r => r.id);

    const [[{ cnt }]] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM transactions WHERE deleted_at IS NULL'
    );
    if (Number(cnt) > 0) {
      console.log(`\n  transactions table already has ${cnt} rows — skipping transaction seed.`);
      console.log('  (Drop transactions rows manually if you want a fresh seed.)');
      await pool.end();
      return;
    }

    const txRows = [];

    for (let m = 11; m >= 0; m--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - m);
      txRows.push({
        id: uuidv4(), amount: randomBetween(45000, 52000), type: 'income',
        category: 'salary', date: d.toISOString().slice(0, 10),
        description: 'Monthly salary', created_by: randomItem(userIds),
      });
    }

    for (let i = 0; i < 50; i++) {
      const tmpl = randomItem(INCOME_ENTRIES);
      txRows.push({
        id: uuidv4(), amount: randomBetween(tmpl.minAmt, tmpl.maxAmt),
        type: 'income', category: tmpl.category,
        date: randomPastDate(365), description: tmpl.description,
        created_by: randomItem(userIds),
      });
    }

    for (let i = 0; i < 70; i++) {
      const tmpl = randomItem(EXPENSE_ENTRIES);
      txRows.push({
        id: uuidv4(), amount: randomBetween(tmpl.minAmt, tmpl.maxAmt),
        type: 'expense', category: tmpl.category,
        date: randomPastDate(365), description: tmpl.description,
        created_by: randomItem(userIds),
      });
    }

    for (let i = 0; i < 5; i++) {
      const tmpl = randomItem(EXPENSE_ENTRIES);
      txRows.push({
        id: uuidv4(), amount: randomBetween(tmpl.minAmt, tmpl.maxAmt),
        type: 'expense', category: tmpl.category,
        date: randomPastDate(180), description: `[deleted] ${tmpl.description}`,
        created_by: randomItem(userIds), deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
    }

    for (const tx of txRows) {
      await pool.execute(
        `INSERT INTO transactions (id, amount, type, category, date, description, created_by, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, tx.amount, tx.type, tx.category, tx.date,
        tx.description, tx.created_by, tx.deleted_at || null]
      );
    }

    const live = txRows.filter(t => !t.deleted_at).length;
    const deleted = txRows.filter(t => t.deleted_at).length;
    console.log(`\n  inserted  ${live} active transactions`);
    console.log(`  inserted  ${deleted} soft-deleted transactions (for testing)`);

    console.log('\nSeed complete.\n');
    console.log('  Credentials:');
    console.log('  admin@finance.local   Admin@1234  (role: admin)');
    console.log('  priya@finance.local   Demo@1234   (role: analyst)');
    console.log('  ravi@finance.local    Demo@1234   (role: viewer)\n');

  } finally {
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});