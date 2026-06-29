const db = require('./db'); // Import the shared PostgreSQL pool for transaction control.
const rideModel = require('../models/rideModel'); // Import ride persistence operations.
const bidModel = require('../models/bidModel'); // Import bid persistence operations.

class RideService {
  async placeBid(rideId, driverId, amount) {
    return bidModel.upsertBid(rideId, driverId, amount); // Save or update a driver's bid for the ride.
  }

  async acceptBid(rideId, bidId) {
    const client = await db.pool.connect(); // Borrow a dedicated client so every query uses the same transaction.

    try {
      await client.query('BEGIN'); // Start a transaction before locking ride and bid rows.

      const ride = await rideModel.findByIdForUpdate(client, rideId); // Lock the ride row to prevent double acceptance.
      if (!ride) throw new Error('Ride not found'); // Stop when the ride does not exist.
      if (ride.status !== 'pending') throw new Error('Ride already accepted or finished'); // Stop when another accept already won.

      const bid = await bidModel.findByIdForUpdate(client, bidId, rideId); // Lock the chosen bid inside the same transaction.
      if (!bid) throw new Error('Bid not found'); // Stop when the bid does not belong to this ride.

      await rideModel.acceptRide(client, rideId, bid.driver_id); // Assign the ride to the bid's driver.
      await bidModel.markAccepted(client, bidId); // Mark the selected bid as accepted.
      await bidModel.rejectOtherBids(client, rideId, bidId); // Mark all competing bids as rejected.

      await client.query('COMMIT'); // Commit all state changes atomically.
      return { success: true, rideId, driverId: bid.driver_id }; // Return the winning assignment.
    } catch (error) {
      await client.query('ROLLBACK'); // Undo partial changes when any step fails.
      throw error; // Let the controller convert the business error to HTTP JSON.
    } finally {
      client.release(); // Return the database client to the pool.
    }
  }

  async getRide(rideId) {
    return rideModel.findById(rideId); // Load one ride through the model layer.
  }

  async getBids(rideId) {
    return bidModel.findByRideId(rideId); // Load all bids through the model layer.
  }

  async createRide(passengerId, pickup, destination) {
    return rideModel.createRide(passengerId, pickup, destination); // Create a pending ride through the model layer.
  }
}

module.exports = new RideService(); // Export one service instance for controllers.
