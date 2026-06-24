const Redis = require('ioredis');
require('dotenv').config();

const makeClient = () => {
  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { retryStrategy: (t) => Math.min(t * 50, 2000) })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        retryStrategy: (t) => Math.min(t * 50, 2000),
      });
  client.on('error', (err) => console.error('Redis error:', err.message));
  return client;
};

const pubClient = makeClient();
const subClient = pubClient.duplicate();

module.exports = { pubClient, subClient };
