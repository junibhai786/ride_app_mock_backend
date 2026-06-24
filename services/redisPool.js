const Redis = require('ioredis');
require('dotenv').config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

const pubClient = new Redis(redisConfig);
const subClient = pubClient.duplicate();

module.exports = {
  pubClient,
  subClient,
  redisConfig
};
