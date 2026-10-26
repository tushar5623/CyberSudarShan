import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { subscribeToApi } from '../src/lib/apiSubscription.js';

const response = data => new Response(JSON.stringify(data), { status: 200 });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('subscription: one-shot reads publish JSON with an abort signal and no added headers/body', async t => {
  const loaded = deferred();
  const fetch = t.mock.method(globalThis, 'fetch', async () => response([{ _id: 'news' }]));
  const subscription = subscribeToApi('/api/news', { onData: loaded.resolve, onError: assert.fail });
  t.after(() => subscription.unsubscribe());
  assert.deepEqual(await loaded.promise, [{ _id: 'news' }]);
  assert.equal(fetch.mock.callCount(), 1);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(new URL(url).pathname, '/api/news');
  assert.deepEqual(Object.keys(options), ['signal']);
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(options.signal.aborted, false);
});

test('subscription: consumers can distinguish a failed HTTP response from an empty successful list', async t => {
  const loaded = deferred();
  t.mock.method(globalThis, 'fetch', async () => new Response('[]', { status: 500 }));
  const subscription = subscribeToApi('/api/news', {
    onData: (data, response) => loaded.resolve({ data, ok: response.ok, status: response.status }),
    onError: assert.fail
  });
  t.after(() => subscription.unsubscribe());
  assert.deepEqual(await loaded.promise, { data: [], ok: false, status: 500 });
});

test('subscription: 3000ms polling skips overlapping reads without cancelling slow requests', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const first = deferred();
  const received = [];
  let calls = 0;
  const fetch = t.mock.method(globalThis, 'fetch', async () =>
    ++calls === 1 ? first.promise : response(['next']));
  const subscription = subscribeToApi('/api/chat', {
    intervalMs: 3000, onData: data => received.push(data), onError: assert.fail
  });
  t.after(() => subscription.unsubscribe());
  t.mock.timers.tick(9000);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(fetch.mock.calls[0].arguments[1].signal.aborted, false);
  first.resolve(response(['first']));
  await nextTurn();
  t.mock.timers.tick(2999);
  assert.equal(fetch.mock.callCount(), 1);
  t.mock.timers.tick(1);
  await nextTurn();
  assert.equal(fetch.mock.callCount(), 2);
  assert.deepEqual(received, [['first'], ['next']]);
  subscription.unsubscribe();
  t.mock.timers.tick(9000);
  assert.equal(fetch.mock.callCount(), 2);
});

test('subscription: post-write refreshes queue one fresh read after a pending snapshot', async t => {
  const first = deferred();
  const received = [];
  let calls = 0;
  const fetch = t.mock.method(globalThis, 'fetch', async () =>
    ++calls === 1 ? first.promise : response(['after write']));
  const subscription = subscribeToApi('/api/chat', {
    onData: data => received.push(data), onError: assert.fail
  });
  t.after(() => subscription.unsubscribe());
  const refreshed = [subscription.refresh(), subscription.refresh()];
  assert.equal(fetch.mock.callCount(), 1);
  first.resolve(response(['before write']));
  await Promise.all(refreshed);
  assert.equal(fetch.mock.callCount(), 2);
  assert.deepEqual(received, [['before write'], ['after write']]);
});

test('subscription: cleanup aborts once, suppresses abort errors and drops queued refreshes', async t => {
  const data = t.mock.fn();
  const error = t.mock.fn();
  let aborts = 0;
  const fetch = t.mock.method(globalThis, 'fetch', async (url, { signal }) =>
    new Promise((resolve, reject) => signal.addEventListener('abort', () => {
      aborts++;
      reject(new DOMException('Cancelled', 'AbortError'));
    }, { once: true })));
  const subscription = subscribeToApi('/api/chat', { onData: data, onError: error });
  t.after(() => subscription.unsubscribe());
  const pending = subscription.refresh();
  subscription.unsubscribe();
  subscription.unsubscribe();
  await pending;
  await subscription.refresh();
  assert.equal(aborts, 1);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(data.mock.callCount(), 0);
  assert.equal(error.mock.callCount(), 0);
});

test('subscription: late JSON completion after cleanup never updates component callbacks', async t => {
  const body = deferred();
  const data = t.mock.fn();
  const error = t.mock.fn();
  const fetch = t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200, text: () => body.promise
  }));
  const subscription = subscribeToApi('/api/news', { onData: data, onError: error });
  t.after(() => subscription.unsubscribe());
  await nextTurn();
  subscription.unsubscribe();
  body.resolve('[{"_id":"late"}]');
  await nextTurn();
  assert.equal(fetch.mock.calls[0].arguments[1].signal.aborted, true);
  assert.equal(data.mock.callCount(), 0);
  assert.equal(error.mock.callCount(), 0);
});

test('subscription: network and JSON failures reach the error callback and a later refresh can recover', async t => {
  for (const failure of [new TypeError('Synthetic network failure'), new SyntaxError('Synthetic JSON failure')]) {
    const errors = [];
    const received = [];
    let first = true;
    t.mock.method(globalThis, 'fetch', async () => {
      if (!first) return response(['recovered']);
      first = false;
      if (failure instanceof TypeError) throw failure;
      return { ok: true, status: 200, text: async () => { throw failure; } };
    });
    const subscription = subscribeToApi('/api/news', {
      onData: data => received.push(data), onError: error => errors.push(error)
    });
    t.after(() => subscription.unsubscribe());
    await nextTurn();
    assert.deepEqual(errors, [failure]);
    await subscription.refresh();
    assert.deepEqual(received, [['recovered']]);
    subscription.unsubscribe();
  }
});

test('subscription: parsed HTTP error bodies retain the existing consumer-controlled read policy', async t => {
  const loaded = deferred();
  const body = { success: false, message: 'Existing read error' };
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status: 500 }));
  const subscription = subscribeToApi('/api/news', { onData: loaded.resolve, onError: assert.fail });
  t.after(() => subscription.unsubscribe());
  assert.deepEqual(await loaded.promise, body);
});

test('subscription: cleanup and re-subscribe cannot publish an older mount response', async t => {
  const old = deferred();
  const received = [];
  let calls = 0;
  const fetch = t.mock.method(globalThis, 'fetch', async () =>
    ++calls === 1 ? old.promise : response(['new mount']));
  const options = { onData: data => received.push(data), onError: assert.fail };
  const first = subscribeToApi('/api/news', options);
  first.unsubscribe();
  const second = subscribeToApi('/api/news', options);
  t.after(() => second.unsubscribe());
  await nextTurn();
  old.resolve(response(['old mount']));
  await nextTurn();
  assert.deepEqual(received, [['new mount']]);
  assert.equal(fetch.mock.callCount(), 2);
});
