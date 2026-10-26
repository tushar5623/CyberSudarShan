const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const express = require('express');
const { createApp } = require('../src/app');
const { startServer } = require('../src/server');

// Never load .env or connect to a database. Every persistence operation is mocked.
mongoose.set('bufferCommands', false);
const testSecret = 'isolated-test-admin-secret';
const testEnv = { ADMIN_SECRET: testSecret };
const newsBody = { title: 'News', summary: 'Summary', fullDetails: 'Details', type: 'News' };
const blogBody = { title: 'Blog', author: 'Author', content: 'Content' };
const contactBody = { name: 'Reader', email: 'reader@example.invalid', message: 'Hello' };
const emergencyBody = { ...contactBody, mobile: '1234567890', problem: 'Test incident' };

async function fixture(t, overrides = {}) {
  const app = createApp({ env: { ...testEnv, ...overrides } });
  const records = {};
  const calls = [];
  t.mock.method(mongoose, 'connect', async () => { throw new Error('Unexpected database connection'); });
  for (const name of ['Contact', 'Emergency', 'User', 'Blog', 'News', 'Chat']) {
    const Model = mongoose.model(name);
    records[name] = [];
    t.mock.method(Model.prototype, 'save', async function () {
      calls.push(`${name}.save`);
      const error = this.validateSync();
      if (error) throw error;
      records[name].push(this.toObject());
      return this;
    });
    t.mock.method(Model, 'find', (filter = {}) => {
      calls.push(`${name}.find`);
      const result = records[name].filter(record =>
        Object.entries(filter).every(([key, value]) => record[key] === value));
      return { sort: () => result };
    });
    t.mock.method(Model, 'findOne', async filter => {
      calls.push(`${name}.findOne`);
      return records[name].find(record => record.email === filter.email) || null;
    });
    t.mock.method(Model, 'findByIdAndUpdate', async (id, values) => {
      calls.push(`${name}.update`);
      const record = records[name].find(record => String(record._id) === id);
      if (!record) return null;
      Object.assign(record, values);
      return record;
    });
    t.mock.method(Model, 'findByIdAndDelete', async id => {
      calls.push(`${name}.delete`);
      const index = records[name].findIndex(record => String(record._id) === id);
      return index < 0 ? null : records[name].splice(index, 1)[0];
    });
  }
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const request = (method, route, body, headers = {}) => new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port,
      path: route, method, headers: { ...(data === undefined ? {} : {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)
      }), ...headers } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(text), headers: res.headers }); }
        catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.end(data);
  });
  return { app, records, calls, request };
}

test('missing, empty, whitespace and non-string ADMIN_SECRET fail closed', () => {
  for (const value of [undefined, '', ' ', '\t\n', null, 42]) {
    assert.throws(() => createApp({ env: { ADMIN_SECRET: value } }),
      { message: 'ADMIN_SECRET is required and must not be blank.' });
  }
});

test('CLI exits nonzero with a clear error and no secret/URI output', () => {
  const result = spawnSync(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 10000,
    env: { ...process.env, ADMIN_SECRET: '', MONGO_URI: 'must-not-be-printed' }
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ADMIN_SECRET is required/);
  assert.doesNotMatch(result.stdout + result.stderr, /must-not-be-printed|server listening/i);
});

test('bad operational limits and unsafe proxy shortcuts fail configuration', () => {
  for (const name of ['AUTH_RATE_LIMIT_MAX', 'ADMIN_RATE_LIMIT_MAX', 'PUBLIC_WRITE_RATE_LIMIT_MAX',
    'CHAT_RATE_LIMIT_MAX', 'BREACH_RATE_LIMIT_MAX']) {
    for (const value of ['', '0', '-1', '1.5', 'Infinity', 'bad']) {
      assert.throws(() => createApp({ env: { ...testEnv, [name]: value } }), /positive integer/);
    }
  }
  for (const value of ['true', '1', '0.0.0.0/0', '::/0', '10.0.0.1/33', '127.0.0.1,']) {
    assert.throws(() => createApp({ env: { ...testEnv, TRUSTED_PROXY_CIDRS: value } }), /explicit IP/);
  }
});

