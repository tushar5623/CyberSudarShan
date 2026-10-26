// This is an unverified display identity, not server authentication.
// Failed reads leave storage untouched, including malformed or legacy records.
export function readStoredUser(storage) {
  try {
    const user = JSON.parse((storage ?? window.localStorage).getItem('cyberUser'));
    return user && typeof user === 'object' && !Array.isArray(user) && typeof user.name === 'string'
      ? user : null;
  } catch {
    return null;
  }
}
