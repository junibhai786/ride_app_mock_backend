const express = require('express'); // Import Express to create a scoped router.
const rideController = require('../controllers/rideController'); // Import ride controller actions.

const router = express.Router(); // Create a router for /api/rides endpoints.

router.post('/request', rideController.createRide); // Create a new passenger ride request.
router.get('/:rideId', rideController.getRide); // Read one ride and its current status.
router.get('/:rideId/bids', rideController.getRideBids); // List all bids for a ride.
router.post('/:rideId/bid', rideController.placeBid); // Allow a driver to place or update a bid.
router.post('/:rideId/accept-bid', rideController.acceptBid); // Accept one bid with transaction-safe service logic.

module.exports = router; // Export the router so config/app can mount it.
