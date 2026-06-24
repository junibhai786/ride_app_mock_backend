const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('../services/redisPool');

module.exports = (io) => {
  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io using Redis adapter');
  } else {
    console.log('Socket.io using in-memory adapter (no REDIS_URL configured)');
  }

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join', (data) => {
      const { role, id } = data;
      socket.join(`${role}:${id}`);
      console.log(`${role}:${id} joined`);
    });

    socket.on('update-location', async (data) => {
      const { driverId, lat, lng } = data;

      if (pubClient) {
        await pubClient.set(
          `driver:${driverId}:location`,
          JSON.stringify({ lat, lng, timestamp: Date.now() }),
          'EX', 300
        );
      }

      io.to(`tracking:driver:${driverId}`).emit('location-updated', { driverId, lat, lng });
    });

    socket.on('start-tracking', async (data) => {
      const { driverId } = data;
      socket.join(`tracking:driver:${driverId}`);

      if (pubClient) {
        const cached = await pubClient.get(`driver:${driverId}:location`);
        if (cached) {
          socket.emit('location-updated', { driverId, ...JSON.parse(cached) });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
