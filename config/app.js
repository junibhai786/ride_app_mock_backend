const express = require('express'); // Import Express to create the HTTP application.
const cors = require('cors'); // Import CORS so mobile/web clients can call the API.
const otpRoutes = require('../routes/otp'); // Import OTP endpoint definitions.
const heatmapRoutes = require('../routes/heatmap'); // Import heatmap endpoint definitions.
const ridesRoutes = require('../routes/rides'); // Import ride endpoint definitions.
const driversRoutes = require('../routes/drivers'); // Import driver endpoint definitions.
const requestLogger = require('../middleware/requestLogger'); // Import centralized response logging middleware.
const { otpLimiter } = require('../middleware/rateLimiters'); // Import OTP-specific rate limiting middleware.
const notFound = require('../middleware/notFound'); // Import centralized 404 handler.

function createApp() {
  const app = express(); // Create a new Express app instance.

  app.set('trust proxy', 1); // Trust the Railway/proxy IP so rate limiting sees the real client IP.
  app.use(cors()); // Enable cross-origin requests for app clients.
  app.use(express.json()); // Parse JSON request bodies before controllers read req.body.
  app.use(requestLogger); // Log every JSON response in one reusable middleware.

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', uptime: process.uptime() }); // Return a lightweight health check for uptime monitors.
  });

  app.use('/api/otp', otpLimiter, otpRoutes); // Mount OTP routes behind their own rate limiter.
  app.use('/api/heatmap', heatmapRoutes); // Mount heatmap API routes.
  app.use('/api/rides', ridesRoutes); // Mount ride and bid API routes.
  app.use('/api/drivers', driversRoutes); // Mount driver management API routes.

  app.use(notFound); // Return JSON for any route that was not matched above.

  return app; // Return the configured app for the HTTP server.
}

module.exports = createApp; // Export the app factory for server startup and future tests.
