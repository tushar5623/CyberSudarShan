const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');

async function request(t, { method = 'POST', body = '{', headers = {} } = {}) {
  t.mock.method(mongoose, 'connect', () => { throw new Error('No database in CORS test'); });
  const app = createApp({ env: { ADMIN_SECRET: 'cors-test-only', CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5173' } });
  app.set('env', 'test'); // Suppress Express's default test-error stack logging.
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port,
      path: '/api/contact', method, headers: {
        Origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json', ...headers
      } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('CORS: malformed JSON retains 400 and is readable from the frontend origin', async t => {
  const result = await request(t);
  assert.equal(result.status, 400);
  assert.equal(result.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');
  assert.match(result.headers['content-type'], /^application\/json/);
  assert.deepEqual(JSON.parse(result.text), { success: false, error: 'Invalid request body.', message: 'Invalid request body.' });
});

test('CORS: oversized JSON retains 413 and is readable from the frontend origin', async t => {
  const result = await request(t, { body: JSON.stringify({ message: 'x'.repeat(110 * 1024) }) });
  assert.equal(result.status, 413);
  assert.equal(result.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');
});

test('CORS: JSON-write preflight permits the existing methods and content-type header', async t => {
  const result = await request(t, { method: 'OPTIONS', body: undefined, headers: {
    'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'
  } });
  assert.equal(result.status, 204);
  assert.equal(result.headers['access-control-allow-origin'], 'http://127.0.0.1:5173');
  assert.match(result.headers['access-control-allow-methods'], /\bPOST\b/);
  assert.equal(result.headers['access-control-allow-headers'], 'content-type');
  assert.equal(result.text, '');
});
