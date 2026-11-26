// CyberForge Authentication Client & Session Profile Utility
// ponytail: client-side session profile only (no signed token yet); upgrade to HttpOnly cookie/JWT in P3.

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const CURRENT_USER_KEY = 'cyberforge_current_user';
const LEGACY_USERS_KEY = 'cyberforge_users';

function purgeLegacyLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(LEGACY_USERS_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {}
}

function setCurrentUser(user) {
  purgeLegacyLocalStorage();
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch {}
}

function parseErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    return data.detail[0]?.msg || fallback;
  }
  return fallback;
}

async function postAuth(path, payload, fallbackError) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.user) {
      return { success: false, error: parseErrorMessage(data, fallbackError) };
    }
    setCurrentUser(data.user);
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: 'Unable to reach CyberForge API. Ensure the backend is running.' };
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

export function getCurrentUser() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser() {
  purgeLegacyLocalStorage();
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    sessionStorage.removeItem(CURRENT_USER_KEY);
  } catch {}
}
