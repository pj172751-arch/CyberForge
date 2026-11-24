// CyberForge User Storage & Authentication Utility
// Handles local user registration, persistent storage, and fixed credentials.

const STORAGE_KEY = 'cyberforge_users';
const CURRENT_USER_KEY = 'cyberforge_current_user';

export const FIXED_CREDENTIALS = [
  {
    role: 'admin',
    label: 'Admin Access',
    email: 'abc17@gmail.com',
    password: 'axbycz17@30',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    dotColor: 'bg-[#a855f7] shadow-[0_0_8px_#a855f7]',
    accentBorder: 'hover:border-purple-500/60'
  },
  {
    role: 'moderator',
    label: 'Moderator Access',
    email: 'xy30z@gmail.com',
    password: 'xbycza30@17',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    dotColor: 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]',
    accentBorder: 'hover:border-amber-500/60'
  }
];

export const DEFAULT_USERS = [
  {
    fullName: 'Platform Administrator',
    email: 'abc17@gmail.com',
    password: 'axbycz17@30',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    fullName: 'Cohort Moderator',
    email: 'xy30z@gmail.com',
    password: 'xbycza30@17',
    role: 'moderator',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    fullName: 'Offensive Operator',
    email: 'attacker@cyberforge.dev',
    password: 'attacker123',
    role: 'attacker',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    fullName: 'Defensive Analyst',
    email: 'defender@cyberforge.dev',
    password: 'defender123',
    role: 'defender',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export function getStoredUsers() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_USERS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let users = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(users) || users.length === 0) {
      users = [...DEFAULT_USERS];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      return users;
    }

    // Ensure fixed accounts always exist and have the authoritative credentials
    DEFAULT_USERS.forEach((defUser) => {
      const idx = users.findIndex(
        (u) => u.email.toLowerCase() === defUser.email.toLowerCase()
      );
      if (idx === -1) {
        users.push(defUser);
      } else {
        // Enforce the fixed password and role for the canonical accounts
        users[idx].password = defUser.password;
        users[idx].role = defUser.role;
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return users;
  } catch (err) {
    console.error('Failed to parse stored users:', err);
    return DEFAULT_USERS;
  }
}

export function registerUser({ fullName, email, password, role }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const cleanName = (fullName || '').trim() || 'Operator';
  const cleanRole = role || 'attacker';

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Email and password are required.' };
  }

  const users = getStoredUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (existing) {
    return {
      success: false,
      error: `An account with ${cleanEmail} already exists (${existing.role.toUpperCase()}). Please log in.`
    };
  }

  const newUser = {
    fullName: cleanName,
    email: cleanEmail,
    password: cleanPass,
    role: cleanRole,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  } catch (e) {
    console.error('Failed to save user in localStorage:', e);
  }

  return { success: true, user: newUser };
}

export function loginUser({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Email and password are required.' };
  }

  const users = getStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return {
      success: false,
      error: 'No account registered with this email. Please sign up first.'
    };
  }

  if (user.password !== cleanPass) {
    return {
      success: false,
      error: 'Incorrect password for this account. Please verify credentials.'
    };
  }

  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to set current user:', e);
  }

  return { success: true, user };
}

export function getCurrentUser() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {}
}
