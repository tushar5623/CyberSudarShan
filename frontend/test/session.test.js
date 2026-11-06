import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSession, saveSession, sessionHeaders, logout } from '../src/lib/session.js';
import { apiRequest } from '../src/lib/api.js';

function storageFixture(t) {
  const values = new Map();
  const previous = globalThis.window;
  globalThis.window = {
    sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    localStorage: { removeItem: key => values.delete(key) }
  };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  return values;
}

test('sessions use tab storage and logout revokes remotely before clearing local state', async t => {
  const values = storageFixture(t);
  const token = 'a'.repeat(64);
  const user = { id: 'member-id', name: 'Member' };
  saveSession(user, token);
  assert.deepEqual(readSession(), { user, token });
  assert.deepEqual(sessionHeaders(), { Authorization: `Bearer ${token}` });
  assert.equal(values.has('cyberUser'), false);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).pathname, '/api/auth/logout');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.equal(readSession().token, token);
    return new Response(null, { status: 204 });
  });
  await logout();
  assert.equal(readSession(), null);
});

test('failed revocation still clears local authentication', async t => {
  storageFixture(t);
  saveSession({ name: 'Member' }, 'b'.repeat(64));
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 500 }));
  await assert.rejects(logout(), /revocation failed/);
  assert.equal(readSession(), null);
  assert.throws(() => saveSession({}, 'invalid'), /Missing login session/);
});

test('request deadlines include body consumption and caller cancellation remains effective', async t => {
  const timeout = t.mock.method(AbortSignal, 'timeout', () => new AbortController().signal);
  const controller = new AbortController();
  let signal;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    signal = options.signal;
    return { ok: true, status: 200, headers: new Headers(), text: async () => {
      signal.throwIfAborted();
      return '{}';
    } };
  });
  const response = await apiRequest('/api/blogs', { signal: controller.signal });
  assert.deepEqual(timeout.mock.calls[0].arguments, [15000]);
  controller.abort();
  assert.equal(signal.aborted, true);
  await assert.rejects(response.json(), { name: 'AbortError' });
});
