const db = require('../services/db'); // Use the shared PostgreSQL pool wrapper.

async function findByName(name) {
  const result = await db.query('SELECT * FROM drivers WHERE name = $1 LIMIT 1', [name]); // Look up an existing driver by name.
  return result.rows[0] || null; // Return one driver or null when none exists.
}

async function createSeedDriver() {
  const result = await db.query(
    "INSERT INTO drivers (name, status, last_lat, last_lng) VALUES ('Ahmed Ali', 'online', 31.5204, 74.3587) RETURNING *"
  ); // Insert the demo driver used by local testing and Postman examples.
  return result.rows[0]; // Return the newly inserted driver row.
}

async function countDrivers() {
  const result = await db.query('SELECT COUNT(*) FROM drivers'); // Count rows to decide whether seed data is needed.
  return parseInt(result.rows[0].count, 10); // Convert PostgreSQL's string count into a number.
}

async function findOnlineDrivers() {
  const result = await db.query("SELECT * FROM drivers WHERE status = 'online'"); // Fetch drivers currently available for rides.
  return result.rows; // Return all online driver rows.
}

async function updateStatus(id, status) {
  const result = await db.query(
    'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  ); // Update driver availability and refresh the updated_at timestamp.
  return result.rows[0] || null; // Return the updated driver or null when the ID does not exist.
}

module.exports = {
  findByName,
  createSeedDriver,
  countDrivers,
  findOnlineDrivers,
  updateStatus,
}; // Export all driver persistence operations for services.
