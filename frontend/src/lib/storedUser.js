import { readSession } from './session.js';
// Display state only; protected operations are authorized by the backend.
// Failed reads leave storage untouched, including malformed or legacy records.
export function readStoredUser(storage) {
  try {
    const user = storage ? JSON.parse(storage.getItem('cyberUser')) : readSession()?.user;
    return user && typeof user === 'object' && !Array.isArray(user) && typeof user.name === 'string'
      ? user
      : null;
  } catch {
    return null;
  }
}
