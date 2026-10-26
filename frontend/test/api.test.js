import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_BASE_URL, resolveApiBaseUrl, apiUrl, apiRequest } from '../src/lib/api.js';

test('base URL retains the deployed backend when no override is set in either mode', () => {
  const expected = 'https://cyber-sudarshan-backend-1.onrender.com';
  assert.equal(API_BASE_URL, expected);
  assert.equal(resolveApiBaseUrl(undefined), expected);
  assert.equal(resolveApiBaseUrl(undefined, { production: true }), expected);
});

test('explicit origins normalize trailing slash and allow local HTTP only outside production', () => {
  assert.equal(resolveApiBaseUrl(' https://backend.example.invalid:8443/ '), 'https://backend.example.invalid:8443');
  assert.equal(resolveApiBaseUrl('http://127.0.0.1:5000'), 'http://127.0.0.1:5000');
  assert.throws(() => resolveApiBaseUrl('http://127.0.0.1:5000', { production: true }), /Production requires HTTPS/);
});

test('invalid explicit configuration fails without fallback or echoing configuration values', () => {
  for (const value of ['', ' ', null, 42, '/api', '//example.invalid', 'not-a-url',
    'ftp://example.invalid', 'https://user:synthetic-secret@example.invalid',
    'https://example.invalid/api', 'https://example.invalid/path/..',
    'https://example.invalid?key=synthetic-secret', 'https://example.invalid#fragment',
    'https://example.invalid?', 'https://example.invalid\\other']) {
    assert.throws(() => resolveApiBaseUrl(value), error =>
      error.message.includes('VITE_API_BASE_URL') && !error.message.includes('synthetic-secret'));
  }
});

test('URL construction retains dynamic path text and rejects absolute or non-API targets', () => {
  assert.equal(apiUrl('/api/breach/reader+tag@example.invalid'), `${API_BASE_URL}/api/breach/reader+tag@example.invalid`);
  for (const path of ['https://other.invalid/api/chat', '//other.invalid/api/chat', '/chat', undefined]) {
    assert.throws(() => apiUrl(path), /backend-relative/);
  }
});

test('JSON GET responses retain status, headers and data with one lazy parse', async t => {
  const text = t.mock.fn(async () => '[{"_id":"synthetic-id"}]');
  const headers = new Headers({ 'content-type': 'application/json' });
  const fetch = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, headers, text }));
  const result = await apiRequest('/api/blogs');
  assert.deepEqual(fetch.mock.calls[0].arguments, [`${API_BASE_URL}/api/blogs`, undefined]);
  assert.equal(result.ok, true);
  assert.equal(result.error, null);
  assert.equal(result.headers, headers);
  assert.equal(text.mock.callCount(), 0);
  assert.deepEqual(await result.json(), [{ _id: 'synthetic-id' }]);
  assert.deepEqual(await result.json(), [{ _id: 'synthetic-id' }]);
  assert.equal(text.mock.callCount(), 1);
});

test('write methods, JSON bodies, credential fields, headers and signals pass through unchanged without retry', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 201 }));
  for (const [path, method, body] of [
    ['/api/contact', 'POST', { name: 'Reader', email: 'reader@example.invalid', message: 'Hello' }],
    ['/api/emergency', 'POST', { name: 'Reader', email: 'reader@example.invalid', mobile: '123', problem: 'Help' }],
    ['/api/auth/login', 'POST', { email: 'reader@example.invalid', password: 'synthetic' }],
    ['/api/auth/signup', 'POST', { name: 'Reader', email: 'reader@example.invalid', password: 'synthetic' }],
    ['/api/verify-admin', 'POST', { password: 'synthetic' }],
    ['/api/blogs', 'POST', { title: 'Title', author: 'Reader', content: 'Content', adminPassword: 'synthetic' }],
    ['/api/blogs/synthetic-id', 'PUT', { title: 'Edited', adminPassword: 'synthetic' }],
    ['/api/blogs/synthetic-id', 'DELETE', { adminPassword: 'synthetic' }],
    ['/api/news', 'POST', { title: 'Title', summary: 'Summary', fullDetails: 'Details', type: 'News', imageUrl: '' }],
    ['/api/chat', 'POST', { sender: 'Reader', message: 'Hello' }]
  ]) {
    const options = { method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: new AbortController().signal };
    await apiRequest(path, options);
    const call = fetch.mock.calls.at(-1);
    assert.equal(call.arguments[0], `${API_BASE_URL}${path}`);
    assert.equal(call.arguments[1], options);
  }
  assert.equal(fetch.mock.callCount(), 10);
});

test('HTTP errors stay explicitly unsuccessful and preserve the original JSON error details', async t => {
  for (const status of [400, 401, 404, 429, 502, 504]) {
    const body = { success: false, message: 'Existing UI message', error: 'Existing error detail' };
    const headers = { 'Content-Type': 'application/json', 'Retry-After': '60' };
    const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status, headers }));
    const result = await apiRequest('/api/auth/login');
    assert.equal(result.ok, false);
    assert.equal(result.status, status);
    assert.equal(result.error.status, status);
    assert.deepEqual(await result.json(), body);
    assert.deepEqual(result.error.body, body);
    assert.equal(result.headers.get('Retry-After'), '60');
    assert.equal(fetch.mock.callCount(), 1);
  }
});

test('unconsumed bodies do not turn status-only or ignored-response callers into JSON failures', async t => {
  const text = t.mock.fn(async () => { throw new Error('Must not parse an ignored body'); });
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 500, headers: new Headers(), text }));
  const result = await apiRequest('/api/chat', { method: 'POST' });
  assert.equal(result.ok, false);
  assert.equal(result.error.status, 500);
  assert.equal(text.mock.callCount(), 0);
});

test('empty no-content responses are supported while empty or malformed JSON responses reject', async t => {
  for (const status of [204, 205]) {
    t.mock.method(globalThis, 'fetch', async () => new Response(null, { status }));
    assert.equal(await (await apiRequest('/api/chat')).json(), null);
  }
  for (const text of ['', '<html>error</html>']) {
    t.mock.method(globalThis, 'fetch', async () => new Response(text, { status: 200 }));
    await assert.rejects((await apiRequest('/api/chat')).json(), SyntaxError);
  }
});

test('network and body-read failures propagate unchanged and never cause a retry', async t => {
  const failure = new TypeError('Synthetic network failure');
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw failure; });
  await assert.rejects(apiRequest('/api/chat', { method: 'POST' }), error => error === failure);
  assert.equal(fetch.mock.callCount(), 1);
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200,
    text: async () => { throw failure; } }));
  await assert.rejects((await apiRequest('/api/chat')).json(), error => error === failure);
});
