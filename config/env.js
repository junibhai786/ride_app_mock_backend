require('dotenv').config(); // Load environment variables before any config reads process.env.

const env = {
  port: process.env.PORT || 3000, // Choose the platform port when deployed, otherwise use local port 3000.
  liveUrl: process.env.LIVE_URL || 'https://welcoming-mindfulness-production-539a.up.railway.app', // Keep the public URL in one reusable place.
  nodeEnv: process.env.NODE_ENV || 'development', // Normalize NODE_ENV so other files do not repeat fallback logic.
  databaseUrl: process.env.DATABASE_URL || null, // Store the database URL once so migrations can check it safely.
  redisUrl: process.env.REDIS_URL || null, // Store the Redis URL once so Redis clients can be optional.
  otpLength: parseInt(process.env.OTP_LENGTH, 10) || 4, // Allow OTP length to be configured without changing code.
  fixedOtp: process.env.FIXED_OTP || null, // Allow demos/tests to force a stable OTP.
};

module.exports = env; // Export a single config object for the whole application.
