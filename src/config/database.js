const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'finance_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
    });
  }
  return pool;
}

async function initializeDatabase() {
  const dbName = process.env.DB_NAME || 'finance_db';

  const bootstrap = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await bootstrap.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await bootstrap.end();

  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('viewer','analyst','admin') NOT NULL DEFAULT 'viewer',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(36) PRIMARY KEY,
      amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
      type ENUM('income','expense') NOT NULL,
      category VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      created_by VARCHAR(36) NOT NULL,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tx_type (type),
      INDEX idx_tx_category (category),
      INDEX idx_tx_date (date),
      INDEX idx_tx_deleted (deleted_at),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Seed default admin if table is empty
  const [[{ cnt }]] = await pool.execute('SELECT COUNT(*) as cnt FROM users');
  if (Number(cnt) === 0) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const password = await bcrypt.hash('Admin@1234', rounds);
    await pool.execute(
      'INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), 'System Admin', 'admin@finance.local', password, 'admin', 'active']
    );
    console.log('[DB] Default admin seeded → admin@finance.local / Admin@1234');
  }

  console.log('[DB] MySQL database ready:', dbName);
}

module.exports = { getPool, initializeDatabase };