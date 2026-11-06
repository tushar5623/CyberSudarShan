const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once, EventEmitter } = require('node:events');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { Session } = require('../src/modules/auth/session');
const { startServer, installShutdown } = require('../src/server');

const adminPassword = 'quality-test-only';
const id = '507f1f77bcf86cd799439011';
async function fixture(t) {
  mongoose.set('bufferCommands', false);
  t.mock.method(mongoose, 'connect', () => {
    throw new Error('Database access forbidden');
  });
  const app = createApp({ env: { ADMIN_SECRET: adminPassword, AUTH_RATE_LIMIT_MAX: '100' } });
  const user = {
    _id: id,
    name: 'Verified member',
    email: 'member@example.invalid',
    password: await bcrypt.hash('Example-password-1', 10)
  };
  t.mock.method(mongoose.model('User'), 'findOne', async (query) =>
    query.email === user.email ? user : null
  );
  const sessions = [];
  t.mock.method(Session, 'create', async (value) => {
    sessions.push(value);
    return value;
  });
  t.mock.method(Session, 'findOne', (filter) => ({
    populate: async () => {
      const session = sessions.find(
        (row) => row.tokenHash === filter.tokenHash && row.expiresAt > filter.expiresAt.$gt
      );
      return session ? { ...session, user } : null;
    }
  }));
  t.mock.method(Session, 'deleteOne', async (filter) => {
    const index = sessions.findIndex((row) => row.tokenHash === filter.tokenHash);
    if (index >= 0) sessions.splice(index, 1);
  });
  const chats = [];
  t.mock.method(mongoose.model('Chat').prototype, 'save', async function () {
    chats.push(this.toObject());
    return this;
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      })
  );
  const request = (path, body, token, method = body === undefined ? 'GET' : 'POST') =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  const login = async () => {
    const response = await request('/api/auth/login', {
      email: user.email,
      password: 'Example-password-1'
    });
    assert.equal(response.status, 200);
    return response.headers.get('x-session-token');
  };
  return { request, login, user, chats, sessions, app };
}

test('sessions are random, hashed at rest, expiring, revocable and authoritative for chat identity', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/chat', { sender: 'Forged', message: 'Hi' })).status, 401);
  const token = await f.login();
  assert.match(token, /^[a-f\d]{64}$/);
  assert.equal(f.sessions[0].tokenHash, createHash('sha256').update(token).digest('hex'));
  assert.ok(!JSON.stringify(f.sessions).includes(token));
  assert.ok(f.sessions[0].expiresAt > new Date());
  assert.equal(
    (await f.request('/api/chat', { sender: 'Forged', userId: 'forged', message: 'Hello' }, token))
      .status,
    201
  );
  assert.equal(f.chats[0].sender, f.user.name);
  assert.equal(String(f.chats[0].userId), id);
  assert.equal((await f.request('/api/chat', { message: 'Hi' }, 'b'.repeat(64))).status, 401);
  f.sessions[0].expiresAt = new Date(0);
  assert.equal((await f.request('/api/chat', { message: 'Expired' }, token)).status, 401);
  const second = await f.login();
  assert.notEqual(second, token);
  assert.equal((await f.request('/api/auth/logout', {}, second)).status, 204);
  assert.equal((await f.request('/api/chat', { message: 'Revoked' }, second)).status, 401);
  assert.equal(f.chats.length, 1);
});

test('invalid credentials have uniform responses and never create sessions', async (t) => {
  const f = await fixture(t);
  for (const email of [f.user.email, 'absent@example.invalid']) {
    const response = await f.request('/api/auth/login', { email, password: 'wrong' });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { success: false, message: 'Invalid credentials!' });
    assert.equal(response.headers.get('x-session-token'), null);
  }
  assert.equal(f.sessions.length, 0);
});

test('signup rejects weak and bcrypt-truncated passwords before database access', async (t) => {
  const f = await fixture(t);
  const find = t.mock.method(mongoose.model('User'), 'findOne', () => {
    throw new Error('Must not query');
  });
  for (const password of ['short', 'a'.repeat(73), '€'.repeat(25)]) {
    assert.equal(
      (await f.request('/api/auth/signup', { name: 'Member', email: f.user.email, password }))
        .status,
      400
    );
  }
  assert.equal(find.mock.callCount(), 0);
});

