const driverService = require('../services/driverService'); // Import driver business logic.

async function seedDriver(req, res) {
  try {
    const result = await driverService.seedDriver(); // Create the demo driver only if it does not already exist.
    return res.json({ success: true, driver: result.driver, seeded: result.seeded }); // Return the driver and whether seeding occurred.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/service failures.
  }
}

async function getOnlineDrivers(req, res) {
  try {
    const drivers = await driverService.getOnlineDrivers(); // Load all drivers currently marked online.
    return res.json({ success: true, drivers }); // Return online drivers to the client.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/service failures.
  }
}

async function updateDriverStatus(req, res) {
  try {
    const { status } = req.body; // Read the requested driver status from the body.
    const driver = await driverService.updateDriverStatus(req.params.id, status); // Update the selected driver's status.

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' }); // Return 404 when no driver matches the route ID.
    }

    return res.json({ success: true, driver }); // Return the updated driver row.
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message }); // Return a JSON error for database/service failures.
  }
}

module.exports = {
  seedDriver,
  getOnlineDrivers,
  updateDriverStatus,
}; // Export controller actions for driver routes.
