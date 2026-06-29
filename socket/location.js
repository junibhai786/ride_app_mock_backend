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

    socket.on('join', async (data) => {
      const { role, id } = data;
      socket.join(`${role}:${id}`);
      console.log(`${role}:${id} joined`);

      // If a driver joins after the passenger already started tracking,
      // resend the stored pickup location from Redis so they don't miss it.
      if (role === 'driver' && pubClient) {
        const cached = await pubClient.get(`pickup:driver:${id}`);
        if (cached) {
          socket.emit('passenger-pickup', JSON.parse(cached));
        }
      }
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
      const { driverId, pickupLat, pickupLng } = data;
      socket.join(`tracking:driver:${driverId}`);

      // Send cached driver location to passenger immediately if available.
      if (pubClient) {
        const cached = await pubClient.get(`driver:${driverId}:location`);
        if (cached) {
          socket.emit('location-updated', { driverId, ...JSON.parse(cached) });
        }
      }

      // Forward passenger's pickup location to the driver's socket.
      if (pickupLat != null && pickupLng != null) {
        const pickupData = { lat: pickupLat, lng: pickupLng };

        // Cache in Redis so a late-joining driver still receives it.
        if (pubClient) {
          await pubClient.set(
            `pickup:driver:${driverId}`,
            JSON.stringify(pickupData),
            'EX', 300
          );
        }

        io.to(`driver:${driverId}`).emit('passenger-pickup', pickupData);
        console.log(`Sent passenger pickup to driver:${driverId} — ${pickupLat}, ${pickupLng}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
