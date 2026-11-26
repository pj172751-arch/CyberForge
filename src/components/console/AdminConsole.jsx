import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ChartBar,
  Database,
  Gauge,
  Gear,
  Key,
  LinkSimple,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  TerminalWindow,
  Trash,
  UserCircle,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
import { API_BASE, apiFetch } from '../../utils/api';
import { AlertBanner, Badge, Button, EmptyState, Field, Input, SkeletonRows } from '../ui/primitives';
import {
  AnimatedTicker,
  BorderSweep,
  CopyChip,
  SlideOverInspector,
  SpotlightSurface,
  TactileToast,
} from '../ui/spells';
import CommandDeckShell from './CommandDeckShell';
import { ProfileView, SettingsView } from './AccountViews';

const INITIAL_CREATE_FORM = {
  username: '',
  email: '',
  password: '',
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'challenges', label: 'Most Challenges' },
  { id: 'trainees', label: 'Most Trainees' },
];

const DVWA_URL = 'http://localhost:8081';

function formatTimestamp(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function formatShortDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function getInitials(name) {
  const source = (name || 'MD').trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function utf8ByteLength(str) {
  return new TextEncoder().encode(str).length;
}

function IdentityDistributionBar({ moderatorsCount, attackersCount, defendersCount }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  const segments = useMemo(
    () => [
      {
        key: 'moderators',
        label: 'Moderators',
        count: moderatorsCount,
        color: '#F59E0B',
        dotClass: 'bg-[#F59E0B]',
      },
      {
        key: 'attackers',
        label: 'Attackers',
        count: attackersCount,
        color: '#F43F5E',
        dotClass: 'bg-[#F43F5E]',
      },
      {
        key: 'defenders',
        label: 'Defenders',
        count: defendersCount,
        color: '#10B981',
        dotClass: 'bg-[#10B981]',
      },
    ],
    [moderatorsCount, attackersCount, defendersCount]
  );

  const total = moderatorsCount + attackersCount + defendersCount;
  const widthTotal = 600;
  const barHeight = 14;

  const computedRects = useMemo(() => {
    if (total <= 0) return [];
    let cursor = 0;
    return segments
      .filter((seg) => seg.count > 0)
      .map((seg) => {
        const w = (seg.count / total) * widthTotal;
        const rect = {
          ...seg,
          x: cursor,
          width: Math.max(w, 4),
          pct: Math.round((seg.count / total) * 100),
        };
        cursor += w;
        return rect;
      });
  }, [segments, total]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Operational Cohort Distribution</span>
        <span className="font-mono tabular-nums text-zinc-300">
          {total.toLocaleString()} active seats
        </span>
      </div>

      <div className="rounded-lg bg-[#07080B] border border-white/[0.08] p-2">
        <svg
          viewBox={`0 0 ${widthTotal} ${barHeight}`}
          className="w-full h-3.5 rounded overflow-hidden block"
          role="img"
          aria-label={`Cohort distribution: ${moderatorsCount} moderators, ${attackersCount} attackers, ${defendersCount} defenders`}
        >
          <rect x="0" y="0" width={widthTotal} height={barHeight} fill="#141821" rx="4" />
          {computedRects.map((rect) => {
            const dimmed = hoveredKey && hoveredKey !== rect.key;
            return (
              <rect
                key={rect.key}
                x={rect.x}
                y="0"
                width={rect.width}
                height={barHeight}
                fill={rect.color}
                opacity={dimmed ? 0.35 : 0.92}
                className="transition-opacity duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredKey(rect.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <title>{`${rect.label}: ${rect.count} (${rect.pct}%)`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
          const active = hoveredKey === seg.key;
          return (
            <button
              key={seg.key}
              type="button"
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onFocus={() => setHoveredKey(seg.key)}
              onBlur={() => setHoveredKey(null)}
              className={[
                'inline-flex items-center gap-2 text-xs rounded-md px-1.5 py-0.5 transition-colors',
                active ? 'bg-white/[0.06] text-zinc-100' : 'text-zinc-300',
              ].join(' ')}
            >
              <span className={['w-2 h-2 rounded-sm shrink-0', seg.dotClass].join(' ')} />
              <span className="text-zinc-400">{seg.label}</span>
              <span className="font-mono tabular-nums font-medium text-zinc-100">
                {seg.count}
              </span>
              <span className="font-mono tabular-nums text-[11px] text-zinc-500">
                ({pct}%)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfrastructureTopologySvg({ dbConnected, dbChecking }) {
  const pgColor = dbConnected ? '#10B981' : dbChecking ? '#F59E0B' : '#EF4444';
  const pgLabel = dbConnected ? 'CONNECTED' : dbChecking ? 'CHECKING' : 'DEGRADED';

  return (
    <div className="rounded-xl bg-[#07080B]/90 border border-white/[0.07] p-3">
      <svg
        viewBox="0 0 420 206"
        className="w-full h-auto block"
        role="img"
        aria-label="CyberForge infrastructure topology linking Console 5173, FastAPI 8000, Postgres 5433, and DVWA 8081"
      >
        {/* Orthogonal Routing Bus */}
        <path
          d="M 118 103 L 166 103"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeOpacity="0.65"
          fill="none"
        />
        <path
          d="M 272 90 L 302 90 L 302 52 L 322 52"
          stroke={pgColor}
          strokeWidth="1.5"
          strokeOpacity="0.75"
          strokeDasharray={dbConnected ? 'none' : '4 3'}
          fill="none"
        />
        <path
          d="M 272 116 L 302 116 L 302 154 L 322 154"
          stroke="#00E5CC"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          fill="none"
        />

        {/* Junction Nodes */}
        <circle cx="142" cy="103" r="2.5" fill="#F59E0B" />
        <circle cx="302" cy="52" r="2.5" fill={pgColor} />
        <circle cx="302" cy="154" r="2.5" fill="#00E5CC" />

        {/* Node 1: Console :5173 */}
        <g>
          <rect
            x="10"
            y="74"
            width="108"
            height="58"
            rx="8"
            fill="#0E1016"
            stroke="rgba(245,158,11,0.35)"
            strokeWidth="1"
          />
          <circle cx="23" cy="90" r="3" fill="#F59E0B" />
          <text x="32" y="94" fill="#F4F4F5" fontSize="11" fontWeight="600">
            Console
          </text>
          <text
            x="23"
            y="112"
            fill="#A1A1AA"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
          >
            Vite :5173
          </text>
        </g>

        {/* Node 2: FastAPI :8000 */}
        <g>
          <rect
            x="166"
            y="68"
            width="106"
            height="70"
            rx="8"
            fill="#0E1016"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
          />
          <circle cx="179" cy="86" r="3" fill="#10B981" />
          <text x="188" y="90" fill="#F4F4F5" fontSize="11" fontWeight="600">
            FastAPI
          </text>
          <text
            x="179"
            y="108"
            fill="#A1A1AA"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
          >
            API :8000
          </text>
          <text
            x="179"
            y="124"
            fill="#71717A"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
          >
            bcrypt auth
          </text>
        </g>

        {/* Node 3: Postgres app_db :5433 */}
        <g>
          <rect
            x="322"
            y="20"
            width="88"
            height="64"
            rx="8"
            fill="#0E1016"
            stroke={pgColor}
            strokeOpacity="0.55"
            strokeWidth="1"
          />
          <circle cx="334" cy="36" r="3" fill={pgColor} />
          <text x="342" y="40" fill="#F4F4F5" fontSize="10.5" fontWeight="600">
            Postgres
          </text>
          <text
            x="334"
            y="56"
            fill="#A1A1AA"
            fontSize="9.5"
            fontFamily="JetBrains Mono, monospace"
          >
            app_db:5433
          </text>
          <text
            x="334"
            y="71"
            fill={pgColor}
            fontSize="8.5"
            fontFamily="JetBrains Mono, monospace"
          >
            {pgLabel}
          </text>
        </g>

        {/* Node 4: DVWA Target :8081 */}
        <g>
          <rect
            x="322"
            y="122"
            width="88"
            height="64"
            rx="8"
            fill="#0E1016"
            stroke="rgba(0,229,204,0.38)"
            strokeWidth="1"
          />
          <circle cx="334" cy="138" r="3" fill="#00E5CC" />
          <text x="342" y="142" fill="#F4F4F5" fontSize="10.5" fontWeight="600">
            DVWA
          </text>
          <text
            x="334"
            y="158"
            fill="#A1A1AA"
            fontSize="9.5"
            fontFamily="JetBrains Mono, monospace"
          >
            Target:8081
          </text>
          <text
            x="334"
            y="173"
            fill="#71717A"
            fontSize="8.5"
            fontFamily="JetBrains Mono, monospace"
          >
            MariaDB:3306
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function AdminConsole({ user, onSignOut, onOpenOverview }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [stats, setStats] = useState(null);
  const [moderators, setModerators] = useState([]);
  const [dbHealth, setDbHealth] = useState({ status: 'checking', database: 'checking' });
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState('create'); // 'create' | 'inspect'
  const [selectedModerator, setSelectedModerator] = useState(null);
  const [formState, setFormState] = useState(INITIAL_CREATE_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [toasts, setToasts] = useState([]);
  const toastTimersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ variant = 'info', title, message }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, variant, title, message }]);
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
      toastTimersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    const [statsRes, modsRes, healthRes] = await Promise.all([
      apiFetch('/api/admin/stats'),
      apiFetch('/api/moderators'),
      apiFetch('/health/db').catch(() => ({ status: 'error', database: 'offline' })),
    ]);
    return { statsRes, modsRes, healthRes };
  }, []);

  const loadData = useCallback(
    async ({ notify = false } = {}) => {
      setRefreshing(true);
      setError('');

      try {
        const { statsRes, modsRes, healthRes } = await fetchDashboardData();
        setStats(statsRes);
        setModerators(Array.isArray(modsRes) ? modsRes : []);
        setDbHealth(healthRes || { status: 'error', database: 'offline' });
        setLastSyncedAt(new Date().toISOString());
        if (notify) {
          pushToast({
            variant: 'success',
            title: 'Telemetry Synced',
            message: 'Platform metrics, moderator roster, and Postgres health refreshed.',
          });
        }
      } catch (err) {
        const msg = err.message || 'Failed to load administrator telemetry.';
        setError(msg);
        if (notify) {
          pushToast({
            variant: 'error',
            title: 'Sync Failed',
            message: msg,
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchDashboardData, pushToast]
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const { statsRes, modsRes, healthRes } = await fetchDashboardData();
        if (cancelled) return;
        setStats(statsRes);
        setModerators(Array.isArray(modsRes) ? modsRes : []);
        setDbHealth(healthRes || { status: 'error', database: 'offline' });
        setLastSyncedAt(new Date().toISOString());
        setError('');
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load administrator telemetry.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData]);

  const totalIdentities = useMemo(() => {
    if (!stats) return 0;
    return (
      (stats.admins_count || 0) +
      (stats.moderators_count || 0) +
      (stats.attackers_count || 0) +
      (stats.defenders_count || 0)
    );
  }, [stats]);

  const totalActivity = useMemo(() => {
    if (!stats) return 0;
    return (
      (stats.total_attempts || 0) +
      (stats.total_defenses || 0) +
      (stats.total_alerts || 0)
    );
  }, [stats]);

  const dbConnected =
    dbHealth?.status === 'ok' && dbHealth?.database === 'connected';
  const dbChecking =
    dbHealth?.status === 'checking' || dbHealth?.database === 'checking';

  const maxWorkload = useMemo(() => {
    if (!moderators.length) return 1;
    const peak = Math.max(
      ...moderators.map((m) => (m.challenges_count || 0) + (m.accounts_managed || 0))
    );
    return Math.max(peak, 1);
  }, [moderators]);

  const filteredAndSortedModerators = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const filtered = !term
      ? moderators
      : moderators.filter((mod) => {
          const idStr = String(mod.moderator_id ?? '');
          return (
            mod.username?.toLowerCase().includes(term) ||
            mod.email?.toLowerCase().includes(term) ||
            idStr.includes(term)
          );
        });

    const list = [...filtered];
    if (sortBy === 'challenges') {
      list.sort(
        (a, b) =>
          (b.challenges_count || 0) - (a.challenges_count || 0) ||
          (b.moderator_id || 0) - (a.moderator_id || 0)
      );
    } else if (sortBy === 'trainees') {
      list.sort(
        (a, b) =>
          (b.accounts_managed || 0) - (a.accounts_managed || 0) ||
          (b.moderator_id || 0) - (a.moderator_id || 0)
      );
    } else {
      list.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta || (b.moderator_id || 0) - (a.moderator_id || 0);
      });
    }
    return list;
  }, [moderators, searchQuery, sortBy]);

  const oversightModerators = useMemo(() => {
    return [...moderators]
      .sort(
        (a, b) =>
          (b.challenges_count || 0) +
          (b.accounts_managed || 0) -
          ((a.challenges_count || 0) + (a.accounts_managed || 0))
      )
      .slice(0, 6);
  }, [moderators]);

  const openProvisionInspector = useCallback(() => {
    setSelectedModerator(null);
    setFormState(INITIAL_CREATE_FORM);
    setFormError('');
    setConfirmingDelete(false);
    setInspectorMode('create');
    setInspectorOpen(true);
  }, []);

  const openModeratorInspector = useCallback((mod) => {
    setSelectedModerator(mod);
    setFormState({
      username: mod.username || '',
      email: mod.email || '',
      password: '',
    });
    setFormError('');
    setConfirmingDelete(false);
    setInspectorMode('inspect');
    setInspectorOpen(true);
  }, []);

  const closeInspector = useCallback(() => {
    if (submitting) return;
    setInspectorOpen(false);
    setFormError('');
    setConfirmingDelete(false);
  }, [submitting]);

  async function handleSaveModerator(event) {
    event.preventDefault();
    setFormError('');

    const username = formState.username.trim();
    const email = formState.email.trim().toLowerCase();
    const password = formState.password;

    if (username.length < 2) {
      setFormError('Username must be at least 2 characters.');
      return;
    }
    if (!email || !email.includes('@')) {
      setFormError('Enter a valid email address.');
      return;
    }

    if (inspectorMode === 'create') {
      if (password.length < 8) {
        setFormError('Password must be at least 8 characters.');
        return;
      }
      if (utf8ByteLength(password) > 72) {
        setFormError('Password must be at most 72 UTF-8 bytes.');
        return;
      }
    } else if (password) {
      if (password.length < 8) {
        setFormError('New password must be at least 8 characters.');
        return;
      }
      if (utf8ByteLength(password) > 72) {
        setFormError('New password must be at most 72 UTF-8 bytes.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (inspectorMode === 'create') {
        const created = await apiFetch('/api/moderators', {
          method: 'POST',
          body: {
            username,
            email,
            password,
            ...(user?.role === 'admin' && user?.id ? { admin_id: user.id } : {}),
          },
        });
        setInspectorOpen(false);
        setSelectedModerator(null);
        await loadData();
        pushToast({
          variant: 'success',
          title: 'Moderator Provisioned',
          message: `Account ${created?.username || username} is now active.`,
        });
      } else if (inspectorMode === 'inspect' && selectedModerator) {
        const updated = await apiFetch(`/api/moderators/${selectedModerator.moderator_id}`, {
          method: 'PUT',
          body: {
            username,
            email,
            ...(password ? { password } : {}),
          },
        });
        setInspectorOpen(false);
        setSelectedModerator(null);
        await loadData();
        pushToast({
          variant: 'success',
          title: password ? 'Credentials Updated' : 'Moderator Updated',
          message: `${updated?.username || username} changes saved.`,
        });
      }
    } catch (err) {
      const msg = err.message || 'Unable to save moderator account.';
      setFormError(msg);
      pushToast({
        variant: 'error',
        title: 'Save Failed',
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDeleteModerator() {
    if (!selectedModerator) return;
    setFormError('');
    setSubmitting(true);

    const targetName = selectedModerator.username;
    try {
      await apiFetch(`/api/moderators/${selectedModerator.moderator_id}`, {
        method: 'DELETE',
      });
      setInspectorOpen(false);
      setSelectedModerator(null);
      setConfirmingDelete(false);
      await loadData();
      pushToast({
        variant: 'success',
        title: 'Moderator Removed',
        message: `${targetName} deleted; dependent labs and trainees remain unlinked.`,
      });
    } catch (err) {
      const msg = err.message || 'Unable to remove moderator.';
      setFormError(msg);
      pushToast({
        variant: 'error',
        title: 'Removal Failed',
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const navItems = useMemo(
    () => [
      { id: 'overview', label: 'Command', icon: Gauge },
      { id: 'moderators', label: 'Moderators', icon: UsersThree, badge: moderators.length },
      { id: 'ledger', label: 'Topology & DB', icon: Database },
      { id: 'profile', label: 'Profile', icon: UserCircle },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [moderators.length]
  );

  const commandGroups = useMemo(() => {
    const viewItems = navItems.map((item, idx) => ({
      id: `view-${item.id}`,
      label: item.label,
      hint: `Switch to ${item.label} view`,
      shortcut: String(idx + 1),
      icon: item.icon,
      onSelect: () => setActiveTab(item.id),
    }));

    const actionItems = [
      {
        id: 'action-provision-mod',
        label: 'Provision Moderator',
        hint: 'Open slide-over drawer to create a new moderator account',
        icon: Plus,
        onSelect: openProvisionInspector,
      },
      {
        id: 'action-refresh-telemetry',
        label: 'Refresh Telemetry',
        hint: 'Re-fetch /api/admin/stats, /api/moderators, and /health/db',
        icon: ArrowsClockwise,
        onSelect: () => loadData({ notify: true }),
      },
      ...(onOpenOverview
        ? [
            {
              id: 'action-open-overview',
              label: 'Return to Role Overview',
              hint: 'Open platform role landing overview',
              icon: ArrowSquareOut,
              onSelect: onOpenOverview,
            },
          ]
        : []),
    ];

    return [
      { heading: 'Governance Views', items: viewItems },
      { heading: 'Control Actions', items: actionItems },
      ...(moderators.length > 0
        ? [
            {
              heading: 'Inspect Moderator',
              items: moderators.slice(0, 12).map((mod) => ({
                id: `inspect-mod-${mod.moderator_id}`,
                label: mod.username,
                hint: `#${mod.moderator_id} · ${mod.email} · ${mod.challenges_count ?? 0} labs`,
                icon: UsersThree,
                onSelect: () => openModeratorInspector(mod),
              })),
            },
          ]
        : []),
    ];
  }, [navItems, moderators, openProvisionInspector, openModeratorInspector, loadData, onOpenOverview]);

  const profileStats = useMemo(
    () => [
      {
        label: 'Total Moderators',
        value: stats?.moderators_count ?? moderators.length,
        detail: `${stats?.admins_count ?? 0} admins active`,
        icon: UsersThree,
        accent: 'amber',
      },
      {
        label: 'Total Identities',
        value: totalIdentities,
        detail: `${stats?.attackers_count ?? 0} attackers, ${stats?.defenders_count ?? 0} defenders`,
        icon: ShieldCheck,
        accent: 'teal',
      },
      {
        label: 'Challenges Published',
        value: stats?.challenges_count ?? 0,
        detail: 'DVWA training modules',
        icon: ChartBar,
        accent: 'green',
      },
      {
        label: 'Recorded Events',
        value: totalActivity,
        detail: `${stats?.total_alerts ?? 0} alerts logged`,
        icon: Database,
        accent: 'default',
      },
    ],
    [stats, moderators.length, totalIdentities, totalActivity]
  );

  const schemaLedger = useMemo(() => {
    const rows = [
      {
        table: 'admin',
        domain: 'Governance',
        barColor: 'bg-[#F59E0B]',
        badgeVariant: 'amber',
        count: stats?.admins_count ?? 0,
        purpose: 'Top-level root governance administrators',
      },
      {
        table: 'moderator',
        domain: 'Governance',
        barColor: 'bg-[#F59E0B]',
        badgeVariant: 'amber',
        count: stats?.moderators_count ?? 0,
        purpose: 'Challenge authoring and trainee oversight operators',
      },
      {
        table: 'attacker',
        domain: 'Red Team',
        barColor: 'bg-[#F43F5E]',
        badgeVariant: 'red',
        count: stats?.attackers_count ?? 0,
        purpose: 'Offensive security trainee accounts',
      },
      {
        table: 'defender',
        domain: 'Blue Team',
        barColor: 'bg-[#10B981]',
        badgeVariant: 'green',
        count: stats?.defenders_count ?? 0,
        purpose: 'Defensive remediation trainee accounts',
      },
      {
        table: 'challenges',
        domain: 'Training',
        barColor: 'bg-[#00E5CC]',
        badgeVariant: 'teal',
        count: stats?.challenges_count ?? 0,
        purpose: 'Published DVWA vulnerability scenarios',
      },
      {
        table: 'attempts',
        domain: 'Telemetry',
        barColor: 'bg-[#F43F5E]',
        badgeVariant: 'red',
        count: stats?.total_attempts ?? 0,
        purpose: 'Recorded attacker exploit payload submissions',
      },
      {
        table: 'defenses',
        domain: 'Telemetry',
        barColor: 'bg-[#10B981]',
        badgeVariant: 'green',
        count: stats?.total_defenses ?? 0,
        purpose: 'Verified defender security-level remediations',
      },
      {
        table: 'alerts',
        domain: 'Telemetry',
        barColor: 'bg-[#F59E0B]',
        badgeVariant: 'amber',
        count: stats?.total_alerts ?? 0,
        purpose: 'Platform-wide security audit alerts',
      },
    ];
    const maxCount = Math.max(...rows.map((r) => r.count), 1);
    return rows.map((row) => ({
      ...row,
      pct: Math.round((row.count / maxCount) * 100),
    }));
  }, [stats]);

  const headerActions = (
    <button
      type="button"
      onClick={() => loadData({ notify: true })}
      disabled={refreshing}
      aria-label="Refresh telemetry"
      title="Refresh telemetry"
      className="hidden sm:inline-flex h-9 w-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] items-center justify-center text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F59E0B]"
    >
      <ArrowsClockwise
        className={['w-4 h-4', refreshing ? 'animate-spin text-[#F59E0B]' : ''].join(' ')}
        weight="bold"
      />
    </button>
  );

  return (
    <CommandDeckShell
      user={user}
      roleTheme="admin"
      roleLabel="ROOT GOVERNANCE"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={(val) => {
        setSearchQuery(val);
        if (val.trim() && activeTab !== 'moderators') {
          setActiveTab('moderators');
        }
      }}
      searchPlaceholder="Filter moderators or Ctrl+K..."
      commandGroups={commandGroups}
      headerActions={headerActions}
      onSignOut={onSignOut}
    >
      {error && (
        <AlertBanner
          variant="error"
          message={error}
          onDismiss={() => setError('')}
          className="mb-5"
        />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Asymmetric 12-Column Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 7 Cols: Platform Command Hero */}
            <SpotlightSurface
              accent="amber"
              padding="p-5 sm:p-6"
              className="lg:col-span-7 flex flex-col justify-between gap-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <h1 className="text-2xl sm:text-[26px] font-semibold text-zinc-100 tracking-[-0.025em] leading-tight">
                    Root Governance Control Plane
                  </h1>
                  <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
                    Oversee CyberForge identity distribution, delegate moderator authority, and audit live DVWA range health.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openProvisionInspector}
                    className="h-9 px-3.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#07080B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
                  >
                    <Plus className="w-3.5 h-3.5" weight="bold" />
                    <span>Provision Moderator</span>
                  </button>
                </div>
              </div>

              {/* Hero Ticker + Dual Operational Pulse Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-6 rounded-xl bg-[#07080B]/85 border border-white/[0.07] p-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                    <span>Total Identities</span>
                    <span className="font-mono tabular-nums text-[11px] text-[#F59E0B]">
                      {stats?.admins_count ?? 0} root
                    </span>
                  </div>
                  {loading ? (
                    <div className="h-10 w-28 rounded bg-white/[0.06] animate-pulse mt-2" />
                  ) : (
                    <div className="mt-1.5">
                      <AnimatedTicker
                        value={totalIdentities}
                        className="text-4xl font-bold tracking-tight text-zinc-100"
                      />
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2">
                    Admins, moderators, attackers, and defenders
                  </p>
                </div>

                <div className="sm:col-span-3 rounded-xl bg-[#07080B]/85 border border-white/[0.07] p-4">
                  <div className="text-xs text-zinc-400 truncate">Published Challenges</div>
                  {loading ? (
                    <div className="h-8 w-16 rounded bg-white/[0.06] animate-pulse mt-2" />
                  ) : (
                    <div className="mt-1.5">
                      <AnimatedTicker
                        value={stats?.challenges_count ?? 0}
                        className="text-2xl font-semibold text-[#00E5CC]"
                      />
                    </div>
                  )}
                  <div className="text-[11px] text-zinc-500 mt-1.5 truncate">DVWA modules</div>
                </div>

                <div className="sm:col-span-3 rounded-xl bg-[#07080B]/85 border border-white/[0.07] p-4">
                  <div className="text-xs text-zinc-400 truncate">Recorded Events</div>
                  {loading ? (
                    <div className="h-8 w-16 rounded bg-white/[0.06] animate-pulse mt-2" />
                  ) : (
                    <div className="mt-1.5">
                      <AnimatedTicker
                        value={totalActivity}
                        className="text-2xl font-semibold text-[#F59E0B]"
                      />
                    </div>
                  )}
                  <div className="text-[11px] font-mono tabular-nums text-zinc-500 mt-1.5 truncate">
                    {stats?.total_alerts ?? 0} alerts
                  </div>
                </div>
              </div>

              {/* Custom SVG Stacked Distribution Bar */}
              <IdentityDistributionBar
                moderatorsCount={stats?.moderators_count ?? moderators.length}
                attackersCount={stats?.attackers_count ?? 0}
                defendersCount={stats?.defenders_count ?? 0}
              />
            </SpotlightSurface>

            {/* Right 5 Cols: Live Infrastructure Topology SVG */}
            <SpotlightSurface
              accent="teal"
              padding="p-5 sm:p-6"
              className="lg:col-span-5 flex flex-col justify-between gap-4"
            >
              <BorderSweep color="#F59E0B" secondary="#00E5CC" duration={9} />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-100 tracking-[-0.015em]">
                    Infrastructure Topology
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live plane routing and database heartbeat
                  </p>
                </div>

                <div
                  className={[
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono shrink-0',
                    dbConnected
                      ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                      : dbChecking
                        ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                        : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'w-1.5 h-1.5 rounded-full',
                      dbConnected
                        ? 'bg-[#10B981] animate-pulse'
                        : dbChecking
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#EF4444]',
                    ].join(' ')}
                  />
                  <span>{dbConnected ? 'CONNECTED' : dbChecking ? 'CHECKING' : 'DEGRADED'}</span>
                </div>
              </div>

              <InfrastructureTopologySvg dbConnected={dbConnected} dbChecking={dbChecking} />

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400 shrink-0">FastAPI Control Plane</span>
                  <CopyChip value={API_BASE} label={API_BASE} />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400 shrink-0">DVWA Vulnerable Target</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CopyChip value={DVWA_URL} label={DVWA_URL} />
                    <a
                      href={DVWA_URL}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open DVWA target in new tab"
                      className="h-7 w-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] inline-flex items-center justify-center text-zinc-300 hover:text-[#00E5CC] transition-colors shrink-0"
                    >
                      <ArrowSquareOut className="w-3.5 h-3.5" weight="regular" />
                    </a>
                  </div>
                </div>
              </div>
            </SpotlightSurface>
          </div>

          {/* Compact Moderator Oversight Strip */}
          <SpotlightSurface accent="amber" padding="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-zinc-100 tracking-[-0.015em]">
                    Moderator Oversight
                  </h2>
                  <Badge variant="amber" className="font-mono tabular-nums">
                    {moderators.length} active
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Proportional challenge and trainee load per operator. Select any operator to inspect or rotate credentials.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab('moderators')}
                >
                  <UsersThree className="w-3.5 h-3.5" weight="regular" />
                  <span>Full Directory</span>
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="pt-4">
                <SkeletonRows rows={3} columns={4} />
              </div>
            ) : oversightModerators.length === 0 ? (
              <div className="pt-4">
                <EmptyState
                  icon={UsersThree}
                  title="No moderators provisioned"
                  description="Provision a moderator account to delegate challenge authoring and trainee oversight."
                  action={
                    <button
                      type="button"
                      onClick={openProvisionInspector}
                      className="h-8 px-3 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#07080B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" weight="bold" />
                      <span>Provision Moderator</span>
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-4">
                {oversightModerators.map((mod) => {
                  const challenges = mod.challenges_count || 0;
                  const trainees = mod.accounts_managed || 0;
                  const totalLoad = challenges + trainees;
                  const challengePct = Math.round((challenges / maxWorkload) * 100);
                  const traineePct = Math.round((trainees / maxWorkload) * 100);

                  return (
                    <button
                      key={mod.moderator_id}
                      type="button"
                      onClick={() => openModeratorInspector(mod)}
                      className="text-left rounded-xl bg-[#07080B]/80 hover:bg-white/[0.04] border border-white/[0.08] hover:border-[#F59E0B]/40 p-3.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F59E0B]"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-xs font-mono font-semibold text-[#F59E0B] shrink-0">
                            {getInitials(mod.username)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-100 truncate">
                              {mod.username}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {mod.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-zinc-400 shrink-0">
                          #{mod.moderator_id}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                          {challenges > 0 && (
                            <div
                              className="h-full bg-[#F59E0B]"
                              style={{ width: `${Math.max(challengePct, 4)}%` }}
                            />
                          )}
                          {trainees > 0 && (
                            <div
                              className="h-full bg-[#00E5CC]"
                              style={{ width: `${Math.max(traineePct, 4)}%` }}
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                          <span>{challenges} challenges</span>
                          <span>{trainees} trainees</span>
                          <span className="text-zinc-500">{totalLoad} load</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SpotlightSurface>
        </div>
      )}

      {activeTab === 'moderators' && (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-zinc-100 tracking-[-0.02em]">
                Moderators Directory
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Showing {filteredAndSortedModerators.length} of {moderators.length} provisioned moderator operators.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                role="group"
                aria-label="Sort moderators"
                className="inline-flex items-center rounded-xl bg-[#0D0F14]/90 border border-white/[0.08] p-1 gap-0.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 mx-1.5" weight="regular" />
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSortBy(opt.id)}
                      className={[
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                        active
                          ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size="sm"
                loading={refreshing}
                onClick={() => loadData({ notify: true })}
              >
                <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
                <span>Refresh</span>
              </Button>

              <button
                type="button"
                onClick={openProvisionInspector}
                className="h-8 px-3 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#07080B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
              >
                <Plus className="w-3.5 h-3.5" weight="bold" />
                <span>Provision Moderator</span>
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonRows rows={5} columns={5} />
          ) : filteredAndSortedModerators.length === 0 ? (
            <EmptyState
              icon={UsersThree}
              title={searchQuery ? 'No matching moderators' : 'No moderators configured'}
              description={
                searchQuery
                  ? `No moderator accounts match "${searchQuery}".`
                  : 'Provision a moderator account to delegate challenge authoring and trainee oversight.'
              }
              action={
                searchQuery ? (
                  <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={openProvisionInspector}
                    className="h-8 px-3 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#07080B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" weight="bold" />
                    <span>Provision Moderator</span>
                  </button>
                )
              }
            />
          ) : (
            <SpotlightSurface accent="amber" className="divide-y divide-white/[0.07]">
              {filteredAndSortedModerators.map((mod) => {
                const challenges = mod.challenges_count || 0;
                const trainees = mod.accounts_managed || 0;
                const challengePct = Math.round((challenges / maxWorkload) * 100);
                const traineePct = Math.round((trainees / maxWorkload) * 100);

                return (
                  <div
                    key={mod.moderator_id}
                    className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.025] transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-sm font-mono font-semibold text-[#F59E0B] shrink-0">
                        {getInitials(mod.username)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-100 truncate">
                            {mod.username}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                            #{mod.moderator_id}
                          </span>
                          {mod.admin_id !== null && mod.admin_id !== undefined && (
                            <Badge variant="neutral" className="font-mono tabular-nums">
                              Admin #{mod.admin_id}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <CopyChip value={mod.email} label={mod.email} />
                          <span className="text-xs font-mono tabular-nums text-zinc-500">
                            Joined {formatShortDate(mod.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 shrink-0">
                      <div className="w-full sm:w-48 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                          <span>{challenges} labs</span>
                          <span>{trainees} trainees</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                          {challenges > 0 && (
                            <div
                              className="h-full bg-[#F59E0B]"
                              style={{ width: `${Math.max(challengePct, 4)}%` }}
                            />
                          )}
                          {trainees > 0 && (
                            <div
                              className="h-full bg-[#00E5CC]"
                              style={{ width: `${Math.max(traineePct, 4)}%` }}
                            />
                          )}
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openModeratorInspector(mod)}
                        aria-label={`Inspect ${mod.username}`}
                        className="self-start sm:self-auto"
                      >
                        <TerminalWindow className="w-3.5 h-3.5 text-[#F59E0B]" weight="regular" />
                        <span>Inspect</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </SpotlightSurface>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-zinc-100 tracking-[-0.02em]">
                Topology & Database Ledger
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Live row telemetry across all 8 PostgreSQL tables and runtime service endpoints.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {lastSyncedAt && (
                <span className="hidden md:inline text-xs font-mono tabular-nums text-zinc-500">
                  Synced {formatTimestamp(lastSyncedAt)}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                loading={refreshing}
                onClick={() => loadData({ notify: true })}
              >
                <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
                <span>Refresh Ledger</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SpotlightSurface accent="teal" padding="p-4" className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-xs text-zinc-400">PostgreSQL Health (/health/db)</div>
                <div className="text-sm font-semibold font-mono text-zinc-100 truncate">
                  {dbHealth?.database || 'unknown'}
                </div>
                <CopyChip value="127.0.0.1:5433" label="127.0.0.1:5433" />
              </div>
              <Badge variant={dbConnected ? 'green' : dbChecking ? 'amber' : 'red'}>
                {dbConnected ? 'CONNECTED' : dbChecking ? 'CHECKING' : 'DEGRADED'}
              </Badge>
            </SpotlightSurface>

            <SpotlightSurface accent="amber" padding="p-4" className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-xs text-zinc-400">FastAPI Control Plane</div>
                <div className="text-xs font-mono text-zinc-300 truncate">
                  8 core tables, bcrypt auth
                </div>
                <CopyChip value={API_BASE} label={API_BASE} />
              </div>
              <Badge variant="amber">v1.0.0</Badge>
            </SpotlightSurface>

            <SpotlightSurface accent="teal" padding="p-4" className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-xs text-zinc-400">DVWA Vulnerable Target</div>
                <div className="text-xs font-mono text-zinc-300 truncate">
                  MariaDB 10.4 internal :3306
                </div>
                <CopyChip value={DVWA_URL} label={DVWA_URL} />
              </div>
              <a
                href={DVWA_URL}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#00E5CC]/50 text-xs font-medium text-zinc-200 hover:text-[#00E5CC] inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                <LinkSimple className="w-3.5 h-3.5" weight="regular" />
                <span>Open</span>
              </a>
            </SpotlightSurface>
          </div>

          {loading ? (
            <SkeletonRows rows={8} columns={4} />
          ) : (
            <SpotlightSurface accent="amber">
              <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#F59E0B]" weight="regular" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Core PostgreSQL 8-Table Ledger
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums text-zinc-400">
                  8 tables tracked
                </span>
              </div>

              <div className="divide-y divide-white/[0.07]">
                {schemaLedger.map((row) => (
                  <div
                    key={row.table}
                    className="px-5 py-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="md:col-span-3 flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-semibold text-[#00E5CC] truncate">
                        {row.table}
                      </span>
                      <Badge variant={row.badgeVariant}>{row.domain}</Badge>
                    </div>

                    <div className="md:col-span-4 text-xs text-zinc-400 truncate">
                      {row.purpose}
                    </div>

                    <div className="md:col-span-4 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={['h-full rounded-full transition-all duration-300', row.barColor].join(' ')}
                          style={{ width: `${row.count > 0 ? Math.max(row.pct, 4) : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-1 text-left md:text-right">
                      <AnimatedTicker
                        value={row.count}
                        className="text-sm font-semibold text-zinc-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SpotlightSurface>
          )}
        </div>
      )}

      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}

      {activeTab === 'settings' && (
        <SettingsView user={user} onAccountDeleted={onSignOut} />
      )}

      {/* Slide-Over Inspector for Moderator Provision / Inspect / Edit / Delete */}
      <SlideOverInspector
        open={inspectorOpen}
        onClose={closeInspector}
        title={
          inspectorMode === 'create'
            ? 'Provision Moderator'
            : selectedModerator?.username || 'Moderator Inspector'
        }
        subtitle={
          inspectorMode === 'create'
            ? 'Create a new moderator operator with unique username and email.'
            : `Joined ${formatTimestamp(selectedModerator?.created_at)}`
        }
        badge={
          inspectorMode === 'inspect' && selectedModerator ? (
            <Badge variant="amber" className="font-mono tabular-nums">
              #{selectedModerator.moderator_id}
            </Badge>
          ) : null
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={closeInspector} disabled={submitting}>
              Cancel
            </Button>
            <button
              type="submit"
              form="cf-admin-inspector-form"
              disabled={submitting}
              className="h-9 px-3.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-[#07080B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>
                {submitting
                  ? 'Saving...'
                  : inspectorMode === 'create'
                    ? 'Create Moderator'
                    : 'Save Changes'}
              </span>
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {inspectorMode === 'inspect' && selectedModerator && (
            <div className="space-y-3 rounded-xl bg-[#07080B]/80 border border-white/[0.08] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400">Operator Email</span>
                <CopyChip value={selectedModerator.email} label={selectedModerator.email} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.07] text-center">
                <div>
                  <div className="text-[11px] text-zinc-500">Challenges</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-[#F59E0B] mt-0.5">
                    {selectedModerator.challenges_count ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Trainees</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-[#00E5CC] mt-0.5">
                    {selectedModerator.accounts_managed ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Admin Owner</div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-zinc-200 mt-0.5">
                    {selectedModerator.admin_id !== null && selectedModerator.admin_id !== undefined
                      ? `#${selectedModerator.admin_id}`
                      : 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form id="cf-admin-inspector-form" onSubmit={handleSaveModerator} className="space-y-4">
            {formError && (
              <AlertBanner
                variant="error"
                message={formError}
                onDismiss={() => setFormError('')}
              />
            )}

            <Field label="Username" htmlFor="cf-inspector-mod-username" required>
              <Input
                id="cf-inspector-mod-username"
                value={formState.username}
                onChange={(e) => setFormState((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="e.g. mod_secops"
                disabled={submitting}
                required
              />
            </Field>

            <Field label="Email address" htmlFor="cf-inspector-mod-email" required>
              <Input
                id="cf-inspector-mod-email"
                type="email"
                value={formState.email}
                onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="moderator@cyberforge.dev"
                disabled={submitting}
                required
              />
            </Field>

            <Field
              label={inspectorMode === 'inspect' ? 'Rotate password (optional)' : 'Password'}
              htmlFor="cf-inspector-mod-password"
              hint={
                inspectorMode === 'inspect'
                  ? 'Leave blank to keep the existing password (8-72 UTF-8 bytes if rotated).'
                  : '8 to 72 UTF-8 bytes, hashed with bcrypt.'
              }
              required={inspectorMode === 'create'}
            >
              <div className="relative">
                <Input
                  id="cf-inspector-mod-password"
                  type="password"
                  value={formState.password}
                  onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={
                    inspectorMode === 'inspect'
                      ? 'Leave blank to keep unchanged'
                      : 'Minimum 8 characters'
                  }
                  disabled={submitting}
                  required={inspectorMode === 'create'}
                  className="pr-9"
                />
                <Key
                  className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  weight="regular"
                />
              </div>
            </Field>
          </form>

          {inspectorMode === 'inspect' && selectedModerator && (
            <div className="pt-4 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[#EF4444]">
                <Warning className="w-4 h-4 shrink-0" weight="bold" />
                <span>Revoke Moderator Access</span>
              </div>

              {!confirmingDelete ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/25 p-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Removes only this moderator account; dependent challenges and trainees remain unlinked.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={submitting}
                    className="shrink-0"
                  >
                    <Trash className="w-3.5 h-3.5" weight="regular" />
                    <span>Remove</span>
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/35 p-3.5 space-y-3">
                  <p className="text-xs text-red-200 leading-relaxed">
                    Confirm permanent removal of{' '}
                    <span className="font-semibold text-white">{selectedModerator.username}</span>?
                    Dependent challenges, attackers, and defenders remain intact.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={submitting}
                    >
                      Keep Account
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={submitting}
                      onClick={handleConfirmDeleteModerator}
                    >
                      <Trash className="w-3.5 h-3.5" weight="bold" />
                      <span>Confirm Removal</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SlideOverInspector>

      <TactileToast toasts={toasts} onDismiss={dismissToast} />
    </CommandDeckShell>
  );
}
