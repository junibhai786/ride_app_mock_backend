const db = require('../services/db'); // Use the shared PostgreSQL helper for schema setup.
const driverService = require('../services/driverService'); // Use driver service to keep seed logic out of this file.

async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'offline',
      last_lat DECIMAL(9,6),
      last_lng DECIMAL(9,6),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rides (
      id SERIAL PRIMARY KEY,
      passenger_id INTEGER NOT NULL,
      driver_id INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      pickup_lat DECIMAL(9,6) NOT NULL,
      pickup_lng DECIMAL(9,6) NOT NULL,
      destination_lat DECIMAL(9,6) NOT NULL,
      destination_lng DECIMAL(9,6) NOT NULL,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      ride_id INTEGER REFERENCES rides(id),
      driver_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(ride_id, driver_id)
    );
    CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides(requested_at);
    CREATE INDEX IF NOT EXISTS idx_rides_pickup ON rides(pickup_lat, pickup_lng);
    CREATE INDEX IF NOT EXISTS idx_bids_ride_id ON bids(ride_id);
  `); // Create required tables and indexes when they are missing.

  const seeded = await driverService.seedInitialDriverIfEmpty(); // Seed a demo driver only for an empty drivers table.
  if (seeded) {
    console.log('Seeded test driver: Ahmed Ali (ID: 1, phone: 03001234567)'); // Log seed visibility for local/deploy startup.
  }

  console.log('Database migrations applied'); // Confirm schema setup completed.
}

module.exports = runMigrations; // Export migration runner for server startup.
