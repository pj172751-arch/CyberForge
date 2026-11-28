function resolveApiBase() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'http://localhost:8000';
  }
  return 'http://127.0.0.1:8000';
}

export const API_BASE = resolveApiBase();

const AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/me',
  '/api/auth/logout',
]);

const CREDENTIAL_CHECK_AUTH_PATHS = new Set([
  '/api/auth/password',
  '/api/auth/account',
]);

const CREDENTIAL_ERROR_DETAILS = new Set([
  'current password is incorrect',
  'incorrect password',
]);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let inMemoryCsrfToken = '';
let unauthorizedHandler = null;
let inflightRefreshPromise = null;

export function setCsrfToken(token) {
  inMemoryCsrfToken = typeof token === 'string' ? token : '';
}

export function getCsrfToken() {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken;
  }
  if (typeof document === 'undefined' || !document.cookie) {
    return '';
  }
  const cookies = document.cookie.split(';');
  for (const part of cookies) {
    const trimmed = part.trim();
    if (trimmed.startsWith('cyberforge_csrf=')) {
      const rawValue = trimmed.slice('cyberforge_csrf='.length);
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }
  return '';
}

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

function buildApiUrl(path) {
  return path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function getUrlPathname(url) {
  try {
    return new URL(url, API_BASE).pathname;
  } catch {
    return '';
  }
}

function shouldHandleAsSessionExpiry(url, data) {
  const pathname = getUrlPathname(url);
  if (AUTH_PATHS.has(pathname)) {
    return false;
  }
  if (CREDENTIAL_CHECK_AUTH_PATHS.has(pathname)) {
    const detail = typeof data?.detail === 'string' ? data.detail.trim().toLowerCase() : '';
    if (
      CREDENTIAL_ERROR_DETAILS.has(detail) ||
      detail.includes('incorrect password') ||
      detail.includes('current password')
    ) {
      return false;
    }
  }
  return true;
}

export function formatFastApiError(data, status) {
  if (!data) return `Request failed with status ${status}`;
  if (typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const messages = data.detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return null;
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== 'body').join('.')
          : '';
        const msg = item.msg || 'Invalid value';
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join('; ');
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return `Request failed with status ${status}`;
}

export async function tryRefreshSession() {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    return { ok: false, data: null };
  }
  if (inflightRefreshPromise) {
    return inflightRefreshPromise;
  }
  inflightRefreshPromise = (async () => {
    try {
      const latestCsrfToken = getCsrfToken();
      if (!latestCsrfToken) {
        return { ok: false, data: null };
      }
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CyberForge-CSRF': latestCsrfToken,
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, data: null };
      }
      if (data?.csrf_token) {
        setCsrfToken(data.csrf_token);
      }
      return { ok: true, data };
    } catch {
      return { ok: false, data: null };
    } finally {
      inflightRefreshPromise = null;
    }
  })();
  return inflightRefreshPromise;
}

async function performApiFetch(path, options, hasRetried) {
  const { method = 'GET', body, headers = {}, signal } = options;
  const url = buildApiUrl(path);
  const upperMethod = String(method).toUpperCase();

  const requestHeaders = { ...headers };
  let requestBody = body;

  if (body !== undefined && body !== null && typeof body !== 'string' && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    requestBody = JSON.stringify(body);
  }

  if (!SAFE_METHODS.has(upperMethod)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      requestHeaders['X-CyberForge-CSRF'] = csrfToken;
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method: upperMethod,
      headers: requestHeaders,
      body: requestBody,
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('Unable to reach CyberForge API. Ensure the backend is running.');
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 && shouldHandleAsSessionExpiry(url, data)) {
    if (!hasRetried) {
      const refreshed = await tryRefreshSession();
      if (refreshed.ok) {
        return performApiFetch(path, options, true);
      }
    }
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const error = new Error(formatFastApiError(data, response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function apiFetch(path, options = {}) {
  return performApiFetch(path, options, false);
}

export async function downloadAuthenticatedCsv(path, filename = 'cyberforge-activity.csv') {
  const url = buildApiUrl(path);
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    if (response.status === 401) {
      const refreshed = await tryRefreshSession();
      if (refreshed.ok) {
        response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });
      }
      if (response.status === 401) {
        unauthorizedHandler?.();
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new Error('Unable to reach CyberForge API. Ensure the backend is running.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(formatFastApiError(data, response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  }
}

export function exportActivityCsvUrl(params = {}) {
  const query = new URLSearchParams();
  if (params.event_type && params.event_type !== 'all') {
    query.set('event_type', params.event_type);
  }
  if (params.challenge_id !== undefined && params.challenge_id !== null && params.challenge_id !== '') {
    query.set('challenge_id', String(params.challenge_id));
  }
  if (params.search && String(params.search).trim()) {
    query.set('search', String(params.search).trim());
  }
  const qs = query.toString();
  return `${API_BASE}/api/reports/export${qs ? `?${qs}` : ''}`;
}
