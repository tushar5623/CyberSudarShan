// Reuse state only when every field rendered by the chat remains unchanged.
export function reconcileChatMessages(previous, incoming) {
  const fields = ['_id', 'sender', 'message', 'timestamp'];
  const unchanged = previous.length === incoming.length && previous.every((message, index) =>
    fields.every(field => message[field] === incoming[index][field]));
  return unchanged ? previous : incoming;
}