const protectedRoutes = [
  ['POST', '/api/blogs'], ['PUT', '/api/blogs/507f1f77bcf86cd799439011'],
  ['DELETE', '/api/blogs/507f1f77bcf86cd799439011'], ['POST', '/api/verify-admin'],
  ['POST', '/api/news/admin'], ['PUT', '/api/news/approve/507f1f77bcf86cd799439011'],
  ['DELETE', '/api/news/507f1f77bcf86cd799439011']
];

for (const [method, route] of protectedRoutes) {
  test(`${method} ${route} rejects absent, incorrect and malformed credentials before database access`, async t => {
    const { request, calls } = await fixture(t);
    const field = route === '/api/verify-admin' ? 'password' : 'adminPassword';
    for (const body of [undefined, {}, { [field]: '' }, { [field]: '   ' },
      { [field]: 'wrong' }, { [field]: null }, { [field]: [testSecret] },
      { [field]: { value: testSecret } }, { isAdmin: true, role: 'admin' }]) {
      const response = await request(method, route, body);
      assert.equal(response.status, 401);
      assert.equal(response.body.success, false);
      assert.ok(!JSON.stringify(response.body).includes(testSecret));
    }
    assert.deepEqual(calls, []);
  });
}

test('correct credentials preserve blog create, read, edit, delete and admin verification', async t => {
  const { request, records } = await fixture(t);
  assert.deepEqual((await request('POST', '/api/verify-admin', { password: testSecret })).body, { success: true });
  const created = await request('POST', '/api/blogs', { ...blogBody, adminPassword: testSecret });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, blogBody.title);
  assert.equal((await request('GET', '/api/blogs')).body.length, 1);
  const route = `/api/blogs/${created.body._id}`;
  assert.equal((await request('PUT', route, { ...blogBody, title: 'Updated', adminPassword: testSecret })).status, 200);
  assert.equal(records.Blog[0].title, 'Updated');
  assert.equal((await request('DELETE', route, { adminPassword: testSecret })).status, 200);
  assert.equal(records.Blog.length, 0);
});

test('public news ignores forged approval flags; invalid explicit admin credentials cannot publish', async t => {
  const { request, records, calls } = await fixture(t);
  const result = await request('POST', '/api/news', {
    ...newsBody, status: 'approved', isAdmin: true, role: 'admin'
  });
  assert.equal(result.status, 201);
  assert.equal(records.News[0].status, 'pending');
  assert.deepEqual((await request('GET', '/api/news')).body, []);
  const before = calls.length;
  for (const adminPassword of ['', ' ', 'wrong', null, [testSecret], { secret: testSecret }]) {
    assert.equal((await request('POST', '/api/news', { ...newsBody, adminPassword })).status, 401);
  }
  assert.equal(calls.length, before);
  assert.equal(records.News.length, 1);
});

test('valid admin news workflow publishes, lists pending items, approves and deletes', async t => {
  const { request, records } = await fixture(t);
  assert.equal((await request('POST', '/api/news', newsBody)).status, 201);
  assert.equal((await request('POST', '/api/news', { ...newsBody, adminPassword: testSecret })).status, 201);
  assert.equal(records.News[1].status, 'approved');
  assert.equal((await request('GET', '/api/news')).body.length, 1);
  assert.equal((await request('POST', '/api/news/admin', { adminPassword: testSecret })).body.length, 2);
  const id = records.News[0]._id;
  assert.equal((await request('PUT', `/api/news/approve/${id}`, { adminPassword: testSecret })).status, 200);
  assert.equal((await request('GET', '/api/news')).body.length, 2);
  assert.equal((await request('DELETE', `/api/news/${id}`, { adminPassword: testSecret })).status, 200);
  assert.equal(records.News.length, 1);
});

test('valid contact and emergency submissions retain persistence and response contracts', async t => {
  const { request, records } = await fixture(t);
  const contact = await request('POST', '/api/contact', contactBody);
  assert.equal(contact.status, 201);
  assert.equal(contact.body.message, 'Data Saved to Cloud!');
  assert.equal(records.Contact[0].message, contactBody.message);
  const emergency = await request('POST', '/api/emergency', emergencyBody);
  assert.equal(emergency.status, 201);
  assert.equal(emergency.body.message, 'Emergency reported successfully! We will contact you soon.');
  assert.equal(records.Emergency[0].problem, emergencyBody.problem);
});

