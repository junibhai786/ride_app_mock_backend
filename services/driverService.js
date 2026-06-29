const driverModel = require('../models/driverModel'); // Import driver persistence operations.

async function seedDriver() {
  const existing = await driverModel.findByName('Ahmed Ali'); // Check whether the demo driver already exists.
  if (existing) {
    return { driver: existing, seeded: false }; // Return the existing row and show that no insert happened.
  }

  const driver = await driverModel.createSeedDriver(); // Insert the demo driver when it is missing.
  return { driver, seeded: true }; // Return the created row and seed flag.
}

async function getOnlineDrivers() {
  return driverModel.findOnlineDrivers(); // Delegate the online-driver query to the model layer.
}

async function updateDriverStatus(id, status) {
  return driverModel.updateStatus(id, status); // Delegate status persistence to the model layer.
}

async function seedInitialDriverIfEmpty() {
  const totalDrivers = await driverModel.countDrivers(); // Count existing drivers before seeding app startup data.
  if (totalDrivers > 0) return false; // Skip seeding when the table already contains data.

  await driverModel.createSeedDriver(); // Insert a default online driver for demos and tests.
  return true; // Report that seeding happened.
}

module.exports = {
  seedDriver,
  getOnlineDrivers,
  updateDriverStatus,
  seedInitialDriverIfEmpty,
}; // Export driver business operations for controllers and migrations.
