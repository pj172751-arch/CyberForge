import React, { useEffect, useState } from 'react';
import {
  Check,
  Key,
  Sliders,
  Trash,
  User,
  Warning,
} from '@phosphor-icons/react';
import { apiFetch, setCsrfToken } from '../../utils/api';
import { clearCurrentUser } from '../../utils/authStorage';
import {
  AlertBanner,
  Badge,
  Button,
  Field,
  Input,
  Modal,
  StatTile,
} from '../ui/primitives';

const ROLE_BADGE_VARIANT = {
  admin: 'amber',
  moderator: 'amber',
  attacker: 'red',
  defender: 'blue',
};

const DEFAULT_PREFERENCES = {
  compactTables: false,
  confirmDestructive: true,
  autoRefreshActivity: true,
  showKeyboardHints: true,
};

const PREFERENCE_ITEMS = [
  {
    key: 'compactTables',
    title: 'Compact data rows',
    description: 'Use tighter vertical cell density across tables and activity feeds.',
  },
  {
    key: 'confirmDestructive',
    title: 'Confirm destructive actions',
    description: 'Require explicit confirmation before removing accounts or challenges.',
  },
  {
    key: 'autoRefreshActivity',
    title: 'Live telemetry polling',
    description: 'Automatically check database health and refresh live console feeds.',
  },
  {
    key: 'showKeyboardHints',
    title: 'Keyboard shortcut hints',
    description: 'Display Ctrl+K and 1..N shortcut numerals in workspace controls.',
  },
];

