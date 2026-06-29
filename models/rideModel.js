const db = require('../services/db'); // Use the shared PostgreSQL helper for ride queries.

async function createRide(passengerId, pickup, destination) {
  const query = `
    INSERT INTO rides (passenger_id, pickup_lat, pickup_lng, destination_lat, destination_lng, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING *
  `; // Insert a pending ride request with pickup and destination coordinates.
  const result = await db.query(query, [passengerId, pickup.lat, pickup.lng, destination.lat, destination.lng]); // Execute the insert with parameterized values.
  return result.rows[0]; // Return the created ride row.
}

async function findById(rideId) {
  const result = await db.query('SELECT * FROM rides WHERE id = $1', [rideId]); // Fetch one ride by its primary key.
  return result.rows[0] || null; // Normalize missing rides to null for controllers.
}

async function findByIdForUpdate(client, rideId) {
  const result = await client.query('SELECT * FROM rides WHERE id = $1 FOR UPDATE', [rideId]); // Lock the ride row inside a transaction.
  return result.rows[0] || null; // Return the locked ride or null when missing.
}

async function acceptRide(client, rideId, driverId) {
  await client.query(
    'UPDATE rides SET status = $1, driver_id = $2, accepted_at = NOW() WHERE id = $3',
    ['accepted', driverId, rideId]
  ); // Mark the ride accepted and attach the winning driver.
}

module.exports = {
  createRide,
  findById,
  findByIdForUpdate,
  acceptRide,
}; // Export ride model methods for ride service business logic.