test('login and signup work within limits and have separate per-IP budgets', async t => {
  const { request, records } = await fixture(t, { AUTH_RATE_LIMIT_MAX: '2' });
  const user = { name: 'Member', email: 'member@example.invalid', password: 'Test-only-password' };
  assert.equal((await request('POST', '/api/auth/signup', user)).status, 201);
  assert.notEqual(records.User[0].password, user.password);
  assert.equal((await request('POST', '/api/auth/login', user)).status, 200);
  assert.equal((await request('POST', '/api/auth/login', user)).status, 200);
  const blocked = await request('POST', '/api/auth/login', user);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers['retry-after']);
  assert.ok(blocked.headers.ratelimit);
  assert.equal((await request('POST', '/api/auth/signup', { ...user, email: 'second@example.invalid' })).status, 201);
  assert.equal((await request('POST', '/api/auth/signup', { ...user, email: 'third@example.invalid' })).status, 429);
});

test('admin attempts share a budget across verification, blogs and all news admin routes', async t => {
  const { request, calls } = await fixture(t, { ADMIN_RATE_LIMIT_MAX: '2' });
  assert.equal((await request('POST', '/api/verify-admin', { password: 'wrong' })).status, 401);
  assert.equal((await request('POST', '/api/blogs', { adminPassword: 'wrong' })).status, 401);
  for (const [method, route] of protectedRoutes) {
    assert.equal((await request(method, route, { password: testSecret, adminPassword: testSecret })).status, 429);
  }
  assert.equal((await request('POST', '/api/news', { ...newsBody, adminPassword: testSecret })).status, 429);
  assert.deepEqual(calls, []);
  // Exhausting admin attempts does not prevent ordinary public submissions or reads.
  assert.equal((await request('POST', '/api/news', newsBody)).status, 201);
  assert.equal((await request('GET', '/api/blogs')).status, 200);
  assert.equal((await request('GET', '/api/news')).status, 200);
});

test('public writes have separate limits; reads remain available', async t => {
  const { request, records } = await fixture(t, { PUBLIC_WRITE_RATE_LIMIT_MAX: '2', CHAT_RATE_LIMIT_MAX: '3' });
  for (const [route, body, model] of [['/api/contact', contactBody, 'Contact'],
    ['/api/emergency', emergencyBody, 'Emergency'], ['/api/news', newsBody, 'News']]) {
    assert.equal((await request('POST', route, body)).status, 201);
    assert.equal((await request('POST', route, body)).status, 201);
    assert.equal((await request('POST', route, body)).status, 429);
    assert.equal(records[model].length, 2);
  }
  for (let i = 0; i < 3; i++) {
    assert.equal((await request('POST', '/api/chat', { sender: 'Reader', message: 'Hello' })).status, 201);
  }
  assert.equal((await request('POST', '/api/chat', { message: 'Blocked' })).status, 429);
  assert.equal(records.Chat.length, 3);
  for (let i = 0; i < 4; i++) {
    assert.equal((await request('GET', '/api/blogs')).status, 200);
    assert.equal((await request('GET', '/api/news')).status, 200);
  }
});

test('breach limit covers different emails and blocks external calls beyond budget', async t => {
  const { request } = await fixture(t, { BREACH_RATE_LIMIT_MAX: '2' });
  const upstream = t.mock.method(globalThis, 'fetch', async () => ({ status: 200,
    json: async () => ({ breaches: [['TestBreach']] }) }));
  for (let i = 0; i < 2; i++) {
    const result = await request('GET', `/api/breach/test${i}@example.invalid`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { safe: false, breaches: ['TestBreach'] });
  }
  assert.equal((await request('GET', '/api/breach/third@example.invalid')).status, 429);
  assert.equal(upstream.mock.callCount(), 2);
});

test('untrusted forwarding headers cannot reset an IP budget', async t => {
  const { request, app } = await fixture(t, { PUBLIC_WRITE_RATE_LIMIT_MAX: '1' });
  assert.equal(app.get('trust proxy'), false);
  assert.equal((await request('POST', '/api/contact', contactBody, { 'X-Forwarded-For': '198.51.100.1' })).status, 201);
  assert.equal((await request('POST', '/api/contact', contactBody, { 'X-Forwarded-For': '198.51.100.2' })).status, 429);
});

