import { apiRequest } from './api.js';

// Shared lifecycle for one-shot news reads and the community's polling feed.
// Writes remain in event handlers and are never retried by this subscription.
export function subscribeToApi(path, { onData, onError, intervalMs }) {
  let active = true;
  let pending = null;
  let queued = false;
  let controller;

  function load(queue = false) {
    if (!active) return Promise.resolve();
    if (pending) {
      queued ||= queue;
      return pending;
    }
    controller = new AbortController();
    pending = (async () => {
      try {
        const response = await apiRequest(path, { signal: controller.signal });
        const data = await response.json();
        if (active) onData(data, response);
      } catch (error) {
        if (active) onError(error);
      } finally {
        pending = null;
      }
      if (active && queued) {
        queued = false;
        return load();
      }
    })();
    return pending;
  }

  const timer = intervalMs === undefined ? null : setInterval(() => { load(); }, intervalMs);
  load();
  return {
    // A post-write refresh waits for any older read, then fetches a fresh snapshot.
    refresh: () => load(true),
    unsubscribe() {
      if (!active) return;
      active = false;
      queued = false;
      if (timer !== null) clearInterval(timer);
      controller.abort();
    }
  };
}
