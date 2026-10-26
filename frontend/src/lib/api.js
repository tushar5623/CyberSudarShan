// Preserve the existing backend in both development and deployed builds.
const DEFAULT_API_BASE_URL = 'https://cyber-sudarshan-backend-1.onrender.com';

export function resolveApiBaseUrl(value, { production = false } = {}) {
  const configured = value === undefined ? DEFAULT_API_BASE_URL : value;
  const invalid = () => new Error('VITE_API_BASE_URL must be an absolute HTTP(S) origin without credentials, path, query or fragment. Production requires HTTPS.');
  if (typeof configured !== 'string' || !configured.trim()) throw invalid();
  if (!/^https?:\/\/[^/?#\\\s]+\/?$/i.test(configured.trim())) throw invalid();
  let url;
  try {
    url = new URL(configured.trim());
  } catch {
    throw invalid();
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash ||
      (production && url.protocol !== 'https:')) throw invalid();
  return url.origin;
}

// Vite substitutes public environment values at build time; never put secrets here.
export const API_BASE_URL = resolveApiBaseUrl(import.meta.env?.VITE_API_BASE_URL, {
  production: import.meta.env?.PROD ?? false
});

export function apiUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    throw new Error('API requests require a backend-relative /api/ path.');
  }
  return `${API_BASE_URL}${path}`;
}

// HTTP failures remain explicit response results so each existing UI can retain
// its status/body policy. Network and JSON errors reject without being replaced.
export async function apiRequest(path, options) {
  const response = await fetch(apiUrl(path), options);
  const error = response.ok ? null : Object.assign(new Error('API request failed.'), {
    status: response.status
  });
  let parsed;
  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    error,
    json() {
      // Lazy parsing preserves callers that only inspect status or ignore bodies.
      parsed ??= response.text().then(text => {
        const data = text === '' && [204, 205].includes(response.status) ? null : JSON.parse(text);
        if (error) error.body = data;
        return data;
      });
      return parsed;
    }
  };
}
