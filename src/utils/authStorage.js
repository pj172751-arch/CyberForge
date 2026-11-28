import {
  API_BASE,
  formatFastApiError,
  getCsrfToken,
  setCsrfToken,
  tryRefreshSession,
} from './api';

const CURRENT_USER_KEY = 'cyberforge_current_user';
const LEGACY_USERS_KEY = 'cyberforge_users';

export function purgeLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(LEGACY_USERS_KEY);
    window.localStorage?.removeItem(CURRENT_USER_KEY);
  } catch {}
  try {
    window.sessionStorage?.removeItem(CURRENT_USER_KEY);
  } catch {}
}

function parseAuthErrorMessage(res, data, fallback) {
  if (res.status === 429) {
    const retryAfter = res.headers?.get('Retry-After');
    const detail = formatFastApiError(data, 429);
    const base =
      detail && detail !== 'Request failed with status 429'
        ? detail
        : 'Too many requests. Please wait before trying again.';
    return retryAfter && !base.includes(retryAfter)
      ? `${base} (Retry after ${retryAfter}s)`
      : base;
  }
  if (!data) return fallback;
  return formatFastApiError(data, res.status) || fallback;
}

async function postAuth(path, payload, fallbackError) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CyberForge-CSRF'] = csrfToken;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.user) {
      return { success: false, error: parseAuthErrorMessage(res, data, fallbackError) };
    }
    purgeLegacyStorage();
    setCsrfToken(data?.csrf_token || '');
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: 'Unable to reach CyberForge API. Ensure the backend is running.' };
  }
}

export async function fetchSessionUser() {
  purgeLegacyStorage();
  try {
    let res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (res.status === 401) {
      if (!getCsrfToken()) {
        setCsrfToken('');
        return null;
      }
      const refreshed = await tryRefreshSession();
      if (!refreshed.ok) {
        setCsrfToken('');
        return null;
      }
      res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });
    }

    if (!res.ok) {
      if (res.status === 401) {
        setCsrfToken('');
      }
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!data?.user) {
      return null;
    }
    if (data.csrf_token) {
      setCsrfToken(data.csrf_token);
    }
    return data.user;
  } catch {
    return null;
  }
}

export async function registerUser({ fullName, email, password, role }) {
  const username = (fullName || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!username || !cleanEmail || !password) {
    return { success: false, error: 'Username, email, and password are required.' };
  }
  return postAuth(
    '/api/auth/register',
    { username, email: cleanEmail, password, role: role || 'attacker' },
    'Registration failed.'
  );
}

export async function loginUser({ email, password }) {
  const credential = (email || '').trim();
  if (!credential || !password) {
    return { success: false, error: 'Email and password are required.' };
  }
  return postAuth(
    '/api/auth/login',
    { username_or_email: credential, password },
    'Invalid email or password.'
  );
}

export async function logoutUser() {
  try {
    const headers = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CyberForge-CSRF'] = csrfToken;
    }
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  } catch {
    // Clear client session state even if network call fails
  } finally {
    setCsrfToken('');
    purgeLegacyStorage();
  }
}

export function clearCurrentUser() {
  setCsrfToken('');
  purgeLegacyStorage();
}
