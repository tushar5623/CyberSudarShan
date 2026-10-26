const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');

// Characterization tests exercise the current HTTP contract, not a live database.
// Keep this file independent of security.test.js so that suite remains unchanged.
mongoose.set('bufferCommands', false);
const adminPassword = 'contract-test-only-secret';
const frontendOrigin = 'https://frontend.example.invalid';
const id = '507f1f77bcf86cd799439011';
const date = '2026-01-01T00:00:00.000Z';
const blog = { _id: id, title: 'Security update', author: 'Editor', content: 'Details', date };
const news = { _id: id, title: 'News', summary: 'Summary', fullDetails: 'Details',
  type: 'News', status: 'approved', date };

async function fixture(t, env = {}) {
  const app = createApp({ env: { ADMIN_SECRET: adminPassword, CORS_ALLOWED_ORIGINS: frontendOrigin, ...env } });
  const unexpected = () => { throw new Error('Unexpected database operation in contract test'); };
  t.mock.method(mongoose, 'connect', unexpected);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request'); });
  for (const name of ['Contact', 'Emergency', 'User', 'Blog', 'News', 'Chat']) {
    const Model = mongoose.model(name);
    t.mock.method(Model.prototype, 'save', unexpected);
    for (const method of ['find', 'findOne', 'findByIdAndUpdate', 'findByIdAndDelete']) {
      t.mock.method(Model, method, unexpected);
    }
  }
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  return (method, route, body) => new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: server.address().port,
      method, path: route, headers: data === undefined ? { Origin: frontendOrigin } : {
        Origin: frontendOrigin, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)
      } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(text) }); }
        catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.end(data);
  });
}

function expectResponse(response, status, body) {
  assert.equal(response.status, status);
  assert.match(response.headers['content-type'], /^application\/json\b/);
  assert.deepEqual(response.body, body);
}

test('contract: contact and emergency return their existing acknowledgements after saving input', async t => {
  const request = await fixture(t);
  for (const [model, route, input, message] of [
    ['Contact', '/api/contact', { name: 'Reader', email: 'reader@example.invalid', message: 'Hello' }, 'Data Saved to Cloud!'],
    ['Emergency', '/api/emergency', { name: 'Reader', email: 'reader@example.invalid', mobile: '1234567890', problem: 'Incident' },
      'Emergency reported successfully! We will contact you soon.']
  ]) {
    const saved = [];
    t.mock.method(mongoose.model(model).prototype, 'save', async function () {
      assert.equal(this.validateSync(), undefined);
      saved.push(this.toObject());
      return this;
    });
    expectResponse(await request('POST', route, input), 201, { message });
    assert.equal(saved.length, 1);
    for (const [key, value] of Object.entries(input)) assert.equal(saved[0][key], value);
  }
});

test('contract: signup/login expose only public user fields and preserve credential error responses', async t => {
  const request = await fixture(t);
  const User = mongoose.model('User');
  const input = { name: 'Member', email: 'member@example.invalid', password: 'Synthetic-password-1' };
  let saved;
  t.mock.method(User, 'findOne', async () => saved || null);
  t.mock.method(User.prototype, 'save', async function () { saved = this; return this; });
  const user = { name: input.name, email: input.email };
  expectResponse(await request('POST', '/api/auth/signup', input), 201,
    { success: true, message: 'Account created successfully!', user });
  assert.equal(await bcrypt.compare(input.password, saved.password), true);
  expectResponse(await request('POST', '/api/auth/login', input), 200,
    { success: true, message: 'Login successful!', user });
  expectResponse(await request('POST', '/api/auth/signup', input), 400,
    { success: false, message: 'Email already registered!' });
  expectResponse(await request('POST', '/api/auth/login', { ...input, password: 'incorrect' }), 400,
    { success: false, message: 'Invalid credentials!' });
  saved = null;
  expectResponse(await request('POST', '/api/auth/login', input), 404,
    { success: false, message: 'User not found!' });
});

