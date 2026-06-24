const express = require('express');
const router = express.Router();
const rideService = require('../services/rideService');

// Create a ride request
router.post('/request', async (req, res) => {
    const { passengerId, pickup, destination } = req.body;
    if (!passengerId || !pickup?.lat || !pickup?.lng || !destination?.lat || !destination?.lng) {
        return res.status(400).json({ success: false, message: 'passengerId, pickup {lat,lng}, destination {lat,lng} are required' });
    }
    try {
        const ride = await rideService.createRide(passengerId, pickup, destination);
        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get a ride + its current status
router.get('/:rideId', async (req, res) => {
    try {
        const ride = await rideService.getRide(req.params.rideId);
        if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all bids for a ride (mobile polls this to show offer list)
router.get('/:rideId/bids', async (req, res) => {
    try {
        const bids = await rideService.getBids(req.params.rideId);
        res.json({ success: true, bids });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Driver places a bid
router.post('/:rideId/bid', async (req, res) => {
    const { driverId, amount } = req.body;
    if (!driverId || !amount) {
        return res.status(400).json({ success: false, message: 'driverId and amount are required' });
    }
    try {
        const bid = await rideService.placeBid(req.params.rideId, driverId, amount);
        res.json({ success: true, bid });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Passenger accepts a bid — race condition prevented via SELECT FOR UPDATE
router.post('/:rideId/accept-bid', async (req, res) => {
    const { bidId } = req.body;
    if (!bidId) {
        return res.status(400).json({ success: false, message: 'bidId is required' });
    }
    try {
        const result = await rideService.acceptBid(req.params.rideId, bidId);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
