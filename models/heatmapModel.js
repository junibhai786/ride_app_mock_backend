const db = require('../services/db'); // Use shared database access for heatmap reads/writes.

async function findDemandSupplyRows(precision) {
  const { rows } = await db.query(`
    WITH demand AS (
      SELECT
        ROUND(pickup_lat::numeric, $1) AS lat,
        ROUND(pickup_lng::numeric, $1) AS lng,
        COUNT(*)::int AS weight
      FROM rides
      WHERE requested_at > NOW() - INTERVAL '24 hours'
      GROUP BY 1, 2
    ),
    supply AS (
      SELECT
        ROUND(last_lat::numeric, $1) AS lat,
        ROUND(last_lng::numeric, $1) AS lng,
        COUNT(*)::int AS driver_count
      FROM drivers
      WHERE status = 'online'
        AND last_lat IS NOT NULL
        AND last_lng IS NOT NULL
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
  `, [precision]); // Aggregate ride demand and online driver supply into matching map grid cells.

  return rows; // Return raw aggregate rows for service-level formatting.
}

async function insertSeedRides(valueStrings, params) {
  await db.query(
    `INSERT INTO rides
       (passenger_id, pickup_lat, pickup_lng, destination_lat, destination_lng, status)
     VALUES ${valueStrings.join(',')}`,
    params
  ); // Bulk insert demo rides in a single database round trip.
}

module.exports = {
  findDemandSupplyRows,
  insertSeedRides,
}; // Export heatmap persistence helpers for the service layer.
