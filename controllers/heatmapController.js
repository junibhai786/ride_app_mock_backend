const heatmapService = require('../services/heatmapService'); // Import heatmap business logic.

async function getHeatmapData(req, res) {
  try {
    const precision = parseInt(req.query.precision, 10) || 2; // Read grid precision from the query string, defaulting to city-level cells.
    const data = await heatmapService.getHeatmapData(precision); // Load formatted demand/supply heatmap zones.
    return res.json({ success: true, data }); // Return heatmap zones to the client.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/cache failures.
  }
}

async function seedRides(req, res) {
  try {
    const count = parseInt(req.query.count, 10) || 500; // Read requested seed count, defaulting to 500 demo rides.
    const centerLat = parseFloat(req.query.lat) || 24.8607; // Read seed center latitude, defaulting to Karachi.
    const centerLng = parseFloat(req.query.lng) || 67.0011; // Read seed center longitude, defaulting to Karachi.

    await heatmapService.seedRides(count, centerLat, centerLng); // Insert demo rides around the chosen center.

    return res.json({
      success: true,
      message: `Inserted ${count} dummy rides around (${centerLat}, ${centerLng})`,
    }); // Return a clear seed result message.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/cache failures.
  }
}

module.exports = {
  getHeatmapData,
  seedRides,
}; // Export controller actions for heatmap routes.
