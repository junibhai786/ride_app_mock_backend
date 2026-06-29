const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('../services/redisPool');

module.exports = (io) => {
  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient)); // Share socket events across multiple server instances through Redis.
    console.log('Socket.io using Redis adapter'); // Log the scaled realtime mode.
  } else {
    console.log('Socket.io using in-memory adapter (no REDIS_URL configured)'); // Log the local/single-instance realtime mode.
  }

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`); // Track new socket connections for debugging.

    socket.on('join', async (data) => {
      const { role, id } = data; // Read the joining user's role and identifier.
      socket.join(`${role}:${id}`); // Place the socket in a stable room such as driver:1.
      console.log(`${role}:${id} joined`); // Log room joins for realtime debugging.

      // If a driver joins after the passenger already started tracking,
      // resend the stored pickup location from Redis so they don't miss it.
      if (role === 'driver' && pubClient) {
        const cached = await pubClient.get(`pickup:driver:${id}`); // Load cached passenger pickup for late-joining drivers.
        if (cached) {
          socket.emit('passenger-pickup', JSON.parse(cached)); // Send the missed pickup directly to this driver socket.
        }
      }
    });

    socket.on('update-location', async (data) => {
      const { driverId, lat, lng } = data; // Read the driver's latest coordinates.

      if (pubClient) {
        await pubClient.set(
          `driver:${driverId}:location`,
          JSON.stringify({ lat, lng, timestamp: Date.now() }),
          'EX', 300
        ); // Cache driver location for five minutes so new trackers get an immediate position.
      }

      io.to(`tracking:driver:${driverId}`).emit('location-updated', { driverId, lat, lng }); // Broadcast the latest driver location to tracking passengers.
    });

    socket.on('start-tracking', async (data) => {
      const { driverId, pickupLat, pickupLng } = data; // Read tracking target and optional passenger pickup.
      socket.join(`tracking:driver:${driverId}`); // Put the passenger into the driver's tracking room.

      // Send cached driver location to passenger immediately if available.
      if (pubClient) {
        const cached = await pubClient.get(`driver:${driverId}:location`); // Load the driver's last known position.
        if (cached) {
          socket.emit('location-updated', { driverId, ...JSON.parse(cached) }); // Send immediate location feedback to the passenger.
        }
      }

      // Forward passenger's pickup location to the driver's socket.
      if (pickupLat != null && pickupLng != null) {
        const pickupData = { lat: pickupLat, lng: pickupLng }; // Normalize pickup coordinates into one payload.

        // Cache in Redis so a late-joining driver still receives it.
        if (pubClient) {
          await pubClient.set(
            `pickup:driver:${driverId}`,
            JSON.stringify(pickupData),
            'EX', 300
          ); // Cache pickup data for five minutes to support late driver joins.
        }

        io.to(`driver:${driverId}`).emit('passenger-pickup', pickupData); // Send pickup coordinates to the assigned driver room.
        console.log(`Sent passenger pickup to driver:${driverId} — ${pickupLat}, ${pickupLng}`); // Log pickup forwarding for debugging.
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`); // Track socket disconnects for debugging.
    });
  });
};
