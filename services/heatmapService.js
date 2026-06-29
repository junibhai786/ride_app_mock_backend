const db = require('./db');
const { pubClient } = require('./redisPool');

const CACHE_KEY = 'heatmap:zones';
const CACHE_TTL = 60; // seconds — DB aggregate is cheap but no reason to recompute every poll

class HeatmapService {
  // precision=2 → ROUND to 2 decimal places ≈ 1.1 km grid cells.
  // Demand  = ride requests in the last 24 h per cell.
  // Supply  = online drivers whose last_lat/last_lng falls in the same cell.
  // Surge kicks in when demand >> supply (ratio ≥ 3 → 1.5×, ≥ 5 → 2.0×).
  async getHeatmapData(precision = 2) {
    // Serve from Redis cache when available — avoids hitting Postgres on every 30-second poll.
    if (pubClient) {
      const cached = await pubClient.get(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }

    // Two CTEs: aggregate demand and supply independently, then LEFT JOIN on the grid cell.
    // This is O(rides + drivers) with two sequential scans + indexed GROUP BY — far cheaper
    // than a correlated subquery that would scan drivers once per demand row.
    const { rows } = await db.query(`
      WITH demand AS (
        SELECT
          ROUND(pickup_lat::numeric, $1)  AS lat,
          ROUND(pickup_lng::numeric, $1)  AS lng,
          COUNT(*)::int                   AS weight
        FROM rides
        WHERE requested_at > NOW() - INTERVAL '24 hours'
        GROUP BY 1, 2
      ),
      supply AS (
        SELECT
          ROUND(last_lat::numeric, $1)    AS lat,
          ROUND(last_lng::numeric, $1)    AS lng,
          COUNT(*)::int                   AS driver_count
        FROM drivers
        WHERE status = 'online'
          AND last_lat  IS NOT NULL
          AND last_lng  IS NOT NULL
        GROUP BY 1, 2
      )
      SELECT
        d.lat,
        d.lng,
        d.weight,
        COALESCE(s.driver_count, 0) AS driver_count
      FROM demand d
      LEFT JOIN supply s ON d.lat = s.lat AND d.lng = s.lng
      ORDER BY d.weight DESC
    `, [precision]);

    const zones = rows.map(row => {
      const weight  = parseInt(row.weight);
      const drivers = parseInt(row.driver_count);
      const ratio   = weight / Math.max(drivers, 1);

      const demandLevel =
        weight >= 15 ? 'high' :
        weight >= 5  ? 'medium' : 'low';

      const surgeMultiplier =
        ratio >= 5 ? 2.0 :
        ratio >= 3 ? 1.5 : 1.0;

      return {
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        weight,
        driverCount: drivers,
        demandLevel,
        surgeMultiplier,
      };
    });

    if (pubClient) {
      await pubClient.set(CACHE_KEY, JSON.stringify(zones), 'EX', CACHE_TTL);
    }

    return zones;
  }

  async invalidateCache() {
    if (pubClient) {
      await pubClient.del(CACHE_KEY);
    }
  }

  // Bulk-insert N dummy rides around a city center for demo.
  // Single query — not N round-trips.  Default center is Lahore (matches the seeded driver).
  async seedRides(count = 500, centerLat = 31.5204, centerLng = 74.3587) {
    const valueStrings = [];
    const params = [];
    for (let i = 0; i < count; i++) {
      const lat  = centerLat + (Math.random() - 0.5) * 0.2;
      const lng  = centerLng + (Math.random() - 0.5) * 0.2;
      const base = i * 6;
      valueStrings.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      );
      params.push(1, lat, lng, lat + 0.01, lng + 0.01, 'completed');
    }
    await db.query(
      `INSERT INTO rides
         (passenger_id, pickup_lat, pickup_lng, destination_lat, destination_lng, status)
       VALUES ${valueStrings.join(',')}`,
      params
    );
    await this.invalidateCache();
    return count;
  }
}

module.exports = new HeatmapService();
