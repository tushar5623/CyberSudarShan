const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { startServer } = require('../src/server');

const allowed = 'https://frontend.example.invalid';
async function fixture(t, env = {}) {
  t.mock.method(mongoose, 'connect', () => { throw new Error('Database forbidden'); });
  t.mock.method(globalThis, 'fetch', () => { throw new Error('External service forbidden'); });
  const app = createApp({ env: { ADMIN_SECRET: 'hardening-only-secret', CORS_ALLOWED_ORIGINS: allowed, ...env } });
  const calls = [];
  for (const name of ['User', 'Blog', 'News', 'Chat', 'Contact', 'Emergency']) {
    const Model = mongoose.model(name);
    t.mock.method(Model.prototype, 'save', async function () { calls.push(`${name}.save`); return this; });
    for (const method of ['findOne', 'findByIdAndUpdate', 'findByIdAndDelete']) {
      t.mock.method(Model, method, async () => { calls.push(`${name}.${method}`); return null; });
    }
  }
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await once(server, 'listening');
  const request = (path, { method = 'POST', body, raw, origin = allowed, headers = {} } = {}) => new Promise((resolve, reject) => {
    const data = raw ?? (body === undefined ? undefined : JSON.stringify(body));
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path, method,
      headers: { 'Content-Type': 'application/json', ...(origin === null ? {} : { Origin: origin }),
        ...(data === undefined ? {} : { 'Content-Length': Buffer.byteLength(data) }), ...headers } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject);
    req.end(data);
  });
  return { request, calls };
}

test('hardening: operator-valued login email is rejected before a user can be selected', async t => {
  const { request } = await fixture(t);
  const find = t.mock.method(mongoose.model('User'), 'findOne', async () => ({
    name: 'Selected account', email: 'victim@example.invalid', password: 'synthetic-hash'
  }));
  const compare = t.mock.method(bcrypt, 'compare', async () => true);
  const result = await request('/api/auth/login', { body: { email: { $ne: null }, password: 'synthetic' } });
  assert.equal(result.status, 400);
  assert.deepEqual(JSON.parse(result.text), { success: false, message: 'Invalid login data.' });
  assert.equal(find.mock.callCount(), 0);
  assert.equal(compare.mock.callCount(), 0);
});

test('hardening: invalid auth bodies never query, hash, compare or save', async t => {
  const { request, calls } = await fixture(t, { AUTH_RATE_LIMIT_MAX: '100' });
  const hash = t.mock.method(bcrypt, 'hash', async () => { throw new Error('Unexpected hash'); });
  const compare = t.mock.method(bcrypt, 'compare', async () => { throw new Error('Unexpected compare'); });
  for (const path of ['/api/auth/login', '/api/auth/signup']) {
    for (const body of [null, [], {}, { email: { $regex: '.*' }, password: 'test', name: 'Member' },
      { email: ['member@example.invalid'], password: 'test', name: 'Member' },
      { email: 'member@example.invalid', password: {}, name: 'Member' },
      { email: 'member@example.invalid', password: '', name: 'Member' },
      { email: ' ', password: 'test', name: 'Member' }]) {
      assert.equal((await request(path, { body })).status, 400);
    }
  }
  assert.equal((await request('/api/auth/signup', { body: { name: {}, email: 'member@example.invalid', password: 'test' } })).status, 400);
  assert.deepEqual(calls, []);
  assert.equal(hash.mock.callCount(), 0);
  assert.equal(compare.mock.callCount(), 0);
});

test('hardening: CORS permits only exact configured origins and rejects disallowed writes before persistence', async t => {
  const { request, calls } = await fixture(t);
  const input = { name: 'Reader', email: 'reader@example.invalid', message: 'Test' };
  const valid = await request('/api/contact', { body: input });
  assert.equal(valid.status, 201);
  assert.equal(valid.headers['access-control-allow-origin'], allowed);
  assert.match(valid.headers.vary, /Origin/);
  const saved = calls.length;
  for (const origin of ['https://evil.example.invalid', `${allowed}.evil.invalid`, 'null', 'http://frontend.example.invalid']) {
    const result = await request('/api/contact', { body: input, origin });
    assert.equal(result.status, 403);
    assert.equal(result.headers['access-control-allow-origin'], undefined);
    assert.deepEqual(JSON.parse(result.text), { success: false, error: 'Forbidden', message: 'Origin not allowed.' });
  }
  assert.equal(calls.length, saved);
  assert.equal((await request('/api/contact', { body: input, origin: null })).status, 201);
});

