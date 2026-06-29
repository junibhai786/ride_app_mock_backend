const rideService = require('../services/rideService'); // Import ride and bidding business logic.

async function createRide(req, res) {
  const { passengerId, pickup, destination } = req.body; // Read ride request data from the JSON body.

  if (!passengerId || pickup?.lat == null || pickup?.lng == null || destination?.lat == null || destination?.lng == null) {
    return res.status(400).json({ success: false, message: 'passengerId, pickup {lat,lng}, destination {lat,lng} are required' }); // Reject incomplete ride requests.
  }

  try {
    const ride = await rideService.createRide(passengerId, pickup, destination); // Create the ride through the service layer.
    return res.json({ success: true, ride }); // Return the created ride to the client.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/service failures.
  }
}

async function getRide(req, res) {
  try {
    const ride = await rideService.getRide(req.params.rideId); // Load the ride matching the route parameter.

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' }); // Return 404 when the ride ID does not exist.
    }

    return res.json({ success: true, ride }); // Return the ride and its current status.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/service failures.
  }
}

async function getRideBids(req, res) {
  try {
    const bids = await rideService.getBids(req.params.rideId); // Load all bids for this ride.
    return res.json({ success: true, bids }); // Return the bid list for polling clients.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/service failures.
  }
}

async function placeBid(req, res) {
  const { driverId, amount } = req.body; // Read bid input from the request body.

  if (!driverId || !amount) {
    return res.status(400).json({ success: false, message: 'driverId and amount are required' }); // Reject incomplete bid requests.
  }

  try {
    const bid = await rideService.placeBid(req.params.rideId, driverId, amount); // Create or update the driver's bid.
    return res.json({ success: true, bid }); // Return the saved bid to the client.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/service failures.
  }
}

async function acceptBid(req, res) {
  const { bidId } = req.body; // Read the bid selected by the passenger.

  if (!bidId) {
    return res.status(400).json({ success: false, message: 'bidId is required' }); // Reject accept requests without a bid ID.
  }

  try {
    const result = await rideService.acceptBid(req.params.rideId, bidId); // Accept the bid using transaction-safe service logic.
    return res.json({ success: true, ...result }); // Return the accepted ride/driver identifiers.
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message }); // Return business-rule failures as client errors.
  }
}

module.exports = {
  createRide,
  getRide,
  getRideBids,
  placeBid,
  acceptBid,
}; // Export controller actions for ride routes.
