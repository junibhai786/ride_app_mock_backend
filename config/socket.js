const { Server } = require('socket.io'); // Import Socket.IO server class.
const registerLocationSocket = require('../socket/location'); // Import realtime location event handlers.

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow current mobile/web clients to connect from any origin.
      methods: ['GET', 'POST'], // Restrict Socket.IO CORS preflight methods to the methods it needs.
    },
  });

  registerLocationSocket(io); // Attach all location/tracking socket events.

  return io; // Return io for future integrations or tests.
}

module.exports = createSocketServer; // Export Socket.IO setup as a reusable bootstrap function.
