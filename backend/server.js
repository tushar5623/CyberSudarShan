const { createApp } = require('./src/app');
const { startServer, runCli } = require('./src/server');

if (require.main === module) {
    runCli();
}

module.exports = { createApp, startServer };
