const express = require('express'); // Import Express to create a scoped router.
const driverController = require('../controllers/driverController'); // Import driver controller actions.

const router = express.Router(); // Create a router for /api/drivers endpoints.

router.post('/seed', driverController.seedDriver); // Seed the demo driver idempotently.
router.get('/online', driverController.getOnlineDrivers); // Return all online drivers.
router.patch('/:id/status', driverController.updateDriverStatus); // Update one driver's online/offline status.

module.exports = router; // Export the router so config/app can mount it.
