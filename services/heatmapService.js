const { pubClient } = require('./redisPool'); // Import optional Redis client for caching.
const heatmapModel = require('../models/heatmapModel'); // Import heatmap persistence operations.

const CACHE_KEY = 'heatmap:zones'; // Use one stable Redis key for the latest heatmap zones.
const CACHE_TTL = 60; // Cache heatmap data for 60 seconds to reduce repeated aggregate queries.

class HeatmapService {
  async getHeatmapData(precision = 2) {
    if (pubClient) {
      const cached = await pubClient.get(CACHE_KEY); // Try Redis before running the aggregate query.
      if (cached) return JSON.parse(cached); // Return cached zones when available.
    }

    const rows = await heatmapModel.findDemandSupplyRows(precision); // Load demand and supply grouped by grid cell.
    const zones = rows.map((row) => this.formatHeatmapZone(row)); // Convert database rows into API-friendly zone objects.

    if (pubClient) {
      await pubClient.set(CACHE_KEY, JSON.stringify(zones), 'EX', CACHE_TTL); // Store zones briefly for polling clients.
    }

    return zones; // Return formatted heatmap data to the controller.
  }

  formatHeatmapZone(row) {
    const weight = parseInt(row.weight, 10); // Convert ride count from database value into a number.
    const drivers = parseInt(row.driver_count, 10); // Convert driver count from database value into a number.
    const ratio = weight / Math.max(drivers, 1); // Avoid divide-by-zero while calculating demand pressure.

    const demandLevel =
      weight >= 15 ? 'high' :
      weight >= 5 ? 'medium' : 'low'; // Convert raw demand count into a simple client label.

    const surgeMultiplier =
      ratio >= 5 ? 2.0 :
      ratio >= 3 ? 1.5 : 1.0; // Increase surge when demand significantly exceeds supply.

    return {
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      weight,
      driverCount: drivers,
      demandLevel,
      surgeMultiplier,
    }; // Return the normalized heatmap zone shape used by the API.
  }

  async invalidateCache() {
    if (pubClient) {
      await pubClient.del(CACHE_KEY); // Clear stale heatmap zones after seed data changes demand.
    }
  }

  async seedRides(count = 500, centerLat = 31.5204, centerLng = 74.3587) {
    if (count <= 0) return 0; // Skip database work when the requested seed count is zero or negative.

    const valueStrings = []; // Hold parameter placeholders for the bulk insert query.
    const params = []; // Hold all parameter values for the bulk insert query.

    for (let i = 0; i < count; i++) {
      const lat = centerLat + (Math.random() - 0.5) * 0.2; // Spread demo pickups around the center latitude.
      const lng = centerLng + (Math.random() - 0.5) * 0.2; // Spread demo pickups around the center longitude.
      const base = i * 6; // Calculate the first parameter index for this row.

      valueStrings.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      ); // Add placeholders for one ride row.
      params.push(1, lat, lng, lat + 0.01, lng + 0.01, 'completed'); // Add passenger, pickup, destination, and status values.
    }

    await heatmapModel.insertSeedRides(valueStrings, params); // Insert all generated rides through the model layer.
    await this.invalidateCache(); // Clear old cached heatmap data after changing ride demand.

    return count; // Return how many rides were inserted.
  }
}

module.exports = new HeatmapService(); // Export one service instance for controllers.
