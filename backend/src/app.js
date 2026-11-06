const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createContactRouter } = require('./modules/contacts/routes');
const { createEmergencyRouter } = require('./modules/emergencies/routes');
const { createBlogRouter } = require('./modules/blogs/routes');
const { createNewsRouter } = require('./modules/news/routes');
const { createAuthRouter } = require('./modules/auth/routes');
const { createChatRouter } = require('./modules/chat/routes');
const { createBreachRouter } = require('./modules/breach/routes');
const { createSecurity } = require('../security');

function createApp({ env = process.env } = {}) {
  const security = createSecurity(env);
  const app = express();
  app.set('trust proxy', security.trustProxy);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    next();
  });
  app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', (req, res) => {
    const ready = mongoose.connection.readyState === 1 && !app.locals.draining;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
  });

  // Parser failures must retain CORS headers so the frontend can read their status.
  app.use((req, res, next) => {
    const origin = req.get('Origin');
    if (origin !== undefined && !security.corsOrigins.includes(origin)) {
      return res
        .status(403)
        .json({ success: false, error: 'Forbidden', message: 'Origin not allowed.' });
    }
    next();
  });
  app.use(
    cors({ origin: security.corsOrigins, exposedHeaders: ['X-Session-Token', 'X-Has-More'] })
  );
  app.use(express.json({ limit: '100kb' }));
  // Body-parser errors can embed submitted credentials in their message/stack.
  // Handle them here, before Express's default error response and logger.
  app.use((error, req, res, next) => {
    if (!error.type || !Number.isInteger(error.status)) return next(error);
    const status = [400, 413, 415].includes(error.status) ? error.status : 400;
    const message = status === 413 ? 'Request body too large.' : 'Invalid request body.';
    return res.status(status).json({ success: false, error: message, message });
  });

  app.use(createContactRouter(security.contactLimit));

  app.use(createAuthRouter(security));

  // EMERGENCY POST ROUTE
  app.use(createEmergencyRouter(security.emergencyLimit));

  app.use(createBlogRouter(security));

  // Route 5: Verify Admin Password
  app.post('/api/verify-admin', security.adminLimit, (req, res) => {
    if (security.isAdmin(req.body?.password)) {
      res.json({ success: true });
    } else {
      security.unauthorized(res);
    }
  });
  app.use(createBreachRouter(security.breachLimit));
  app.use(createNewsRouter(security));

  app.use(createChatRouter(security.chatLimit));
  app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error('Request failed.');
    res.status(500).json({ success: false, message: 'Server error' });
  });
  return app;
}

module.exports = { createApp };
