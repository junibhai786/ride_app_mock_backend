const express = require('express');
const router = express.Router();
const heatmapService = require('../services/heatmapService');

// Get heatmap aggregated data
router.get('/data', async (req, res) => {
    try {
        const precision = parseInt(req.query.precision) || 3;
        const data = await heatmapService.getHeatmapData(precision);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Seed dummy data for testing — single bulk INSERT, not 500 round-trips
router.post('/seed', async (req, res) => {
    try {
        // Karachi center (24.8607, 67.0011); override via ?lat=&lng=&count=
        const count = parseInt(req.query.count) || 500;
        const centerLat = parseFloat(req.query.lat) || 24.8607;
        const centerLng = parseFloat(req.query.lng) || 67.0011;
        await heatmapService.seedRides(count, centerLat, centerLng);
        res.json({ success: true, message: `Inserted ${count} dummy rides around (${centerLat}, ${centerLng})` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