test('contract: blog creation returns a document and public listing returns an array', async t => {
  const request = await fixture(t);
  const Blog = mongoose.model('Blog');
  let stored;
  t.mock.method(Blog.prototype, 'save', async function () {
    assert.equal(this.validateSync(), undefined);
    stored = this.toObject();
    return this;
  });
  const created = await request('POST', '/api/blogs', {
    title: blog.title, author: blog.author, content: blog.content, adminPassword
  });
  expectResponse(created, 201, JSON.parse(JSON.stringify(stored)));
  assert.equal(created.body.content, blog.content);
  assert.match(created.body._id, /^[0-9a-f]{24}$/);
  assert.ok(Number.isFinite(Date.parse(created.body.date)));
  assert.equal(Object.hasOwn(created.body, 'adminPassword'), false);
  t.mock.method(Blog, 'find', () => ({ sort: () => [blog] }));
  expectResponse(await request('GET', '/api/blogs'), 200, [blog]);
});

test('contract: admin verification and blog mutation acknowledgements and missing-record errors', async t => {
  const request = await fixture(t);
  const Blog = mongoose.model('Blog');
  let exists = true;
  const updates = [];
  t.mock.method(Blog, 'findByIdAndUpdate', async (key, update) => {
    updates.push({ key, update });
    return exists ? { ...blog, ...update } : null;
  });
  t.mock.method(Blog, 'findByIdAndDelete', async () => exists ? blog : null);
  expectResponse(await request('POST', '/api/verify-admin', { password: adminPassword }), 200, { success: true });
  const input = { title: 'Edited', author: 'Editor', content: 'Updated', adminPassword };
  expectResponse(await request('PUT', `/api/blogs/${id}`, input), 200,
    { success: true, message: 'Blog updated successfully!' });
  assert.deepEqual(updates, [{ key: id, update: { title: 'Edited', author: 'Editor', content: 'Updated' } }]);
  expectResponse(await request('DELETE', `/api/blogs/${id}`, { adminPassword }), 200,
    { success: true, message: 'Blog deleted successfully!' });
  exists = false;
  for (const method of ['PUT', 'DELETE']) {
    expectResponse(await request(method, `/api/blogs/${id}`, input), 404,
      { success: false, message: 'Blog not found' });
  }
  expectResponse(await request('POST', '/api/verify-admin', { password: 'incorrect' }), 401,
    { success: false, error: 'Unauthorized', message: 'Invalid admin credentials.' });
});

test('contract: news submission acknowledgements preserve pending/public and approved/admin flows', async t => {
  const request = await fixture(t);
  const News = mongoose.model('News');
  const saved = [];
  t.mock.method(News.prototype, 'save', async function () {
    assert.equal(this.validateSync(), undefined);
    saved.push(this.toObject());
    return this;
  });
  const input = { title: news.title, summary: news.summary, fullDetails: news.fullDetails, type: news.type };
  expectResponse(await request('POST', '/api/news', { ...input, status: 'approved', role: 'admin' }), 201,
    { success: true, message: 'Sent for verification!' });
  expectResponse(await request('POST', '/api/news', { ...input, adminPassword }), 201,
    { success: true, message: 'News Live!' });
  assert.deepEqual(saved.map(record => record.status), ['pending', 'approved']);
  const pending = { ...news, _id: '507f1f77bcf86cd799439012', status: 'pending' };
  t.mock.method(News, 'find', (filter = {}) => ({ sort: () =>
    [news, pending].filter(record => !filter.status || record.status === filter.status) }));
  expectResponse(await request('GET', '/api/news'), 200, [news]);
  expectResponse(await request('POST', '/api/news/admin', { adminPassword }), 200, [news, pending]);
});

test('contract: news moderation returns existing success bodies after authorized changes', async t => {
  const request = await fixture(t);
  const News = mongoose.model('News');
  const update = t.mock.method(News, 'findByIdAndUpdate', async () => news);
  const remove = t.mock.method(News, 'findByIdAndDelete', async () => news);
  expectResponse(await request('PUT', `/api/news/approve/${id}`, { adminPassword }), 200,
    { success: true, message: 'News Approved & Live!' });
  assert.deepEqual(update.mock.calls[0].arguments, [id, { status: 'approved' }]);
  expectResponse(await request('DELETE', `/api/news/${id}`, { adminPassword }), 200,
    { success: true, message: 'News deleted!' });
  assert.deepEqual(remove.mock.calls[0].arguments, [id]);
});

