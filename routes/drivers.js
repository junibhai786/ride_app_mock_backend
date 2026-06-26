const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Seed test driver (idempotent)
router.post('/seed', async (req, res) => {
  try {
    const existing = await db.query("SELECT * FROM drivers WHERE name = 'Ahmed Ali' LIMIT 1");
    if (existing.rows.length > 0) {
      return res.json({ success: true, driver: existing.rows[0], seeded: false });
    }
    const result = await db.query(
      "INSERT INTO drivers (name, status, last_lat, last_lng) VALUES ('Ahmed Ali', 'online', 31.5204, 74.3587) RETURNING *"
    );
    res.json({ success: true, driver: result.rows[0], seeded: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all online drivers
router.get('/online', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM drivers WHERE status = 'online'");
    res.json({ success: true, drivers: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update driver online/offline status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      "UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, driver: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
