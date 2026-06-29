const Redis = require('ioredis');
const env = require('../config/env'); // Use central environment configuration.

let pubClient = null; // Keep Redis optional so the API can run without REDIS_URL.
let subClient = null; // Keep a duplicate subscriber client only when Redis is configured.

if (env.redisUrl) {
  pubClient = new Redis(env.redisUrl); // Create the publishing/cache Redis client.
  pubClient.on('error', (err) => console.error('Redis pub error:', err.message)); // Log Redis connection issues without crashing.
  subClient = pubClient.duplicate(); // Create a separate subscriber client for Socket.IO adapter.
  subClient.on('error', (err) => console.error('Redis sub error:', err.message)); // Log subscriber issues without crashing.
}

module.exports = { pubClient, subClient }; // Export nullable clients so callers can gracefully fall back.
