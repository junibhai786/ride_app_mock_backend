const http = require('http'); // Import Node's HTTP server wrapper for Express and Socket.IO.
const env = require('./config/env'); // Load centralized environment configuration.
const createApp = require('./config/app'); // Import Express application setup.
const createSocketServer = require('./config/socket'); // Import Socket.IO setup.
const runMigrations = require('./database/migrations'); // Import database schema/bootstrap runner.

const app = createApp(); // Build the Express app with middleware and routes.
const server = http.createServer(app); // Create one HTTP server shared by Express and Socket.IO.

createSocketServer(server); // Attach realtime location sockets to the HTTP server.

function listen() {
  server.listen(env.port, () => {
    console.log(`RideApp API running on port ${env.port}`); // Log the active port for local/deployed runtime.
    console.log(`Live URL: ${env.liveUrl}`); // Log the configured public URL for quick testing.
  });
}

if (!env.databaseUrl) {
  listen(); // Start immediately when no database is configured for migrations.
} else {
  runMigrations()
    .then(listen) // Start the server only after schema setup succeeds.
    .catch((error) => {
      console.error('Migration failed:', error.message); // Report migration failure but keep the API bootable.
      listen(); // Start anyway so non-database endpoints can still respond.
    });
}
