const mongoose = require('mongoose');
const { createApp } = require('./app');

async function startServer({ env = process.env, host } = {}) {
  const app = createApp({ env });
  if (typeof env.MONGO_URI !== 'string' || !env.MONGO_URI.trim()) {
    throw new Error('MONGO_URI is required and must not be blank.');
  }
  const port = Number(env.PORT ?? 5000);
  if (
    !/^\d+$/.test(String(env.PORT ?? 5000)) ||
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535
  ) {
    throw new Error('PORT must be an integer between 0 and 65535.');
  }
  // No listener is opened until the required database connection succeeds.
  const ownsDatabaseConnection = mongoose.connection.readyState === 0;
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  } catch {
    throw new Error('Database connection failed; HTTP server was not started.');
  }
  console.log('Database ready. Starting HTTP server.');
  let server;
  let onError;
  let onListening;
  try {
    return await new Promise((resolve, reject) => {
      onError = reject;
      onListening = () => {
        server.removeListener('error', onError);
        resolve(server);
      };
      server = app.listen({ port, host }, (error) => {
        if (error) reject(error); // Express 5 also delivers bind errors here.
      });
      server.app = app;
      server.once('error', onError);
      server.once('listening', onListening);
    });
  } catch (error) {
    if (server) {
      server.removeListener('listening', onListening);
      try {
        await new Promise((resolve, reject) => {
          server.close((closeError) => (closeError ? reject(closeError) : resolve()));
        });
      } catch {
        /* A failed bind may leave a server that was never running. */
      }
      server.removeListener('error', onError);
    }
    if (ownsDatabaseConnection) {
      try {
        await mongoose.disconnect();
      } catch {
        /* Preserve the original bind error. */
      }
    }
    throw error;
  }
}

// Stop accepting traffic, drain in-flight HTTP requests, then close the database.
function installShutdown(
  server,
  {
    signals = process,
    disconnect = () => mongoose.disconnect(),
    timeoutMs = 10000,
    forceExit = (code) => process.exit(code)
  } = {}
) {
  let closing;
  const shutdown = () => {
    if (closing) return closing;
    if (server.app?.locals) server.app.locals.draining = true;
    const timer = setTimeout(() => {
      server.closeAllConnections();
      forceExit(1);
    }, timeoutMs);
    timer.unref?.();
    closing = new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
      .finally(disconnect)
      .catch(() => {
        console.error('Shutdown failed.');
        process.exitCode = 1;
      })
      .finally(() => {
        clearTimeout(timer);
        signals.removeListener('SIGTERM', shutdown);
        signals.removeListener('SIGINT', shutdown);
      });
    return closing;
  };
  signals.on('SIGTERM', shutdown);
  signals.on('SIGINT', shutdown);
  return shutdown;
}

function runCli() {
  require('dotenv').config({ quiet: true });
  startServer()
    .then((server) => {
      installShutdown(server);
      console.log('HTTP server listening; initial database readiness confirmed.');
    })
    .catch(() => {
      console.error('Startup failed. Check backend configuration and database availability.');
      process.exitCode = 1;
    });
}

if (require.main === module) {
  runCli();
}

module.exports = { startServer, runCli, installShutdown };