test('concurrent duplicate signup returns a conflict acknowledgement instead of a server failure', async (t) => {
  const f = await fixture(t);
  t.mock.method(mongoose.model('User'), 'findOne', async () => null);
  t.mock.method(mongoose.model('User').prototype, 'save', async () => {
    throw Object.assign(new Error('private'), { code: 11000 });
  });
  const response = await f.request('/api/auth/signup', {
    name: 'Member',
    email: f.user.email,
    password: 'Example-password-1'
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, 'Email already registered!');
});

test('write validation rejects missing, operator-valued, blank and oversized fields before persistence', async (t) => {
  const f = await fixture(t);
  const token = await f.login();
  for (const [path, model, valid] of [
    ['/api/contact', 'Contact', { name: 'Reader', email: 'reader@example.invalid', message: 'Hi' }],
    [
      '/api/emergency',
      'Emergency',
      { name: 'Reader', email: 'reader@example.invalid', mobile: '123', problem: 'Help' }
    ],
    ['/api/blogs', 'Blog', { title: 'Title', author: 'Author', content: 'Text' }],
    [
      '/api/news',
      'News',
      { title: 'Title', summary: 'Summary', fullDetails: 'Details', type: 'News' }
    ],
    ['/api/chat', 'Chat', { message: 'Hi' }]
  ]) {
    const save = t.mock.method(mongoose.model(model).prototype, 'save', async () => {
      throw new Error('Must not save');
    });
    for (const field of Object.keys(valid)) {
      for (const value of [undefined, {}, ['text'], ' ', 'x'.repeat(50001)]) {
        const response = await f.request(
          path,
          { ...valid, [field]: value, ...(model === 'Blog' ? { adminPassword } : {}) },
          token
        );
        // The parser allows 100 KiB; every oversized test here remains below it.
        assert.equal(response.status, 400, `${path}: ${field}`);
      }
    }
    assert.equal(save.mock.callCount(), 0);
  }
});

test('news missing records and malformed IDs produce accurate client errors', async (t) => {
  const f = await fixture(t);
  for (const [method, path, operation] of [
    ['PUT', '/api/news/approve/', 'findByIdAndUpdate'],
    ['DELETE', '/api/news/', 'findByIdAndDelete']
  ]) {
    const query = t.mock.method(mongoose.model('News'), operation, async () => null);
    assert.equal((await f.request(path + 'invalid', { adminPassword }, null, method)).status, 400);
    assert.equal(query.mock.callCount(), 0);
    assert.equal((await f.request(path + id, { adminPassword }, null, method)).status, 404);
  }
});

test('chat selects the newest 100 records with deterministic order and serves them chronologically', async (t) => {
  const f = await fixture(t);
  const records = Array.from({ length: 105 }, (_, index) => ({ message: String(index) }));
  t.mock.method(mongoose.model('Chat'), 'find', () => ({
    sort: (order) => {
      assert.deepEqual(order, { timestamp: -1, _id: -1 });
      return {
        limit: (size) => {
          assert.equal(size, 100);
          return records.toReversed().slice(0, size);
        }
      };
    }
  }));
  const response = await f.request('/api/chat');
  assert.deepEqual(
    (await response.json()).map((row) => row.message),
    records.slice(5).map((row) => row.message)
  );
});

test('health, unknown routes and dependency failures return redacted JSON with safe headers', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/health/live')).status, 200);
  assert.equal((await f.request('/health/ready')).status, 503);
  const unknown = await f.request('/missing');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.headers.get('x-powered-by'), null);
  assert.equal(unknown.headers.get('cache-control'), 'no-store');
  assert.equal(unknown.headers.get('x-content-type-options'), 'nosniff');
  const token = await f.login();
  t.mock.method(Session, 'findOne', () => {
    throw new Error('sensitive database details');
  });
  t.mock.method(console, 'error', () => {});
  const failed = await f.request('/api/chat', { message: 'Hello' }, token);
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { success: false, message: 'Server error' });
});

test('invalid ports fail before attempting a database connection', async (t) => {
  const connect = t.mock.method(mongoose, 'connect', () => {
    throw new Error('Must not connect');
  });
  for (const PORT of ['', '-1', '65536', 'named-pipe', '1.5']) {
    await assert.rejects(
      startServer({ env: { ADMIN_SECRET: adminPassword, MONGO_URI: 'mock-only', PORT } }),
      /PORT/
    );
  }
  assert.equal(connect.mock.callCount(), 0);
});

test('list pagination is bounded, deterministic and indicates whether another page exists', async (t) => {
  const f = await fixture(t);
  const { queryRows } = require('./helpers/query');
  const rows = Array.from({ length: 105 }, (_, index) => ({ title: String(index) }));
  const find = t.mock.method(mongoose.model('Blog'), 'find', () => ({
    sort(order) {
      assert.deepEqual(order, { date: -1, _id: -1 });
      return queryRows(rows);
    }
  }));
  const first = await f.request('/api/blogs');
  assert.equal((await first.json()).length, 100);
  assert.equal(first.headers.get('x-has-more'), 'true');
  const last = await f.request('/api/blogs?offset=100&limit=100');
  assert.deepEqual(await last.json(), rows.slice(100));
  assert.equal(last.headers.get('x-has-more'), 'false');
  for (const query of ['limit=101', 'offset=-1', 'offset=10001', 'limit=0', 'limit=1&limit=2']) {
    assert.equal((await f.request(`/api/blogs?${query}`)).status, 400);
  }
  assert.equal(find.mock.callCount(), 2);
});

test('invalid breach addresses never reach the external provider', async (t) => {
  const f = await fixture(t);
  // Capture the native transport before replacing the provider-facing global.
  const nativeFetch = globalThis.fetch;
  const upstream = t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.equal(new URL(url).hostname, '127.0.0.1');
    return nativeFetch(url, options);
  });
  const response = await f.request('/api/breach/not-an-email');
  assert.equal(response.status, 400);
  assert.equal(upstream.mock.callCount(), 1);
});

test('shutdown is idempotent and drains HTTP before disconnecting the database', async () => {
  const signals = new EventEmitter();
  const events = [];
  let finish;
  const server = {
    app: { locals: {} },
    close: (callback) => {
      events.push('close');
      finish = callback;
    },
    closeAllConnections() {}
  };
  const shutdown = installShutdown(server, {
    signals,
    disconnect: async () => events.push('disconnect')
  });
  const pending = shutdown();
  assert.equal(shutdown(), pending);
  assert.equal(server.app.locals.draining, true);
  assert.deepEqual(events, ['close']);
  finish();
  await pending;
  assert.deepEqual(events, ['close', 'disconnect']);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
  assert.equal(signals.listenerCount('SIGINT'), 0);
});
