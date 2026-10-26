const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lookupBreaches } = require('../src/modules/breach/provider');

// No Express server, database or actual provider request is used in these unit tests.
function fixture(t, respond) {
  const originalTimeout = globalThis.setTimeout;
  let unref;
  const schedule = t.mock.method(globalThis, 'setTimeout', (...args) => {
    const timer = originalTimeout(...args);
    unref = t.mock.method(timer, 'unref');
    return timer;
  });
  const cancel = t.mock.method(globalThis, 'clearTimeout');
  const log = t.mock.method(console, 'error', () => {});
  let signal;
  let aborts = 0;
  const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
    signal = options.signal;
    assert.equal(signal.aborted, false);
    assert.equal(options.redirect, 'error');
    signal.addEventListener('abort', () => { aborts++; });
    return respond(url, options);
  });
  return {
    lookup: () => lookupBreaches('reader+tag@example.invalid'),
    verifyCleanup() {
      assert.equal(upstream.mock.callCount(), 1);
      assert.equal(upstream.mock.calls[0].arguments[0],
        'https://api.xposedornot.com/v1/check-email/reader+tag@example.invalid');
      assert.equal(schedule.mock.callCount(), 1);
      assert.equal(schedule.mock.calls[0].arguments[1], 10000);
      assert.equal(unref.mock.callCount(), 1);
      assert.equal(cancel.mock.callCount(), 1);
      assert.deepEqual(cancel.mock.calls[0].arguments, [schedule.mock.calls[0].result]);
      assert.equal(signal.aborted, true);
      assert.equal(aborts, 1);
      // Public logging belongs to the route; raw exceptions/content never escape here.
      assert.equal(log.mock.callCount(), 0);
    }
  };
}

test('provider: valid responses flatten one level and preserve empty results and breach names', async t => {
  for (const [breaches, expected] of [
    [[], []], [[[]], []], [[['BreachOne'], [' BreachTwo ']], ['BreachOne', ' BreachTwo ']],
    [['BreachOne', ['BreachTwo']], ['BreachOne', 'BreachTwo']]
  ]) {
    const subject = fixture(t, async () => ({ status: 200,
      json: async () => ({ breaches, status: 'success', email: 'reader+tag@example.invalid' }) }));
    assert.deepEqual(await subject.lookup(), { ok: true, breaches: expected });
    subject.verifyCleanup();
  }
});

test('provider: HTTP errors and redirects are unavailable without consuming upstream bodies', async t => {
  for (const status of [301, 400, 404, 429, 500, 503]) {
    const parse = t.mock.fn(async () => ({ breaches: [], error: 'Sensitive upstream body' }));
    const subject = fixture(t, async () => ({ status, json: parse }));
    assert.deepEqual(await subject.lookup(), { ok: false, reason: 'unavailable' });
    assert.equal(parse.mock.callCount(), 0);
    subject.verifyCleanup();
  }
});

test('provider: invalid or contradictory data never yields a successful empty result', async t => {
  for (const data of [null, [], 'unexpected', 42, {}, { breaches: null }, { breaches: 'BreachOne' },
    { breaches: [null] }, { breaches: [42] }, { breaches: [{}] }, { breaches: [''] },
    { breaches: ['  '] }, { breaches: [[['TooDeep']]] },
    { breaches: [], Error: 'Not found', email: null }, { breaches: [], error: 'Sensitive data' },
    { breaches: [], errors: [] }, { breaches: [], status: 'error' }]) {
    const subject = fixture(t, async () => ({ status: 200, json: async () => data }));
    assert.deepEqual(await subject.lookup(), { ok: false, reason: 'unavailable' });
    subject.verifyCleanup();
  }
});

test('provider: malformed JSON is unavailable and its exception details are discarded', async t => {
  const subject = fixture(t, async () => ({ status: 200,
    json: async () => { throw new SyntaxError('Sensitive JSON content'); } }));
  assert.deepEqual(await subject.lookup(), { ok: false, reason: 'unavailable' });
  subject.verifyCleanup();
});

test('provider: network failures are unavailable and discard exception metadata', async t => {
  const failure = Object.assign(new TypeError('Sensitive network details'), {
    headers: { authorization: 'synthetic-private-value' }, cause: 'Sensitive upstream cause'
  });
  const subject = fixture(t, async () => { throw failure; });
  assert.deepEqual(await subject.lookup(), { ok: false, reason: 'unavailable' });
  subject.verifyCleanup();
});

for (const phase of ['request', 'body']) {
  test(`provider: ${phase} timeout aborts at 10 seconds and cleans resources`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await new Promise(resolve => setImmediate(resolve));
    let reached;
    const waiting = new Promise(resolve => { reached = resolve; });
    let signal;
    const waitForAbort = () => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Sensitive timeout detail')), { once: true });
      reached();
    });
    const subject = fixture(t, async (url, options) => {
      signal = options.signal;
      return phase === 'request' ? waitForAbort() : { status: 200, json: waitForAbort };
    });
    const pending = subject.lookup();
    await waiting;
    t.mock.timers.tick(9999);
    assert.equal(signal.aborted, false);
    t.mock.timers.tick(1);
    assert.deepEqual(await pending, { ok: false, reason: 'timeout' });
    subject.verifyCleanup();
  });

  test(`provider: a valid-looking late ${phase} result is rejected after timeout`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await new Promise(resolve => setImmediate(resolve));
    let reached;
    const waiting = new Promise(resolve => { reached = resolve; });
    let signal;
    const waitForAbort = value => new Promise(resolve => {
      signal.addEventListener('abort', () => resolve(value), { once: true });
      reached();
    });
    const parse = t.mock.fn(async () => phase === 'request' ? { breaches: [] }
      : waitForAbort({ breaches: [] }));
    const subject = fixture(t, async (url, options) => {
      signal = options.signal;
      return phase === 'request' ? waitForAbort({ status: 200, json: parse })
        : { status: 200, json: parse };
    });
    const pending = subject.lookup();
    await waiting;
    t.mock.timers.tick(10000);
    assert.deepEqual(await pending, { ok: false, reason: 'timeout' });
    assert.equal(parse.mock.callCount(), phase === 'request' ? 0 : 1);
    subject.verifyCleanup();
  });
}
