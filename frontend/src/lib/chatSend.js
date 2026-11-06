import { sessionHeaders } from './session.js';
import { apiRequest } from './api.js';

export async function sendChatMessage(message) {
  const response = await apiRequest('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
    body: JSON.stringify({ message })
  });
  if (!response.ok) throw new Error('Message failed to send. Please try again.');
}

export function removeOptimisticMessage(messages, id) {
  return messages.filter((message) => message._id !== id);
}

export function restoreFailedDraft(current, failed) {
  return current === '' ? failed : current;
}
