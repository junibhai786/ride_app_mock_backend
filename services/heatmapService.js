const db = require('./db');

/**
 * 2. Heatmap - Demand Zones
 * Goal: Show low to high demand zones on the map.
 * Scaling Strategy: Aggregation instead of direct DB hits for every raw point.
 */
class HeatmapService {
    /**
     * Aggregates pickup locations into grid cells (Heatmap Tiles).
     * Precision (grid size) can be adjusted based on zoom level.
     */
    async getHeatmapData(precision = 4) {
        // Rounding lat/lng to 'precision' decimal places creates a grid.
        // Count of rides in each grid cell determines the color/intensity.
        const query = `
            SELECT 
                ROUND(pickup_lat, $1) as lat, 
                ROUND(pickup_lng, $1) as lng, 
                COUNT(*) as weight
            FROM rides
            WHERE requested_at > NOW() - INTERVAL '24 hours'
            GROUP BY lat, lng
        `;
        
        const result = await db.query(query, [precision]);
        return result.rows;
    }

    /**
     * Bulk-insert N dummy rides around a city center for heatmap demo.
     * Single query instead of N round-trips — essential for 500 rows on mobile.
     */
    async seedRides(count = 500, centerLat = 24.8607, centerLng = 67.0011) {
        const valueStrings = [];
        const params = [];
        for (let i = 0; i < count; i++) {
            const lat = centerLat + (Math.random() - 0.5) * 0.2;
            const lng = centerLng + (Math.random() - 0.5) * 0.2;
            const base = i * 6;
            valueStrings.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
            params.push(1, lat, lng, lat + 0.01, lng + 0.01, 'completed');
        }
        await db.query(
            `INSERT INTO rides (passenger_id, pickup_lat, pickup_lng, destination_lat, destination_lng, status) VALUES ${valueStrings.join(',')}`,
            params
        );
        return count;
    }
}

module.exports = new HeatmapService();
