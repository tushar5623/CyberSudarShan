import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStoredUser } from '../src/lib/storedUser.js';
import { sendChatMessage, removeOptimisticMessage, restoreFailedDraft } from '../src/lib/chatSend.js';
import { activateDialog } from '../src/lib/dialog.js';

test('stored identity preserves valid legacy records and additional fields without writing', () => {
  for (const user of [{ name: 'Member' }, { name: 'Member', email: 'member@example.invalid', extra: 42 }]) {
    assert.deepEqual(readStoredUser({ getItem: key => {
      assert.equal(key, 'cyberUser');
      return JSON.stringify(user);
    } }), user);
  }
});

test('malformed or unavailable storage recovers without deleting any record', () => {
  for (const value of [null, '{bad-json', 'null', '[]', '42', '"name"', '{}', '{"name":42}']) {
    let writes = 0;
    assert.equal(readStoredUser({ getItem: () => value,
      setItem: () => writes++, removeItem: () => writes++ }), null);
    assert.equal(writes, 0);
  }
  assert.equal(readStoredUser({ getItem: () => { throw new Error('Storage denied'); } }), null);
});

test('chat sends the existing payload once and accepts its 201 response', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 201 }));
  await sendChatMessage('Member', 'hello');
  assert.equal(fetch.mock.callCount(), 1);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(new URL(url).pathname, '/api/chat');
  assert.equal(options.method, 'POST');
  assert.deepEqual(options.headers, { 'Content-Type': 'application/json' });
  assert.deepEqual(JSON.parse(options.body), { sender: 'Member', message: 'hello' });
});

for (const status of [400, 429, 500]) test(`chat rejects HTTP ${status} without leaking upstream details or retrying`, async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('private upstream detail', { status }));
  await assert.rejects(sendChatMessage('Member', 'draft'), { message: 'Message failed to send. Please try again.' });
  assert.equal(fetch.mock.callCount(), 1);
});

test('chat network failures reject without retrying', async t => {
  const failure = new TypeError('Failed to fetch');
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw failure; });
  await assert.rejects(sendChatMessage('Member', 'draft'), error => error === failure);
  assert.equal(fetch.mock.callCount(), 1);
});

test('failed optimistic send rolls back only its own message and restores only an empty draft', () => {
  const messages = [{ _id: 'saved' }, { _id: 'pending-a' }, { _id: 'pending-b' }];
  assert.deepEqual(removeOptimisticMessage(messages, 'pending-a'), [messages[0], messages[2]]);
  assert.equal(messages.length, 3);
  assert.equal(restoreFailedDraft('', 'failed'), 'failed');
  assert.equal(restoreFailedDraft('newer draft', 'failed'), 'newer draft');
});

// Minimal DOM doubles exercise the keyboard/cleanup algorithm; real rendered
// dialogs are also checked in the browser, rather than treating these as JSX tests.
function dialogFixture() {
  const handlers = new Map();
  const doc = { body: { style: { overflow: 'auto' }, children: [] },
    addEventListener: (key, fn) => handlers.set(key, fn),
    removeEventListener: key => handlers.delete(key) };
  const control = () => ({ hidden: false, isConnected: true,
    getClientRects: () => [1], focus() { doc.activeElement = this; } });
  const opener = control();
  const first = control();
  const last = control();
  const background = { inert: false };
  const dialog = { ownerDocument: doc, parentElement: doc.body,
    querySelectorAll: () => [first, last], querySelector: () => null,
    contains: element => [first, last].includes(element) };
  doc.body.children = [background, dialog];
  doc.activeElement = opener;
  const key = (key, shiftKey = false) => {
    let prevented = false;
    handlers.get('keydown')({ key, shiftKey,
      preventDefault: () => { prevented = true; }, stopPropagation() {} });
    return prevented;
  };
  return { doc, dialog, background, opener, first, last, handlers, key };
}

test('dialog traps Tab in both directions, closes on Escape and restores background and opener', () => {
  const f = dialogFixture();
  let closes = 0;
  const cleanup = activateDialog(f.dialog, () => closes++);
  assert.equal(f.doc.activeElement, f.first);
  assert.equal(f.doc.body.style.overflow, 'hidden');
  assert.equal(f.background.inert, true);
  assert.equal(f.key('Tab', true), true);
  assert.equal(f.doc.activeElement, f.last);
  assert.equal(f.key('Tab'), true);
  assert.equal(f.doc.activeElement, f.first);
  assert.equal(f.key('Escape'), true);
  assert.equal(closes, 1);
  cleanup();
  assert.equal(f.handlers.size, 0);
  assert.equal(f.background.inert, false);
  assert.equal(f.doc.body.style.overflow, 'auto');
  assert.equal(f.doc.activeElement, f.opener);
});

test('dialog preserves an already inert background and tolerates a detached opener', () => {
  const f = dialogFixture();
  f.background.inert = true;
  const cleanup = activateDialog(f.dialog, () => {});
  f.opener.isConnected = false;
  cleanup();
  assert.equal(f.background.inert, true);
  assert.equal(f.doc.activeElement, f.first);
});