test('only explicitly trusted proxy peers supply forwarded client IPs', async t => {
  const { request } = await fixture(t, { TRUSTED_PROXY_CIDRS: '127.0.0.1/32', PUBLIC_WRITE_RATE_LIMIT_MAX: '1' });
  assert.equal((await request('POST', '/api/contact', contactBody, { 'X-Forwarded-For': '198.51.100.1' })).status, 201);
  assert.equal((await request('POST', '/api/contact', contactBody, { 'X-Forwarded-For': '198.51.100.1' })).status, 429);
  assert.equal((await request('POST', '/api/contact', contactBody, { 'X-Forwarded-For': '198.51.100.2' })).status, 201);
});

test('an untrusted peer cannot use forwarding headers when other proxies are configured', async t => {
  const { request } = await fixture(t, { TRUSTED_PROXY_CIDRS: '192.0.2.1/32', PUBLIC_WRITE_RATE_LIMIT_MAX: '1' });
  assert.equal((await request('POST', '/api/contact', contactBody, { 'X-Forwarded-For': '198.51.100.1' })).status, 201);
  assert.equal((await request('POST', '/api/contact', contactBody, { 'X-Forwarded-For': '198.51.100.2' })).status, 429);
});

test('startup rejects missing configuration before database access or HTTP listening', async t => {
  const connect = t.mock.method(mongoose, 'connect', async () => { throw new Error('Unexpected connection'); });
  const listen = t.mock.method(express.application, 'listen', () => { throw new Error('Unexpected listener'); });
  await assert.rejects(startServer({ env: {} }), /ADMIN_SECRET is required/);
  await assert.rejects(startServer({ env: testEnv }), /MONGO_URI is required/);
  assert.equal(connect.mock.callCount(), 0);
  assert.equal(listen.mock.callCount(), 0);
});

test('failed database connection never opens HTTP listener and hides underlying details', async t => {
  t.mock.method(mongoose, 'connect', async () => { throw new Error('sensitive-connection-details'); });
  const listen = t.mock.method(express.application, 'listen', () => { throw new Error('Unexpected listener'); });
  await assert.rejects(startServer({ env: { ...testEnv, MONGO_URI: 'mock-only' } }), {
    message: 'Database connection failed; HTTP server was not started.'
  });
  assert.equal(listen.mock.callCount(), 0);
});

test('HTTP listening waits until database connection resolves', async t => {
  let connected = false;
  let release;
  t.mock.method(mongoose, 'connect', () => new Promise(resolve => { release = () => { connected = true; resolve(); }; }));
  const originalListen = express.application.listen;
  const listen = t.mock.method(express.application, 'listen', function (...args) {
    assert.equal(connected, true);
    return originalListen.apply(this, args);
  });
  const starting = startServer({ env: { ...testEnv, MONGO_URI: 'mock-only', PORT: 0 }, host: '127.0.0.1' });
  assert.equal(listen.mock.callCount(), 0);
  release();
  const server = await starting;
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(listen.mock.callCount(), 1);
  assert.equal(server.listening, true);
  assert.equal(server.address().address, '127.0.0.1');
});

test('HTTP error event closes server and database while preserving the original error', async t => {
  t.mock.method(mongoose, 'connect', async () => {});
  const disconnect = t.mock.method(mongoose, 'disconnect', async () => {});
  const bindError = new Error('synthetic-bind-failure');
  let closeCalls = 0;
  t.mock.method(express.application, 'listen', () => {
    const server = new (require('node:events').EventEmitter)();
    server.close = callback => { closeCalls++; callback(); };
    process.nextTick(() => server.emit('error', bindError));
    return server;
  });
  await assert.rejects(startServer({ env: { ...testEnv, MONGO_URI: 'mock-only', PORT: 0 } }), error => error === bindError);
  assert.equal(closeCalls, 1);
  assert.equal(disconnect.mock.callCount(), 1);
});