function getInitials(user) {
  const source = (user?.username || user?.email || 'CF').trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function utf8ByteLength(str) {
  return new TextEncoder().encode(str).length;
}

export function ProfileView({ user, stats = [], onUserUpdated }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roleKey = (user?.role || '').toLowerCase();
  const roleVariant = ROLE_BADGE_VARIANT[roleKey] || 'neutral';
  const roleLabel = roleKey ? roleKey.charAt(0).toUpperCase() + roleKey.slice(1) : 'Operator';

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user?.id || !user?.role) {
      setError('Active session details are missing. Sign in again to update your password.');
      return;
    }
    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (newPassword.length < 10) {
      setError('New password must be at least 10 characters.');
      return;
    }
    if (utf8ByteLength(newPassword) > 72) {
      setError('New password must be at most 72 UTF-8 bytes.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must differ from your current password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: {
          role: user.role,
          user_id: user.id,
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      if (result?.csrf_token) {
        setCsrfToken(result.csrf_token);
      } else if (typeof document !== 'undefined' && document.cookie.includes('cyberforge_csrf=')) {
        setCsrfToken('');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(result?.message || 'Password updated successfully.');
      onUserUpdated?.(result?.user || user);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="lg:h-full lg:min-h-0 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#111317] leading-tight text-balance">
            Operator Profile
          </h1>
          <p className="text-[15px] text-[#4B5260] mt-0.5 text-pretty">
            Inspect your account identity and rotate authentication credentials.
          </p>
        </div>
        <Badge variant={roleVariant} className="self-start sm:self-auto">
          {roleLabel} Clearance
        </Badge>
      </div>

      {Array.isArray(stats) && stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {stats.slice(0, 4).map((stat, idx) => (
            <StatTile
              key={stat.label || idx}
              label={stat.label}
              value={stat.value}
              detail={stat.detail}
              icon={stat.icon}
              accent={stat.accent}
            />
          ))}
        </div>
      )}

      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 50%: Operator Identity Folio */}
        <section className="lg:col-span-6 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#111317]/15 flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 rounded-md bg-[#EAE4D7] border border-[#111317]/20 flex items-center justify-center text-base font-bold font-mono text-[#111317] shrink-0">
              {getInitials(user)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-[#111317] truncate">
                  {user?.username || 'Unknown Operator'}
                </h2>
                <Badge variant={roleVariant}>{roleLabel}</Badge>
              </div>
              <p className="text-[14px] text-[#4B5260] truncate mt-0.5">
                {user?.email || 'No email on record'}
              </p>
            </div>
          </div>

          <div className="px-5 py-2.5 bg-[#EAE4D7]/50 border-b border-[#111317]/15 flex items-center gap-2 text-[14px] font-bold text-[#111317] shrink-0">
            <User className="w-4 h-4 text-[#4B5260]" weight="bold" />
            <span>Account Dossier</span>
          </div>

          <dl className="flex-1 divide-y divide-[#111317]/10 overflow-y-auto">
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-[15px] font-medium text-[#4B5260]">Account ID</dt>
              <dd className="font-mono tabular-nums text-[15px] font-semibold text-[#111317]">
                #{user?.id ?? '—'}
              </dd>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-[15px] font-medium text-[#4B5260]">Username</dt>
              <dd className="text-[15px] font-semibold text-[#111317] truncate">
                {user?.username || '—'}
              </dd>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-[15px] font-medium text-[#4B5260]">Email</dt>
              <dd className="text-[15px] text-[#1C1F26] truncate">
                {user?.email || '—'}
              </dd>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-[15px] font-medium text-[#4B5260]">Assigned Role</dt>
              <dd>
                <Badge variant={roleVariant}>{roleLabel}</Badge>
              </dd>
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between gap-4">
              <dt className="text-[15px] font-medium text-[#4B5260]">Member Since</dt>
              <dd className="font-mono tabular-nums text-[14px] text-[#1C1F26]">
                {formatTimestamp(user?.created_at)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Right 50%: Password Rotation Folio */}
        <section className="lg:col-span-6 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#111317]/15 flex items-center gap-2 shrink-0">
            <Key className="w-4 h-4 text-[#111317]" weight="bold" />
            <h2 className="text-lg font-bold text-[#111317]">Rotate Password</h2>
          </div>

          <form
            onSubmit={handlePasswordSubmit}
            className="flex-1 p-5 flex flex-col justify-between gap-4 overflow-y-auto"
          >
            <div className="space-y-4">
              {error && (
                <AlertBanner
                  variant="error"
                  message={error}
                  onDismiss={() => setError('')}
                />
              )}
              {success && (
                <AlertBanner
                  variant="success"
                  message={success}
                  onDismiss={() => setSuccess('')}
                />
              )}

              <Field label="Current password" htmlFor="cf-current-password" required>
                <Input
                  id="cf-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  disabled={submitting}
                  required
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="New password"
                  htmlFor="cf-new-password"
                  hint="10 to 72 UTF-8 bytes, letter + number/symbol"
                  required
                >
                  <Input
                    id="cf-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Minimum 10 characters"
                    disabled={submitting}
                    required
                  />
                </Field>

                <Field label="Confirm new password" htmlFor="cf-confirm-password" required>
                  <Input
                    id="cf-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    disabled={submitting}
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="pt-3 border-t border-[#111317]/10 flex items-center justify-between gap-3">
              <span className="text-[13px] text-[#4B5260]">
                Updates bcrypt hash and rotates active CSRF binding.
              </span>
              <Button type="submit" variant="primary" loading={submitting}>
                Update Password
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function loadStoredPreferences(storageKey) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_PREFERENCES;
  }
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function SettingsView({ user, onAccountDeleted }) {
  const storageKey = `cyberforge_prefs_${user?.role || 'operator'}_${user?.id || 'default'}`;

  const [prefsState, setPrefsState] = useState(() => ({
    key: storageKey,
    values: loadStoredPreferences(storageKey),
  }));
  const prefs = prefsState.key === storageKey ? prefsState.values : loadStoredPreferences(storageKey);
  const [savedNotice, setSavedNotice] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  function togglePreference(key) {
    const current = prefsState.key === storageKey ? prefsState.values : loadStoredPreferences(storageKey);
    const next = { ...current, [key]: !current[key] };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    setPrefsState({ key: storageKey, values: next });
    setSavedNotice(true);
  }

  useEffect(() => {
    if (!savedNotice) return undefined;
    const timer = window.setTimeout(() => setSavedNotice(false), 1800);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  async function handleConfirmDelete(event) {
    event.preventDefault();
    setDeleteError('');

    if (!user?.id || !user?.role) {
      setDeleteError('Active session details are missing.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Enter your current password to confirm account deletion.');
      return;
    }

    setDeleting(true);
    try {
      await apiFetch('/api/auth/account', {
        method: 'DELETE',
        body: {
          role: user.role,
          user_id: user.id,
          password: deletePassword,
        },
      });
      clearCurrentUser();
      setDeleteModalOpen(false);
      setDeletePassword('');
      onAccountDeleted?.({ skipServerLogout: true });
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete account.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="lg:h-full lg:min-h-0 flex flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl sm:text-[28px] font-bold text-[#111317] leading-tight text-balance">
          Console Settings
        </h1>
        <p className="text-[15px] text-[#4B5260] mt-0.5 text-pretty">
          Configure local console preferences and manage operator lifecycle controls.
        </p>
      </div>

      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 50%: Preferences Folio */}
        <section className="lg:col-span-6 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#111317]/15 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#111317]" weight="bold" />
              <h2 className="text-lg font-bold text-[#111317]">Workspace Preferences</h2>
            </div>
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#047857]">
                <Check className="w-3.5 h-3.5" weight="bold" />
                Saved locally
              </span>
            )}
          </div>

          <div className="flex-1 divide-y divide-[#111317]/10 overflow-y-auto">
            {PREFERENCE_ITEMS.map((item) => {
              const enabled = Boolean(prefs[item.key]);
              return (
                <div
                  key={item.key}
                  className="px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[#111317]">{item.title}</div>
                    <div className="text-[14px] text-[#4B5260] mt-0.5 text-pretty">
                      {item.description}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={item.title}
                    onClick={() => togglePreference(item.key)}
                    className={[
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]',
                      enabled
                        ? 'bg-[#111317] border-[#111317]'
                        : 'bg-[#EAE4D7] border-[#111317]/30',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-block h-4 w-4 rounded-full transition-transform duration-150',
                        enabled
                          ? 'translate-x-5 bg-[#FAF8F3]'
                          : 'translate-x-1 bg-[#4B5260]',
                      ].join(' ')}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right 50%: Account Lifecycle & Danger Zone Folio */}
        <section className="lg:col-span-6 bg-[#FAF8F3] border border-[#C81E1E]/35 rounded-lg flex flex-col justify-between overflow-hidden">
          <div>
            <div className="px-5 py-4 border-b border-[#C81E1E]/20 bg-[#C81E1E]/[0.05] flex items-center gap-2">
              <Warning className="w-4 h-4 text-[#C81E1E]" weight="bold" />
              <h2 className="text-lg font-bold text-[#111317]">Account Lifecycle</h2>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-[16px] font-bold text-[#111317]">Delete operator account</h3>
                <p className="text-[15px] text-[#1C1F26] mt-1.5 leading-relaxed text-pretty">
                  Permanently remove this operator account and its associated session records from
                  CyberForge. Password verification is required before erasure.
                </p>
              </div>

              <div className="p-3.5 rounded-md bg-[#EAE4D7]/60 border border-[#111317]/15 space-y-1.5 text-[14px] text-[#1C1F26]">
                <div className="font-semibold text-[#111317]">Safeguards active</div>
                <p className="text-[#4B5260] text-pretty">
                  The final remaining administrator account cannot be deleted, and active HTTP-only
                  refresh cookies are immediately revoked upon confirmation.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-[#111317]/15 bg-[#EAE4D7]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[13px] font-mono text-[#4B5260]">
              Account: {user?.username || 'operator'} ({user?.role || 'role'})
            </span>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteError('');
                setDeletePassword('');
                setDeleteModalOpen(true);
              }}
              className="shrink-0"
            >
              <Trash className="w-4 h-4" weight="regular" />
              <span>Delete Account</span>
            </Button>
          </div>
        </section>
      </div>

      <Modal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
          }
        }}
        title="Confirm Account Deletion"
        description={`This permanently removes ${user?.username || 'this account'} (${user?.role || 'operator'}) and ends your session.`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="cf-delete-account-form"
              variant="danger"
              loading={deleting}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        <form id="cf-delete-account-form" onSubmit={handleConfirmDelete} className="space-y-4">
          {deleteError && (
            <AlertBanner
              variant="error"
              message={deleteError}
              onDismiss={() => setDeleteError('')}
            />
          )}
          <Field
            label="Verify current password"
            htmlFor="cf-delete-account-password"
            required
          >
            <Input
              id="cf-delete-account-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={deleting}
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
