import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createServer } from 'vite';

const backendRequire = createRequire(new URL('../../backend/server.js', import.meta.url));
const { createApp } = backendRequire('./src/app');
const mongoose = backendRequire('mongoose');
const bcrypt = backendRequire('bcryptjs');
const frontendOrigin = 'http://127.0.0.1:5173';
const adminPassword = 'integration-only-not-a-real-secret';

// Actual Vite-transformed frontend transport -> actual loopback Express HTTP.
// Only persistence and the external provider boundary are faked. No dotenv/DB.
async function fixture(t, env = {}) {
  const forbidden = () => { throw new Error('Database access forbidden in transport integration test'); };
  t.mock.method(mongoose, 'connect', forbidden);
  t.mock.method(mongoose, 'createConnection', forbidden);
  const app = createApp({ env: { ADMIN_SECRET: adminPassword, CORS_ALLOWED_ORIGINS: frontendOrigin, ...env } });
  app.set('env', 'test');
  const records = {};
  const failures = new Set();
  for (const name of ['Contact', 'Emergency', 'User', 'Blog', 'News', 'Chat']) {
    const Model = mongoose.model(name);
    const rows = records[name] = [];
    t.mock.method(Model.prototype, 'save', async function () {
      await this.validate();
      const row = this.toObject();
      rows.push(row);
      return this;
    });
    t.mock.method(Model, 'findOne', async query => rows.find(row => row.email === query.email) ?? null);
    t.mock.method(Model, 'find', (query = {}) => ({ sort(order) {
      if (failures.has(name)) throw new Error('Synthetic persistence failure');
      const [key, direction] = Object.entries(order)[0];
      const result = rows.filter(row => Object.entries(query).every(([key, value]) => row[key] === value))
        .sort((a, b) => (new Date(a[key]) - new Date(b[key])) * direction);
      return Object.assign(Promise.resolve(result), { limit: size => Promise.resolve(result.slice(0, size)) });
    } }));
    t.mock.method(Model, 'findByIdAndUpdate', async (id, fields) => {
      const row = rows.find(row => String(row._id) === id);
      return row ? Object.assign(row, fields) : null;
    });
    t.mock.method(Model, 'findByIdAndDelete', async id => {
      const index = rows.findIndex(row => String(row._id) === id);
      return index < 0 ? null : rows.splice(index, 1)[0];
    });
  }

  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const provider = { status: 200, body: { breaches: [] }, networkFailure: false, calls: 0 };
  const nativeFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, options) => {
    const target = new URL(url);
    if (target.origin === origin) return nativeFetch(url, options);
    if (target.href === 'https://api.xposedornot.com/v1/check-email/reader@example.invalid') {
      provider.calls++;
      if (provider.networkFailure) return Promise.reject(new Error('Synthetic provider failure'));
      return Promise.resolve(new Response(JSON.stringify(provider.body), { status: provider.status }));
    }
    throw new Error('Unexpected non-loopback request blocked');
  });

  const previous = process.env.VITE_API_BASE_URL;
  process.env.VITE_API_BASE_URL = origin;
  t.after(() => {
    if (previous === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = previous;
  });
  const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false, envFile: false, appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] } });
  t.after(() => vite.close());
  const api = await vite.ssrLoadModule('/src/lib/api.js');
  const chat = await vite.ssrLoadModule('/src/lib/chatSend.js');
  assert.equal(api.API_BASE_URL, origin);
  assert.equal(mongoose.connection.readyState, 0);
  const request = (path, method = 'GET', body) => api.apiRequest(path, {
    method, headers: { Origin: frontendOrigin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { api, chat, request, records, failures, provider, origin };
}

async function expectJson(response, status, body) {
  assert.equal(response.status, status);
  assert.equal(response.ok, status >= 200 && status < 300);
  assert.equal(response.headers.get('access-control-allow-origin'), frontendOrigin);
  const data = await response.json();
  assert.deepEqual(data, body);
  if (!response.ok) assert.deepEqual(response.error.body, body);
  return data;
}

test('integration: Vite local origin, CORS preflight, contact and emergency contracts', async t => {
  const { api, request, records } = await fixture(t);
  const preflight = await api.apiRequest('/api/contact', { method: 'OPTIONS', headers: {
    Origin: frontendOrigin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'
  } });
  assert.equal(preflight.status, 204);
  assert.equal(await preflight.json(), null);
  assert.equal(preflight.headers.get('access-control-allow-origin'), frontendOrigin);
  assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
  assert.equal(preflight.headers.get('access-control-allow-headers'), 'content-type');
  for (const [name, path, input, message] of [
    ['Contact', '/api/contact', { name: 'Reader', email: 'reader@example.invalid', message: 'Hello' }, 'Data Saved to Cloud!'],
    ['Emergency', '/api/emergency', { name: 'Reader', email: 'reader@example.invalid', mobile: '1234567890', problem: 'Test' },
      'Emergency reported successfully! We will contact you soon.']
  ]) {
    await expectJson(await request(path, 'POST', input), 201, { message });
    assert.equal(records[name].length, 1);
    for (const [key, value] of Object.entries(input)) assert.equal(records[name][0][key], value);
  }
});

test('integration: signup, hashed-password login and existing account errors', async t => {
  const { request, records } = await fixture(t);
  const input = { name: 'Reader', email: 'reader@example.invalid', password: 'Synthetic-password-1!' };
  const user = { name: input.name, email: input.email };
  await expectJson(await request('/api/auth/signup', 'POST', input), 201,
    { success: true, message: 'Account created successfully!', user });
  assert.equal(await bcrypt.compare(input.password, records.User[0].password), true);
  assert.notEqual(records.User[0].password, input.password);
  await expectJson(await request('/api/auth/login', 'POST', input), 200,
    { success: true, message: 'Login successful!', user });
  await expectJson(await request('/api/auth/signup', 'POST', input), 400,
    { success: false, message: 'Email already registered!' });
  await expectJson(await request('/api/auth/login', 'POST', { ...input, password: 'incorrect' }), 400,
    { success: false, message: 'Invalid credentials!' });
  await expectJson(await request('/api/auth/login', 'POST', { ...input, email: 'absent@example.invalid' }), 404,
    { success: false, message: 'User not found!' });
});

test('integration: blogs retain CRUD authorization, array reads and HTTP failure metadata', async t => {
  const { request, records, failures } = await fixture(t);
  const unauthorized = { success: false, error: 'Unauthorized', message: 'Invalid admin credentials.' };
  await expectJson(await request('/api/blogs'), 200, []);
  await expectJson(await request('/api/blogs', 'POST', { title: 'Denied' }), 401, unauthorized);
  assert.equal(records.Blog.length, 0);
  await expectJson(await request('/api/verify-admin', 'POST', { password: adminPassword }), 200, { success: true });
  const input = { title: 'Test', author: 'Editor', content: 'Details', adminPassword };
  const created = await request('/api/blogs', 'POST', input);
  assert.equal(created.status, 201);
  const blog = await created.json();
  assert.equal(blog.content, input.content);
  const listing = await (await request('/api/blogs')).json();
  assert.deepEqual(listing, [blog]);
  await expectJson(await request(`/api/blogs/${blog._id}`, 'PUT', { ...input, title: 'Updated' }), 200,
    { success: true, message: 'Blog updated successfully!' });
  await expectJson(await request(`/api/blogs/${blog._id}`, 'DELETE', { adminPassword }), 200,
    { success: true, message: 'Blog deleted successfully!' });
  assert.equal(records.Blog.length, 0);
  failures.add('Blog');
  await expectJson(await request('/api/blogs'), 500, { error: 'Failed to fetch blogs' });
});

test('integration: news stays pending, rejects unauthorized publication and supports admin moderation', async t => {
  const { request, records, failures } = await fixture(t);
  const input = { title: 'Test news', summary: 'Summary', fullDetails: 'Details', type: 'News', imageUrl: '' };
  await expectJson(await request('/api/news', 'POST', { ...input, status: 'approved', role: 'admin' }), 201,
    { success: true, message: 'Sent for verification!' });
  assert.equal(records.News[0].status, 'pending');
  await expectJson(await request('/api/news'), 200, []);
  assert.equal((await request('/api/news', 'POST', { ...input, adminPassword: 'incorrect' })).status, 401);
  assert.equal(records.News.length, 1);
  const id = String(records.News[0]._id);
  for (const [path, method] of [['/api/news/admin', 'POST'], [`/api/news/approve/${id}`, 'PUT'], [`/api/news/${id}`, 'DELETE']]) {
    assert.equal((await request(path, method, {})).status, 401);
  }
  assert.equal(records.News[0].status, 'pending');
  const adminList = await request('/api/news/admin', 'POST', { adminPassword });
  assert.equal(adminList.status, 200);
  assert.equal((await adminList.json())[0].status, 'pending');
  await expectJson(await request(`/api/news/approve/${id}`, 'PUT', { adminPassword }), 200,
    { success: true, message: 'News Approved & Live!' });
  assert.equal((await (await request('/api/news')).json())[0].status, 'approved');
  await expectJson(await request(`/api/news/${id}`, 'DELETE', { adminPassword }), 200,
    { success: true, message: 'News deleted!' });
  failures.add('News');
  await expectJson(await request('/api/news'), 500, { success: false, message: 'Error fetching news' });
});

test('integration: actual chat-send helper accepts saves, rejects empty messages and rate limits', async t => {
  const { request, chat, records } = await fixture(t, { CHAT_RATE_LIMIT_MAX: '2' });
  await chat.sendChatMessage('Unverified display name', 'Test message');
  assert.equal(records.Chat.length, 1);
  const messages = await (await request('/api/chat')).json();
  assert.equal(messages[0].message, 'Test message');
  assert.equal(messages[0].sender, 'Unverified display name');
  await assert.rejects(chat.sendChatMessage('Reader', ''), /Message failed to send/);
  const limited = await request('/api/chat', 'POST', { sender: 'Reader', message: 'over budget' });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal((await limited.json()).success, false);
  assert.equal(records.Chat.length, 1);
});

test('integration: real breach route/provider validation maps mocked successes and failures', async t => {
  const { request, provider } = await fixture(t);
  t.mock.method(console, 'error', () => {});
  const path = '/api/breach/reader@example.invalid';
  await expectJson(await request(path), 200, { safe: true });
  provider.body = { breaches: [['Test breach']] };
  await expectJson(await request(path), 200, { safe: false, breaches: ['Test breach'] });
  for (const status of [429, 500]) {
    provider.status = status;
    await expectJson(await request(path), 502, { error: 'Breach lookup unavailable. Please try again later.' });
  }
  provider.status = 200;
  provider.body = { unexpected: [] };
  await expectJson(await request(path), 502, { error: 'Breach lookup unavailable. Please try again later.' });
  provider.networkFailure = true;
  await expectJson(await request(path), 502, { error: 'Breach lookup unavailable. Please try again later.' });
  assert.equal(provider.calls, 6);
});
