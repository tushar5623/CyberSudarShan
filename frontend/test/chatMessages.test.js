import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileChatMessages } from '../src/lib/chatMessages.js';

const message = { _id: 'one', sender: 'Reader', message: 'Hello', timestamp: '2026-01-01T00:00:00Z' };

test('chat reconciliation: identical rendered fields reuse the previous state without mutation', () => {
  const previous = Object.freeze([Object.freeze({ ...message })]);
  const incoming = Object.freeze([{ ...message, __v: 0 }]);
  assert.equal(reconcileChatMessages(previous, incoming), previous);
});

test('chat reconciliation: the same count and final ID do not hide changes to earlier messages', () => {
  const previous = [message, { ...message, _id: 'two' }];
  const incoming = [{ ...message, message: 'Updated' }, { ...message, _id: 'two' }];
  assert.equal(reconcileChatMessages(previous, incoming), incoming);
});

test('chat reconciliation: authoritative records replace optimistic IDs even at the same count', () => {
  const previous = [{ ...message, _id: 1234 }];
  const incoming = [{ ...message, _id: 'saved-id' }];
  assert.equal(reconcileChatMessages(previous, incoming), incoming);
});

test('chat reconciliation: changes to sender, message or timestamp are reflected', () => {
  for (const field of ['sender', 'message', 'timestamp']) {
    const incoming = [{ ...message, [field]: 'changed' }];
    assert.equal(reconcileChatMessages([message], incoming), incoming);
  }
});

test('chat reconciliation: additions, removals, reordering and empty snapshots preserve server order', () => {
  const second = { ...message, _id: 'two' };
  for (const [previous, incoming] of [[[], [message]], [[message], []],
    [[message], [message, second]], [[message, second], [second, message]]]) {
    assert.equal(reconcileChatMessages(previous, incoming), incoming);
  }
  const empty = [];
  assert.equal(reconcileChatMessages(empty, []), empty);
});
