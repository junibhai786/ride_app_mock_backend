const db = require('../services/db'); // Use shared database access for bid queries.

async function upsertBid(rideId, driverId, amount) {
  const query = `
    INSERT INTO bids (ride_id, driver_id, amount, status)
    VALUES ($1, $2, $3, 'pending')
    ON CONFLICT (ride_id, driver_id) DO UPDATE SET amount = $3
    RETURNING *
  `; // Create a new bid or update the same driver's existing bid for the ride.
  const result = await db.query(query, [rideId, driverId, amount]); // Execute the upsert with safe parameters.
  return result.rows[0]; // Return the inserted or updated bid.
}

async function findByRideId(rideId) {
  const result = await db.query(
    'SELECT * FROM bids WHERE ride_id = $1 ORDER BY amount ASC',
    [rideId]
  ); // List bids from cheapest to highest for passenger offer selection.
  return result.rows; // Return all bids for the ride.
}

async function findByIdForUpdate(client, bidId, rideId) {
  const result = await client.query(
    'SELECT * FROM bids WHERE id = $1 AND ride_id = $2 FOR UPDATE',
    [bidId, rideId]
  ); // Lock the selected bid during acceptance so its state cannot change mid-transaction.
  return result.rows[0] || null; // Return the locked bid or null when missing.
}

async function markAccepted(client, bidId) {
  await client.query('UPDATE bids SET status = $1 WHERE id = $2', ['accepted', bidId]); // Mark the winning bid as accepted.
}

async function rejectOtherBids(client, rideId, acceptedBidId) {
  await client.query(
    'UPDATE bids SET status = $1 WHERE ride_id = $2 AND id != $3',
    ['rejected', rideId, acceptedBidId]
  ); // Reject all losing bids once the passenger accepts one offer.
}

module.exports = {
  upsertBid,
  findByRideId,
  findByIdForUpdate,
  markAccepted,
  rejectOtherBids,
}; // Export bid model methods for ride service orchestration.