test('hardening: malformed auth attempts still consume the existing auth rate-limit budget', async t => {
  const { request, calls } = await fixture(t, { AUTH_RATE_LIMIT_MAX: '1' });
  for (const path of ['/api/auth/login', '/api/auth/signup']) {
    assert.equal((await request(path, { body: { email: { $ne: null }, password: 'test', name: 'Reader' } })).status, 400);
    const limited = await request(path, { body: { email: 'reader@example.invalid', password: 'test', name: 'Reader' } });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers['retry-after']) > 0);
  }
  assert.deepEqual(calls, []);
});

test('hardening: CORS preflight accepts an allowlisted local origin and denies unlisted origins', async t => {
  const local = 'http://127.0.0.1:5173';
  const { request } = await fixture(t, { CORS_ALLOWED_ORIGINS: `${allowed}, ${local}` });
  const options = { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } };
  const result = await request('/api/contact', { ...options, origin: local });
  assert.equal(result.status, 204);
  assert.equal(result.headers['access-control-allow-origin'], local);
  assert.equal(result.headers['access-control-allow-headers'], 'content-type');
  assert.equal((await request('/api/contact', { ...options, origin: 'https://unlisted.example.invalid' })).status, 403);
});

test('hardening: missing origins deny browser requests and invalid origin configuration fails without echoing values', async t => {
  const { request } = await fixture(t, { CORS_ALLOWED_ORIGINS: undefined });
  assert.equal((await request('/api/contact', { body: {} })).status, 403);
  for (const value of ['', ' ', '*', 'null', 'https://example.invalid/path', 'https://user:private@example.invalid',
    'https://example.invalid?secret=private', 'https://example.invalid,', true, ['https://example.invalid']]) {
    assert.throws(() => createApp({ env: { ADMIN_SECRET: 'test', CORS_ALLOWED_ORIGINS: value } }),
      error => /CORS_ALLOWED_ORIGINS/.test(error.message) && !error.message.includes('private'));
  }
  await assert.rejects(startServer({ env: { ADMIN_SECRET: 'test', NODE_ENV: 'production', MONGO_URI: 'never-connect' } }), /CORS_ALLOWED_ORIGINS/);
  assert.equal(mongoose.connect.mock.callCount(), 0);
  assert.doesNotThrow(() => createApp({ env: { ADMIN_SECRET: 'test', NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: allowed } }));
});

test('hardening: parser errors never echo body fragments or log exception details', async t => {
  const { request } = await fixture(t);
  const log = t.mock.method(console, 'error', () => {});
  const malformed = await request('/api/auth/login', { raw: '{"password":"synthetic-private-password",!' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers['access-control-allow-origin'], allowed);
  assert.deepEqual(JSON.parse(malformed.text), { success: false, error: 'Invalid request body.', message: 'Invalid request body.' });
  const oversized = await request('/api/contact', { body: { message: 'x'.repeat(110 * 1024) } });
  assert.equal(oversized.status, 413);
  assert.deepEqual(JSON.parse(oversized.text), { success: false, error: 'Request body too large.', message: 'Request body too large.' });
  assert.equal(log.mock.callCount(), 0);
});

test('hardening: emergency and blog failures log only fixed messages while retaining response contracts', async t => {
  const { request } = await fixture(t);
  const privateError = new Error('synthetic-private-password connection-string contact-details');
  t.mock.method(mongoose.model('Emergency').prototype, 'save', async () => { throw privateError; });
  t.mock.method(mongoose.model('Blog'), 'findByIdAndUpdate', async () => { throw privateError; });
  t.mock.method(mongoose.model('Blog'), 'findByIdAndDelete', async () => { throw privateError; });
  const log = t.mock.method(console, 'error', () => {});
  const emergency = await request('/api/emergency', { body: { name: 'Reader', email: 'reader@example.invalid', mobile: '123', problem: 'Test' } });
  assert.equal(emergency.status, 500);
  assert.deepEqual(JSON.parse(emergency.text), { message: 'Server Error! Please try again.' });
  for (const method of ['PUT', 'DELETE']) {
    const result = await request('/api/blogs/507f1f77bcf86cd799439011', { method, body: { adminPassword: 'hardening-only-secret' } });
    assert.equal(result.status, 500);
    assert.deepEqual(JSON.parse(result.text), { success: false, message: 'Server error' });
  }
  assert.deepEqual(log.mock.calls.map(call => call.arguments), [
    ['Emergency persistence failed.'], ['Blog update failed.'], ['Blog deletion failed.']
  ]);
});
