const Redis = require('ioredis');
require('dotenv').config();

let pubClient = null;
let subClient = null;

if (process.env.REDIS_URL) {
  pubClient = new Redis(process.env.REDIS_URL);
  pubClient.on('error', (err) => console.error('Redis pub error:', err.message));
  subClient = pubClient.duplicate();
  subClient.on('error', (err) => console.error('Redis sub error:', err.message));
}

module.exports = { pubClient, subClient };