test('real occupied loopback port rejects startup and disconnects MongoDB exactly once', async t => {
  const occupying = require('node:net').createServer();
  let attemptedServer;
  t.after(async () => {
    for (const server of [attemptedServer, occupying]) {
      if (server?.listening) await new Promise((resolve, reject) =>
        server.close(error => error ? reject(error) : resolve()));
    }
  });
  occupying.listen(0, '127.0.0.1');
  await once(occupying, 'listening');
  const connect = t.mock.method(mongoose, 'connect', async () => {});
  const disconnect = t.mock.method(mongoose, 'disconnect', async () => {});
  const originalListen = express.application.listen;
  const logs = t.mock.method(console, 'log', () => {});
  let close;
  t.mock.method(express.application, 'listen', function (...args) {
    attemptedServer = originalListen.apply(this, args);
    close = t.mock.method(attemptedServer, 'close');
    return attemptedServer;
  });
  let returnedServer;
  await assert.rejects(async () => {
    returnedServer = await startServer({
      env: { ...testEnv, MONGO_URI: 'mock-only', PORT: occupying.address().port }, host: '127.0.0.1'
    });
  }, error => error.code === 'EADDRINUSE' && error.address === '127.0.0.1');
  assert.equal(connect.mock.callCount(), 1);
  assert.equal(disconnect.mock.callCount(), 1);
  assert.equal(close.mock.callCount(), 1);
  assert.equal(returnedServer, undefined);
  assert.equal(attemptedServer.listening, false);
  assert.ok(logs.mock.calls.every(call => !call.arguments.some(value => /server listening/i.test(String(value)))));
});

test('callback and event bind errors clean up once even when cleanup fails', async t => {
  t.mock.method(mongoose, 'connect', async () => {});
  const disconnect = t.mock.method(mongoose, 'disconnect', async () => { throw new Error('cleanup failure'); });
  const bindError = new Error('synthetic-original-bind-error');
  let closeCalls = 0;
  t.mock.method(express.application, 'listen', (options, callback) => {
    const server = new (require('node:events').EventEmitter)();
    server.close = done => { closeCalls++; done(new Error('server cleanup failure')); };
    process.nextTick(() => {
      callback(bindError);
      server.emit('error', bindError);
    });
    return server;
  });
  await assert.rejects(startServer({ env: { ...testEnv, MONGO_URI: 'mock-only', PORT: 0 } }), error => error === bindError);
  assert.equal(closeCalls, 1);
  assert.equal(disconnect.mock.callCount(), 1);
});

test('failed binding does not disconnect a pre-existing database connection', async t => {
  createApp({ env: testEnv });
  const connection = mongoose.connection;
  const originalState = Object.getOwnPropertyDescriptor(connection, 'readyState');
  Object.defineProperty(connection, 'readyState', { configurable: true, value: 1 });
  t.after(() => {
    if (originalState) Object.defineProperty(connection, 'readyState', originalState);
    else delete connection.readyState;
  });
  t.mock.method(mongoose, 'connect', async () => {});
  const disconnect = t.mock.method(mongoose, 'disconnect', async () => {});
  const bindError = new Error('synthetic-bind-failure');
  t.mock.method(express.application, 'listen', () => { throw bindError; });
  await assert.rejects(startServer({ env: { ...testEnv, MONGO_URI: 'mock-only', PORT: 0 } }), error => error === bindError);
  assert.equal(disconnect.mock.callCount(), 0);
});

test('existing frontend and backend route paths are preserved', async t => {
  const { app } = await fixture(t);
  const collectRoutes = stack => stack.flatMap(layer => {
    if (layer.route) {
      return Object.keys(layer.route.methods).map(method => `${method.toUpperCase()} ${layer.route.path}`);
    }
    return layer.handle?.stack ? collectRoutes(layer.handle.stack) : [];
  });
  const routes = collectRoutes(app.router.stack).sort();
  assert.deepEqual(routes, [
    'POST /api/contact', 'POST /api/auth/signup', 'POST /api/auth/login', 'POST /api/emergency',
    'POST /api/blogs', 'GET /api/blogs', 'PUT /api/blogs/:id', 'DELETE /api/blogs/:id',
    'POST /api/verify-admin', 'GET /api/breach/:email', 'GET /api/news', 'POST /api/news/admin',
    'POST /api/news', 'PUT /api/news/approve/:id', 'DELETE /api/news/:id', 'GET /api/chat', 'POST /api/chat'
  ].sort());
  const frontend = readFileSync(path.resolve(__dirname, '../../frontend/src/App.jsx'), 'utf8');
  const frontendRoutes = [...frontend.matchAll(/<Route path="([^"]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(frontendRoutes, ['/', '/about', '/blogs', '/community', '/login', '/services'].sort());
});
