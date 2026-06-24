const db = require('./db');

/**
 * 3. inDrive-style Offer Fare / Bidding System
 * Goal: Prevent double-accept using PostgreSQL transactions + Row Locking.
 */
class RideService {
    /**
     * Driver sends an offer for a ride.
     */
    async placeBid(rideId, driverId, amount) {
        const query = `
            INSERT INTO bids (ride_id, driver_id, amount, status)
            VALUES ($1, $2, $3, 'pending')
            ON CONFLICT (ride_id, driver_id) DO UPDATE SET amount = $3
            RETURNING *
        `;
        const result = await db.query(query, [rideId, driverId, amount]);
        return result.rows[0];
    }

    /**
     * Accept a bid (Race Condition Critical).
     * Uses SELECT ... FOR UPDATE to lock the ride row during the transaction.
     */
    async acceptBid(rideId, bidId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Lock the ride row to prevent other drivers from accepting until this is done.
            // This is the core solution to the "double-accept" problem.
            const rideResult = await client.query(
                'SELECT * FROM rides WHERE id = $1 FOR UPDATE',
                [rideId]
            );
            
            const ride = rideResult.rows[0];
            if (!ride) throw new Error('Ride not found');
            if (ride.status !== 'pending') throw new Error('Ride already accepted or finished');

            // 2. Lock the specific bid
            const bidResult = await client.query(
                'SELECT * FROM bids WHERE id = $1 AND ride_id = $2 FOR UPDATE',
                [bidId, rideId]
            );
            const bid = bidResult.rows[0];
            if (!bid) throw new Error('Bid not found');

            // 3. Update ride status and assign driver
            await client.query(
                'UPDATE rides SET status = $1, driver_id = $2, accepted_at = NOW() WHERE id = $3',
                ['accepted', bid.driver_id, rideId]
            );

            // 4. Update the accepted bid status
            await client.query(
                'UPDATE bids SET status = $1 WHERE id = $2',
                ['accepted', bidId]
            );

            // 5. Reject all other bids for this ride
            await client.query(
                'UPDATE bids SET status = $1 WHERE ride_id = $2 AND id != $3',
                ['rejected', rideId, bidId]
            );

            await client.query('COMMIT');
            return { success: true, rideId, driverId: bid.driver_id };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getRide(rideId) {
        const result = await db.query('SELECT * FROM rides WHERE id = $1', [rideId]);
        return result.rows[0] || null;
    }

    async getBids(rideId) {
        const result = await db.query(
            'SELECT * FROM bids WHERE ride_id = $1 ORDER BY amount ASC',
            [rideId]
        );
        return result.rows;
    }

    /**
     * Create a new ride request
     */
    async createRide(passengerId, pickup, destination) {
        const query = `
            INSERT INTO rides (passenger_id, pickup_lat, pickup_lng, destination_lat, destination_lng, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
        `;
        const result = await db.query(query, [passengerId, pickup.lat, pickup.lng, destination.lat, destination.lng]);
        return result.rows[0];
    }
}

module.exports = new RideService();
