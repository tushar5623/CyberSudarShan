import { apiRequest } from './api.js';

export function readSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem('cyberSession'));
  } catch {
    return null;
  }
}

export function saveSession(user, token) {
  if (!/^[a-f\d]{64}$/i.test(token || '')) throw new Error('Missing login session.');
  window.sessionStorage.setItem('cyberSession', JSON.stringify({ user, token }));
}

export function sessionHeaders() {
  const token = readSession()?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function logout() {
  let failure;
  try {
    const response = await apiRequest('/api/auth/logout', {
      method: 'POST',
      headers: sessionHeaders()
    });
    if (!response.ok) failure = new Error('Server session revocation failed.');
  } catch (error) {
    failure = error;
  } finally {
    // A network failure must not trap the user in a locally authenticated UI.
    window.sessionStorage.removeItem('cyberSession');
    window.localStorage.removeItem('cyberUser');
  }
  if (failure) throw failure;
}
