const express = require('express'); // Import the Express framework
const cors = require('cors'); // Import the CORS middleware to allow cross-origin requests
const rateLimit = require('express-rate-limit'); // Import the rate limiting middleware
const otpRoutes = require('./routes/otp'); // Import the OTP routes from the local routes directory
const heatmapRoutes = require('./routes/heatmap');
const ridesRoutes = require('./routes/rides');

const app = express(); // Initialize a new Express application
const PORT = process.env.PORT || 3000; // Set the server port from environment variable or default to 3000
const LIVE_URL = process.env.LIVE_URL || 'https://welcoming-mindfulness-production-539a.up.railway.app'; // Set the production URL

// ── Middleware ────────────────────────────────────────────────────────────────
app.set('trust proxy', 1); // Trust Railway's reverse proxy for rate limiting
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

// Response logger
app.use((req, res, next) => { // Define a custom middleware for logging requests and responses
  const start = Date.now(); // Record the start time of the request
  const originalJson = res.json.bind(res); // Store the original res.json method
  res.json = (body) => { // Override the res.json method to log the response
    const ms = Date.now() - start; // Calculate the time taken to process the request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`, JSON.stringify(body)); // Log request details and response body
    return originalJson(body); // Call the original res.json method with the body
  }; // End of res.json override
  next(); // Pass control to the next middleware
}); // End of custom logging middleware

// Limit each IP to 10 OTP requests per 15 minutes
const otpLimiter = rateLimit({ // Configure the rate limiter for OTP endpoints
  windowMs: 15 * 60 * 1000, // Define the time window of 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { success: false, message: 'Too many requests. Try again later.' }, // Error message when limit is exceeded
}); // End of rate limiter configuration

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => { // Define a health check route
  res.json({ status: 'OK', uptime: process.uptime() }); // Return the status and uptime of the process
}); // End of health check route

app.use('/api/otp', otpLimiter, otpRoutes); // Mount the OTP routes at /api/otp with rate limiting applied
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/rides', ridesRoutes);

// 404 handler
app.use((req, res) => { // Define a catch-all middleware for handling undefined routes
  res.status(404).json({ success: false, message: 'Route not found' }); // Return a 404 status and error message
}); // End of 404 handler

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Socket logic
require('./socket/location')(io);

// ... existing routes ...

async function runMigrations() {
  if (!process.env.DATABASE_URL) return;
  const db = require('./services/db');
  await db.query(`
    CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'offline',
      last_lat DECIMAL(9,6),
      last_lng DECIMAL(9,6),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rides (
      id SERIAL PRIMARY KEY,
      passenger_id INTEGER NOT NULL,
      driver_id INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      pickup_lat DECIMAL(9,6) NOT NULL,
      pickup_lng DECIMAL(9,6) NOT NULL,
      destination_lat DECIMAL(9,6) NOT NULL,
      destination_lng DECIMAL(9,6) NOT NULL,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      ride_id INTEGER REFERENCES rides(id),
      driver_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(ride_id, driver_id)
    );
    CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides(requested_at);
    CREATE INDEX IF NOT EXISTS idx_rides_pickup ON rides(pickup_lat, pickup_lng);
    CREATE INDEX IF NOT EXISTS idx_bids_ride_id ON bids(ride_id);
  `);
  console.log('Database migrations applied');
}

runMigrations()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`RideApp API running on port ${PORT}`);
      console.log(`Live URL: ${LIVE_URL}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    server.listen(PORT, () => {
      console.log(`RideApp API running on port ${PORT}`);
      console.log(`Live URL: ${LIVE_URL}`);
    });
  });
