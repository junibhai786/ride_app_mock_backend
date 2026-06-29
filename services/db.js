const { Pool } = require('pg');
const env = require('../config/env'); // Use the central env module so dotenv is loaded once.

const pool = new Pool({
  connectionString: env.databaseUrl, // Connect to the configured PostgreSQL database.
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false, // Enable Railway/production SSL without local SSL friction.
});

module.exports = {
  query: (text, params) => pool.query(text, params), // Expose a simple query helper for model files.
  pool, // Expose the pool for transaction clients in services.
};