test('contract: chat reads serialize messages and writes preserve sender fallback and empty-message rejection', async t => {
  const request = await fixture(t);
  const Chat = mongoose.model('Chat');
  const messages = [{ _id: id, sender: 'Reader', message: 'Hello', timestamp: date }];
  t.mock.method(Chat, 'find', () => ({ sort: () => ({ limit: () => messages }) }));
  expectResponse(await request('GET', '/api/chat'), 200, messages);
  const saved = [];
  t.mock.method(Chat.prototype, 'save', async function () { saved.push(this.toObject()); return this; });
  for (const body of [{ sender: 'Reader', message: 'Hello' }, { message: 'Anonymous message' }]) {
    expectResponse(await request('POST', '/api/chat', body), 201, { success: true, message: 'Message sent!' });
  }
  assert.deepEqual(saved.map(record => record.sender), ['Reader', 'Anonymous User']);
  expectResponse(await request('POST', '/api/chat', { message: '' }), 400,
    { success: false, message: 'Message is required' });
  assert.equal(saved.length, 2);
});

test('contract: breach success bodies are preserved and network failure is not safe', async t => {
  const request = await fixture(t);
  const endpoint = '/api/breach/reader@example.invalid';
  t.mock.method(globalThis, 'fetch', async () => ({ status: 200, json: async () => ({ breaches: [] }) }));
  expectResponse(await request('GET', endpoint), 200, { safe: true });
  t.mock.method(globalThis, 'fetch', async () => ({ status: 200,
    json: async () => ({ breaches: [['BreachOne'], ['BreachTwo']] }) }));
  expectResponse(await request('GET', endpoint), 200, { safe: false, breaches: ['BreachOne', 'BreachTwo'] });
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Synthetic provider failure'); });
  expectResponse(await request('GET', endpoint), 502,
    { error: 'Breach lookup unavailable. Please try again later.' });
});

test('security: breach 404 is not safe and preserves the provider URL without parsing the error body', async t => {
  const request = await fixture(t);
  const parse = t.mock.fn(async () => { throw new Error('404 body must not be parsed'); });
  const upstream = t.mock.method(globalThis, 'fetch', async () => ({ status: 404, json: parse }));
  t.mock.method(console, 'error', () => {});
  expectResponse(await request('GET', '/api/breach/reader%2Btag@example.invalid'), 502,
    { error: 'Breach lookup unavailable. Please try again later.' });
  assert.equal(upstream.mock.callCount(), 1);
  assert.equal(upstream.mock.calls[0].arguments[0],
    'https://api.xposedornot.com/v1/check-email/reader+tag@example.invalid');
  assert.equal(upstream.mock.calls[0].arguments[1].redirect, 'error');
  assert.ok(upstream.mock.calls[0].arguments[1].signal instanceof AbortSignal);
  assert.equal(parse.mock.callCount(), 0);
});

test('security: breach provider HTTP errors and unexpected JSON cannot return safe', async t => {
  const request = await fixture(t);
  t.mock.method(console, 'error', () => {});
  for (const [status, body] of [
    [429, { error: 'Synthetic provider quota exceeded' }],
    [500, { error: 'Synthetic provider unavailable' }],
    [200, {}], [200, { breaches: 'unexpected shape' }]
  ]) {
    const parse = t.mock.fn(async () => body);
    const upstream = t.mock.method(globalThis, 'fetch', async () => ({ status,
      ok: status >= 200 && status < 300, json: parse }));
    expectResponse(await request('GET', '/api/breach/reader@example.invalid'), 502,
      { error: 'Breach lookup unavailable. Please try again later.' });
    assert.equal(upstream.mock.callCount(), 1);
    assert.equal(parse.mock.callCount(), status === 200 ? 1 : 0);
  }
});

test('security: breach invalid provider JSON returns a redacted gateway-error body and log', async t => {
  const request = await fixture(t);
  const failure = new SyntaxError('Synthetic invalid provider JSON');
  const log = t.mock.method(console, 'error', () => {});
  const parse = t.mock.fn(async () => { throw failure; });
  t.mock.method(globalThis, 'fetch', async () => ({ status: 200, json: parse }));
  expectResponse(await request('GET', '/api/breach/reader@example.invalid'), 502,
    { error: 'Breach lookup unavailable. Please try again later.' });
  assert.equal(parse.mock.callCount(), 1);
  assert.equal(log.mock.callCount(), 1);
  assert.deepEqual(log.mock.calls[0].arguments, ['Breach lookup provider request failed.']);
});

