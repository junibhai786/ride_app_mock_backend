function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' }); // Return one consistent JSON shape for unknown routes.
}

module.exports = notFound; // Export the 404 middleware for app setup.
