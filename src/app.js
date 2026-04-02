require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const transactionRoutes = require('./routes/transactions.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});
app.use(globalLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

async function main() {
  await initializeDatabase();
  app.listen(PORT, () =>
    console.log('\n  Finance Backend running on http://localhost:' + PORT + '\n')
  );
}

main().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;