test('contract: valid breach arrays retain both successful response shapes and original entries', async t => {
  const request = await fixture(t);
  for (const [breaches, expected] of [
    [[], { safe: true }],
    [[[]], { safe: true }],
    [[['BreachOne', 'BreachTwo']], { safe: false, breaches: ['BreachOne', 'BreachTwo'] }],
    [['BreachOne', ['BreachTwo']], { safe: false, breaches: ['BreachOne', 'BreachTwo'] }]
  ]) {
    let signal;
    const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
      signal = options.signal;
      assert.equal(signal.aborted, false);
      return { status: 200, json: async () => ({ breaches, status: 'success', email: 'reader@example.invalid' }) };
    });
    expectResponse(await request('GET', '/api/breach/reader@example.invalid'), 200, expected);
    assert.equal(upstream.mock.callCount(), 1);
    assert.equal(signal.aborted, true, 'Provider resources are aborted after response consumption');
  }
});

test('security: null, malformed breach entries and contradictory provider envelopes are not safe', async t => {
  const request = await fixture(t, { BREACH_RATE_LIMIT_MAX: '30' });
  const log = t.mock.method(console, 'error', () => {});
  const bodies = [null, [], 'unexpected', 42, { breaches: null },
    { breaches: [null] }, { breaches: [42] }, { breaches: [{}] },
    { breaches: [''] }, { breaches: ['  '] }, { breaches: [[['TooDeep']]] },
    { breaches: [], error: 'Sensitive upstream content' },
    { breaches: [], Error: 'Not found', email: null },
    { breaches: [], errors: [] }, { breaches: [], status: 'error' }];
  for (const body of bodies) {
    const upstream = t.mock.method(globalThis, 'fetch', async () => ({ status: 200, json: async () => body }));
    expectResponse(await request('GET', '/api/breach/reader@example.invalid'), 502,
      { error: 'Breach lookup unavailable. Please try again later.' });
    assert.equal(upstream.mock.callCount(), 1);
  }
  assert.equal(log.mock.callCount(), bodies.length);
  assert.ok(log.mock.calls.every(call => call.arguments.length === 1 &&
    call.arguments[0] === 'Breach lookup provider request failed.'));
});

for (const phase of ['request', 'JSON body']) {
  test(`security: breach timeout during ${phase} returns 504 and aborts once`, async t => {
    const request = await fixture(t);
    t.mock.timers.enable({ apis: ['setTimeout'] });
    // Let Node's one-time MockTimers warning flush before asserting application logs.
    await new Promise(resolve => setImmediate(resolve));
    const log = t.mock.method(console, 'error', () => {});
    let reached;
    const waiting = new Promise(resolve => { reached = resolve; });
    let signal;
    let aborts = 0;
    const waitForAbort = () => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        aborts++;
        reject(new Error('Sensitive timeout implementation detail'));
      }, { once: true });
      reached();
    });
    const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
      signal = options.signal;
      return phase === 'request' ? waitForAbort() : { status: 200, json: waitForAbort };
    });
    const pending = request('GET', '/api/breach/reader@example.invalid');
    await waiting;
    t.mock.timers.tick(9999);
    assert.equal(signal.aborted, false);
    t.mock.timers.tick(1);
    expectResponse(await pending, 504, { error: 'Breach lookup unavailable. Please try again later.' });
    assert.equal(upstream.mock.callCount(), 1);
    assert.equal(signal.aborted, true);
    assert.equal(aborts, 1);
    assert.equal(log.mock.callCount(), 1);
    assert.deepEqual(log.mock.calls[0].arguments, ['Breach lookup provider request failed.']);
  });
}

