import React, { useEffect, useState } from 'react';
import {
  Check,
  Key,
  Sliders,
  Trash,
  User,
  Warning,
} from '@phosphor-icons/react';
import { apiFetch } from '../../utils/api';
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
  moderator: 'teal',
  attacker: 'red',
  defender: 'green',
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
    description: 'Display Ctrl+K and Ctrl+Enter keycap hints in workspace controls.',
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
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Operator Profile</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Inspect your account identity and manage authentication credentials.
        </p>
      </div>

      {Array.isArray(stats) && stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, idx) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Account Details Panel */}
        <section className="lg:col-span-5 bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
          <div className="p-5 border-b border-[#232326] flex items-center gap-4">
            <div className="w-12 h-12 rounded-[6px] bg-[#1B1B1E] border border-[#232326] flex items-center justify-center text-base font-semibold font-mono text-[#00E5CC] shrink-0">
              {getInitials(user)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-zinc-100 truncate">
                  {user?.username || 'Unknown Operator'}
                </h2>
                <Badge variant={roleVariant}>{roleLabel}</Badge>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {user?.email || 'No email on record'}
              </p>
            </div>
          </div>

          <div className="px-5 py-3 border-b border-[#232326] flex items-center gap-2 text-xs font-medium text-zinc-300">
            <User className="w-3.5 h-3.5 text-[#00E5CC]" weight="regular" />
            <span>Account Details</span>
          </div>

          <dl className="divide-y divide-[#232326] text-sm">
            <div className="px-5 py-3 flex items-center justify-between gap-4">
              <dt className="text-xs text-zinc-400">Account ID</dt>
              <dd className="font-mono tabular-nums text-xs text-zinc-200">
                #{user?.id ?? '—'}
              </dd>
            </div>
            <div className="px-5 py-3 flex items-center justify-between gap-4">
              <dt className="text-xs text-zinc-400">Username</dt>
              <dd className="text-xs font-medium text-zinc-100 truncate">
                {user?.username || '—'}
              </dd>
            </div>
            <div className="px-5 py-3 flex items-center justify-between gap-4">
              <dt className="text-xs text-zinc-400">Email</dt>
              <dd className="text-xs text-zinc-200 truncate">
                {user?.email || '—'}
              </dd>
            </div>
            <div className="px-5 py-3 flex items-center justify-between gap-4">
              <dt className="text-xs text-zinc-400">Assigned Role</dt>
              <dd>
                <Badge variant={roleVariant}>{roleLabel}</Badge>
              </dd>
            </div>
            <div className="px-5 py-3 flex items-center justify-between gap-4">
              <dt className="text-xs text-zinc-400">Member Since</dt>
              <dd className="font-mono tabular-nums text-xs text-zinc-300">
                {formatTimestamp(user?.created_at)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Change Password Panel */}
        <section className="lg:col-span-7 bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#232326] flex items-center gap-2">
            <Key className="w-4 h-4 text-[#00E5CC]" weight="regular" />
            <h2 className="text-sm font-semibold text-zinc-100">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
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
                hint="8 to 72 UTF-8 bytes"
                required
              >
                <Input
                  id="cf-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
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

            <div className="pt-2 flex items-center justify-end">
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
      setDeleteModalOpen(false);
      setDeletePassword('');
      onAccountDeleted?.();
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete account.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Console Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure workspace preferences and manage account lifecycle actions.
        </p>
      </div>

      {/* Preferences Panel */}
      <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#232326] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00E5CC]" weight="regular" />
            <h2 className="text-sm font-semibold text-zinc-100">Workspace Preferences</h2>
          </div>
          {savedNotice && (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-[#10B981]">
              <Check className="w-3.5 h-3.5" weight="bold" />
              Saved locally
            </span>
          )}
        </div>

        <div className="divide-y divide-[#232326]">
          {PREFERENCE_ITEMS.map((item) => {
            const enabled = Boolean(prefs[item.key]);
            return (
              <div
                key={item.key}
                className="px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-100">{item.title}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{item.description}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={item.title}
                  onClick={() => togglePreference(item.key)}
                  className={[
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
                    enabled
                      ? 'bg-[#00E5CC] border-[#00E5CC]'
                      : 'bg-[#0A0A0B] border-[#2E2E33]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-block h-3.5 w-3.5 rounded-full transition-transform duration-150',
                      enabled
                        ? 'translate-x-4 bg-[#0A0A0B]'
                        : 'translate-x-0.5 bg-zinc-400',
                    ].join(' ')}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-[#141416] border border-[#EF4444]/30 rounded-[6px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EF4444]/20 flex items-center gap-2">
          <Warning className="w-4 h-4 text-[#EF4444]" weight="bold" />
          <h2 className="text-sm font-semibold text-zinc-100">Danger Zone</h2>
        </div>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-100">Delete operator account</div>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
              Permanently remove this account and its associated records from CyberForge.
              The last remaining administrator account cannot be deleted.
            </p>
          </div>
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
