const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('../services/redisPool');

module.exports = (io) => {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io using Redis adapter');
  } else {
    console.log('Socket.io using in-memory adapter (no Redis configured)');
  }

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join room based on user role (driver or passenger)
    socket.on('join', (data) => {
      const { role, id } = data;
      socket.join(`${role}:${id}`);
      console.log(`${role}:${id} joined`);
    });

    // 1. Google Maps - Real-Time Live Tracking
    // Driver updates location
    socket.on('update-location', async (data) => {
      const { driverId, lat, lng } = data;

      // Store in Redis; expire after 5 min so stale drivers don't persist
      await pubClient.set(
        `driver:${driverId}:location`,
        JSON.stringify({ lat, lng, timestamp: Date.now() }),
        'EX', 300
      );

      // Broadcast to all passengers tracking this driver (Redis adapter fans out across servers)
      io.to(`tracking:driver:${driverId}`).emit('location-updated', { driverId, lat, lng });
    });

    // Passenger starts tracking a driver
    // Immediately emits the last known location so the map isn't blank until next update
    socket.on('start-tracking', async (data) => {
      const { driverId } = data;
      socket.join(`tracking:driver:${driverId}`);

      const cached = await pubClient.get(`driver:${driverId}:location`);
      if (cached) {
        socket.emit('location-updated', { driverId, ...JSON.parse(cached) });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
