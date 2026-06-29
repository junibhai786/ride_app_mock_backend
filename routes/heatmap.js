const express = require('express'); // Import Express to create a scoped router.
const heatmapController = require('../controllers/heatmapController'); // Import heatmap controller actions.

const router = express.Router(); // Create a router for /api/heatmap endpoints.

router.get('/data', heatmapController.getHeatmapData); // Return aggregated heatmap demand/supply data.
router.post('/seed', heatmapController.seedRides); // Insert demo ride data for testing heatmap output.

module.exports = router; // Export the router so config/app can mount it.