test('security: a valid-looking provider result arriving after the deadline cannot return safe', async t => {
  const request = await fixture(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await new Promise(resolve => setImmediate(resolve));
  const log = t.mock.method(console, 'error', () => {});
  let reached;
  const waiting = new Promise(resolve => { reached = resolve; });
  const upstream = t.mock.method(globalThis, 'fetch', async (url, { signal }) => {
    return { status: 200, json: () => new Promise(resolve => {
      signal.addEventListener('abort', () => resolve({ breaches: [] }), { once: true });
      reached();
    }) };
  });
  const pending = request('GET', '/api/breach/reader@example.invalid');
  await waiting;
  t.mock.timers.tick(10000);
  expectResponse(await pending, 504, { error: 'Breach lookup unavailable. Please try again later.' });
  assert.equal(upstream.mock.callCount(), 1);
  assert.equal(log.mock.callCount(), 1);
  assert.deepEqual(log.mock.calls[0].arguments, ['Breach lookup provider request failed.']);
});

test('contract: dependency failures retain endpoint-specific JSON error envelopes', async t => {
  const request = await fixture(t);
  t.mock.method(console, 'error', () => {});
  // Unconfigured persistence mocks intentionally throw; no database is involved.
  for (const [method, route, input, body] of [
    ['POST', '/api/contact', { name: 'Reader' }, { error: 'Failed to save data' }],
    ['POST', '/api/emergency', { name: 'Reader' }, { message: 'Server Error! Please try again.' }],
    ['GET', '/api/blogs', undefined, { error: 'Failed to fetch blogs' }],
    ['POST', '/api/blogs', { adminPassword }, { error: 'Failed to post blog' }],
    ['GET', '/api/news', undefined, { success: false, message: 'Error fetching news' }],
    ['POST', '/api/news', { title: 'News' }, { success: false, message: 'Server error' }],
    ['POST', '/api/news/admin', { adminPassword }, { success: false, message: 'Server error' }],
    ['GET', '/api/chat', undefined, { success: false, message: 'Error fetching chats' }],
    ['POST', '/api/chat', { message: 'Hello' }, { success: false, message: 'Server error' }]
  ]) {
    expectResponse(await request(method, route, input), 500, body);
  }
});

test('contract: extracted contacts retain optional fields and the existing model identity', async t => {
  const request = await fixture(t);
  const Contact = mongoose.model('Contact');
  assert.strictEqual(Contact, require('../src/modules/contacts/model'));
  assert.equal(Contact.collection.collectionName, 'contacts');
  let stored;
  t.mock.method(Contact.prototype, 'save', async function () {
    assert.equal(this.validateSync(), undefined);
    stored = this.toObject();
    return this;
  });
  expectResponse(await request('POST', '/api/contact', {}), 201, { message: 'Data Saved to Cloud!' });
  assert.equal(stored.name, undefined);
  assert.equal(stored.email, undefined);
  assert.equal(stored.message, undefined);
  assert.ok(stored.date instanceof Date);
});

test('contract: extracted emergencies retain required fields and the existing validation-error response', async t => {
  const request = await fixture(t);
  const Emergency = mongoose.model('Emergency');
  assert.strictEqual(Emergency, require('../models/Emergency'));
  assert.strictEqual(Emergency, require('../src/modules/emergencies/model'));
  assert.equal(Emergency.collection.collectionName, 'emergencies');
  const errors = t.mock.method(console, 'error', () => {});
  let validationAttempts = 0;
  let persisted = 0;
  t.mock.method(Emergency.prototype, 'save', async function () {
    validationAttempts++;
    const error = this.validateSync();
    if (error) throw error;
    persisted++;
    return this;
  });
  const valid = { name: 'Reader', email: 'reader@example.invalid', mobile: '1234567890', problem: 'Incident' };
  for (const field of Object.keys(valid)) {
    const input = { ...valid };
    delete input[field];
    expectResponse(await request('POST', '/api/emergency', input), 500,
      { message: 'Server Error! Please try again.' });
  }
  assert.equal(validationAttempts, 4);
  assert.equal(persisted, 0);
  assert.equal(errors.mock.callCount(), 4);
});

test('contract: extracted public routers retain JSON parsing, CORS and independent rate-limit middleware', async t => {
  const request = await fixture(t, { PUBLIC_WRITE_RATE_LIMIT_MAX: '1' });
  for (const [name, route, input, message] of [
    ['Contact', '/api/contact', { name: 'Reader', email: 'reader@example.invalid', message: 'Hello' }, 'Data Saved to Cloud!'],
    ['Emergency', '/api/emergency', { name: 'Reader', email: 'reader@example.invalid', mobile: '1234567890', problem: 'Incident' },
      'Emergency reported successfully! We will contact you soon.']
  ]) {
    const save = t.mock.method(mongoose.model(name).prototype, 'save', async function () {
      assert.equal(this.validateSync(), undefined);
      for (const [field, value] of Object.entries(input)) assert.equal(this[field], value);
      return this;
    });
    const success = await request('POST', route, input);
    expectResponse(success, 201, { message });
    assert.equal(success.headers['access-control-allow-origin'], frontendOrigin);
    const limited = await request('POST', route, input);
    expectResponse(limited, 429, { success: false, error: 'Too many requests. Please try again later.',
      message: 'Too many requests. Please try again later.' });
    assert.equal(limited.headers['access-control-allow-origin'], frontendOrigin);
    assert.ok(Number(limited.headers['retry-after']) > 0);
    assert.ok(limited.headers.ratelimit);
    assert.ok(limited.headers['ratelimit-policy']);
    assert.equal(save.mock.callCount(), 1);
  }
});

test('contract: extracted login accepts an existing bcrypt hash without rewriting credentials', async t => {
  const request = await fixture(t);
  const User = mongoose.model('User');
  assert.strictEqual(User, require('../src/modules/auth/model'));
  assert.equal(User.collection.collectionName, 'users');
  const password = 'Synthetic-existing-password';
  const existingHash = await bcrypt.hash(password, 10);
  const existingUser = new User({ name: 'Existing member', email: 'existing@example.invalid', password: existingHash });
  const find = t.mock.method(User, 'findOne', async () => existingUser);
  const save = t.mock.method(User.prototype, 'save', async () => { throw new Error('Login must not rewrite credentials'); });
  const response = await request('POST', '/api/auth/login', { email: existingUser.email, password });
  expectResponse(response, 200, { success: true, message: 'Login successful!',
    user: { name: existingUser.name, email: existingUser.email } });
  assert.deepEqual(find.mock.calls[0].arguments, [{ email: existingUser.email }]);
  assert.equal(existingUser.password, existingHash);
  assert.equal(save.mock.callCount(), 0);
  assert.equal(response.headers['set-cookie'], undefined);
});

test('contract: extracted signup retains bcrypt cost and duplicate-account no-write behavior', async t => {
  const request = await fixture(t);
  const User = mongoose.model('User');
  const input = { name: 'New member', email: 'new@example.invalid', password: 'Synthetic-new-password' };
  let stored;
  t.mock.method(User, 'findOne', async () => stored || null);
  const save = t.mock.method(User.prototype, 'save', async function () {
    assert.equal(this.validateSync(), undefined);
    stored = this;
    return this;
  });
  const hash = t.mock.method(bcrypt, 'hash');
  expectResponse(await request('POST', '/api/auth/signup', input), 201,
    { success: true, message: 'Account created successfully!', user: { name: input.name, email: input.email } });
  assert.notEqual(stored.password, input.password);
  assert.equal(bcrypt.getRounds(stored.password), 10);
  assert.equal(await bcrypt.compare(input.password, stored.password), true);
  expectResponse(await request('POST', '/api/auth/signup', input), 400,
    { success: false, message: 'Email already registered!' });
  assert.equal(save.mock.callCount(), 1);
  assert.equal(hash.mock.callCount(), 1);
});

test('contract: extracted chat preserves message text, supplied sender and server timestamp storage', async t => {
  const request = await fixture(t);
  const Chat = mongoose.model('Chat');
  assert.strictEqual(Chat, require('../src/modules/chat/model'));
  assert.equal(Chat.collection.collectionName, 'chats');
  const input = { sender: 'Unverified display name', message: '  Original text\nwith whitespace  ',
    timestamp: '2000-01-01T00:00:00.000Z', role: 'admin' };
  const before = Date.now();
  let stored;
  t.mock.method(Chat.prototype, 'save', async function () {
    assert.equal(this.validateSync(), undefined);
    stored = this.toObject();
    return this;
  });
  expectResponse(await request('POST', '/api/chat', input), 201, { success: true, message: 'Message sent!' });
  assert.equal(stored.sender, input.sender);
  assert.equal(stored.message, input.message);
  assert.ok(stored.timestamp instanceof Date);
  assert.ok(stored.timestamp.getTime() >= before && stored.timestamp.getTime() <= Date.now());
  assert.equal(Object.hasOwn(stored, 'role'), false);
});
