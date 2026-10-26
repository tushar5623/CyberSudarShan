const mongoose = require('mongoose');
const { createApp } = require('./app');

async function startServer({ env = process.env, host } = {}) {
    const app = createApp({ env });
    if (typeof env.MONGO_URI !== 'string' || !env.MONGO_URI.trim()) {
        throw new Error('MONGO_URI is required and must not be blank.');
    }
    // No listener is opened until the required database connection succeeds.
    const ownsDatabaseConnection = mongoose.connection.readyState === 0;
    try {
        await mongoose.connect(env.MONGO_URI);
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
            server = app.listen({ port: env.PORT ?? 5000, host }, error => {
                if (error) reject(error); // Express 5 also delivers bind errors here.
            });
            server.once('error', onError);
            server.once('listening', onListening);
        });
    } catch (error) {
        if (server) {
            server.removeListener('listening', onListening);
            try {
                await new Promise((resolve, reject) => {
                    server.close(closeError => closeError ? reject(closeError) : resolve());
                });
            } catch { /* A failed bind may leave a server that was never running. */ }
            server.removeListener('error', onError);
        }
        if (ownsDatabaseConnection) {
            try { await mongoose.disconnect(); } catch { /* Preserve the original bind error. */ }
        }
        throw error;
    }
}

function runCli() {
    require('dotenv').config({ quiet: true });
    startServer().then(() => {
        console.log('HTTP server listening; initial database readiness confirmed.');
    }).catch(error => {
        console.error(`Startup failed: ${error.message}`);
        process.exitCode = 1;
    });
}

if (require.main === module) {
    runCli();
}

module.exports = { startServer, runCli };
