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
  CopyChip,
  PaginationBar,
  SlideOverInspector,
  SpotlightSurface,
  TactileToast,
} from '../ui/spells';
import CommandDeckShell from './CommandDeckShell';
import { ProfileView, SettingsView } from './AccountViews';

const PAGE_SIZE = 8;

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
        color: '#B45309',
        dotClass: 'bg-[#B45309]',
      },
      {
        key: 'attackers',
        label: 'Attackers',
        count: attackersCount,
        color: '#C81E1E',
        dotClass: 'bg-[#C81E1E]',
      },
      {
        key: 'defenders',
        label: 'Defenders',
        count: defendersCount,
        color: '#047857',
        dotClass: 'bg-[#047857]',
      },
    ],
    [moderatorsCount, attackersCount, defendersCount]
  );

  const total = moderatorsCount + attackersCount + defendersCount;
  const widthTotal = 600;
  const barHeight = 16;

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
          width: Math.max(w, 6),
          pct: Math.round((seg.count / total) * 100),
        };
        cursor += w;
        return rect;
      });
  }, [segments, total]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-[13px] font-semibold text-[#4B5260]">
        <span>Operational Cohort Distribution</span>
        <span className="font-mono tabular-nums text-[#111317]">
          {total.toLocaleString()} active seats
        </span>
      </div>

      <div className="rounded-md bg-[#EAE4D7] border border-[#111317]/15 p-1.5">
        <svg
          viewBox={`0 0 ${widthTotal} ${barHeight}`}
          preserveAspectRatio="none"
          className="w-full h-4 rounded-sm overflow-hidden block"
          role="img"
          aria-label={`Cohort distribution: ${moderatorsCount} moderators, ${attackersCount} attackers, ${defendersCount} defenders`}
        >
          <rect x="0" y="0" width={widthTotal} height={barHeight} fill="#FAF8F3" rx="2" />
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
                opacity={dimmed ? 0.35 : 0.95}
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
                'inline-flex items-center gap-2 text-xs font-medium rounded px-2 py-1 border transition-colors',
                active
                  ? 'bg-[#EAE4D7] border-[#111317]/30 text-[#111317]'
                  : 'bg-[#F3EFE6] border-[#111317]/10 text-[#1C1F26]',
              ].join(' ')}
            >
              <span className={['w-2.5 h-2.5 rounded-sm shrink-0', seg.dotClass].join(' ')} />
              <span className="text-[#4B5260]">{seg.label}</span>
              <span className="font-mono tabular-nums font-bold text-[#111317]">{seg.count}</span>
              <span className="font-mono tabular-nums text-xs text-[#4B5260]">({pct}%)</span>
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
    <div className="cf-darkroom rounded-lg bg-[#0E1014] border border-[#111317]/25 p-3">
      <svg
        viewBox="0 0 420 198"
        className="w-full h-auto block"
        role="img"
        aria-label="CyberForge infrastructure topology linking Console 5173, FastAPI 8000, Postgres 5433, and DVWA 8081"
      >
        {/* Orthogonal Routing Bus */}
        <path d="M 118 99 L 164 99" stroke="#F59E0B" strokeWidth="1.75" fill="none" />
        <path
          d="M 274 86 L 302 86 L 302 50 L 320 50"
          stroke={pgColor}
          strokeWidth="1.75"
          strokeDasharray={dbConnected ? 'none' : '4 3'}
          fill="none"
        />
        <path d="M 274 112 L 302 112 L 302 148 L 320 148" stroke="#60A5FA" strokeWidth="1.75" fill="none" />

        {/* Junction Nodes */}
        <circle cx="141" cy="99" r="3" fill="#F59E0B" />
        <circle cx="302" cy="50" r="3" fill={pgColor} />
        <circle cx="302" cy="148" r="3" fill="#60A5FA" />

        {/* Node 1: Console :5173 */}
        <g>
          <rect
            x="8"
            y="68"
            width="110"
            height="62"
            rx="6"
            fill="#151820"
            stroke="rgba(245,158,11,0.55)"
            strokeWidth="1"
          />
          <circle cx="22" cy="86" r="3.5" fill="#F59E0B" />
          <text x="32" y="90" fill="#ECEFF4" fontSize="12" fontWeight="700">
            Console
          </text>
          <text x="22" y="112" fill="#CBD5E1" fontSize="12" fontFamily="JetBrains Mono, monospace">
            Vite :5173
          </text>
        </g>

        {/* Node 2: FastAPI :8000 */}
        <g>
          <rect
            x="164"
            y="62"
            width="110"
            height="74"
            rx="6"
            fill="#151820"
            stroke="rgba(236,239,244,0.28)"
            strokeWidth="1"
          />
          <circle cx="178" cy="82" r="3.5" fill="#10B981" />
          <text x="188" y="86" fill="#ECEFF4" fontSize="12" fontWeight="700">
            FastAPI
          </text>
          <text x="178" y="106" fill="#CBD5E1" fontSize="12" fontFamily="JetBrains Mono, monospace">
            API :8000
          </text>
          <text x="178" y="124" fill="#94A3B8" fontSize="12" fontFamily="JetBrains Mono, monospace">
            7-ring auth
          </text>
        </g>

        {/* Node 3: Postgres :5433 */}
        <g>
          <rect
            x="320"
            y="16"
            width="92"
            height="68"
            rx="6"
            fill="#151820"
            stroke={pgColor}
            strokeOpacity="0.65"
            strokeWidth="1"
          />
          <circle cx="332" cy="34" r="3.5" fill={pgColor} />
          <text x="341" y="38" fill="#ECEFF4" fontSize="12" fontWeight="700">
            Postgres
          </text>
          <text x="332" y="56" fill="#CBD5E1" fontSize="12" fontFamily="JetBrains Mono, monospace">
            db :5433
          </text>
          <text x="332" y="74" fill={pgColor} fontSize="12" fontFamily="JetBrains Mono, monospace">
            {pgLabel}
          </text>
        </g>

        {/* Node 4: DVWA :8081 */}
        <g>
          <rect
            x="320"
            y="114"
            width="92"
            height="68"
            rx="6"
            fill="#151820"
            stroke="rgba(96,165,250,0.55)"
            strokeWidth="1"
          />
          <circle cx="332" cy="132" r="3.5" fill="#60A5FA" />
          <text x="341" y="136" fill="#ECEFF4" fontSize="12" fontWeight="700">
            DVWA
          </text>
          <text x="332" y="154" fill="#CBD5E1" fontSize="12" fontFamily="JetBrains Mono, monospace">
            web :8081
          </text>
          <text x="332" y="172" fill="#94A3B8" fontSize="12" fontFamily="JetBrains Mono, monospace">
            isolated
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
  const [moderatorsPage, setModeratorsPage] = useState(1);

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

  const handleSearchChange = useCallback(
    (val) => {
      setSearchQuery(val);
      setModeratorsPage(1);
      if (val.trim() && activeTab !== 'moderators') {
        setActiveTab('moderators');
      }
    },
    [activeTab]
  );

  const handleSortChange = useCallback((nextSort) => {
    setSortBy(nextSort);
    setModeratorsPage(1);
  }, []);

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

  const moderatorsTotalPages = Math.max(1, Math.ceil(filteredAndSortedModerators.length / PAGE_SIZE));
  const safeModeratorsPage = Math.min(moderatorsPage, moderatorsTotalPages);
  const paginatedModerators = useMemo(() => {
    const start = (safeModeratorsPage - 1) * PAGE_SIZE;
    return filteredAndSortedModerators.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedModerators, safeModeratorsPage]);

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
      if (password.length < 10) {
        setFormError('Password must be at least 10 characters with a letter and number/symbol.');
        return;
      }
      if (utf8ByteLength(password) > 72) {
        setFormError('Password must be at most 72 UTF-8 bytes.');
        return;
      }
    } else if (password) {
      if (password.length < 10) {
        setFormError('New password must be at least 10 characters with a letter and number/symbol.');
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
      { id: 'overview', label: 'Overview', icon: Gauge },
      { id: 'moderators', label: 'Moderators', icon: UsersThree, badge: moderators.length },
      { id: 'infrastructure', label: 'Infrastructure', icon: Database },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [moderators.length]
  );

  const commandGroups = useMemo(() => {
    const viewItems = [
      ...navItems.map((item, idx) => ({
        id: `view-${item.id}`,
        label: item.label,
        hint: `Switch to ${item.label} view`,
        shortcut: String(idx + 1),
        icon: item.icon,
        onSelect: () => setActiveTab(item.id),
      })),
      {
        id: 'view-profile',
        label: 'Profile',
        hint: 'Inspect operator identity & password settings',
        icon: UserCircle,
        onSelect: () => setActiveTab('profile'),
      },
    ];

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
        accent: 'blue',
      },
      {
        label: 'Published Labs',
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
        barColor: 'bg-[#B45309]',
        badgeVariant: 'amber',
        count: stats?.admins_count ?? 0,
        purpose: 'Top-level root governance administrators',
      },
      {
        table: 'moderator',
        domain: 'Governance',
        barColor: 'bg-[#B45309]',
        badgeVariant: 'amber',
        count: stats?.moderators_count ?? 0,
        purpose: 'Challenge authoring and trainee oversight operators',
      },
      {
        table: 'attacker',
        domain: 'Red Team',
        barColor: 'bg-[#C81E1E]',
        badgeVariant: 'red',
        count: stats?.attackers_count ?? 0,
        purpose: 'Offensive security trainee accounts',
      },
      {
        table: 'defender',
        domain: 'Blue Team',
        barColor: 'bg-[#1D4ED8]',
        badgeVariant: 'blue',
        count: stats?.defenders_count ?? 0,
        purpose: 'Defensive remediation trainee accounts',
      },
      {
        table: 'challenges',
        domain: 'Training',
        barColor: 'bg-[#047857]',
        badgeVariant: 'green',
        count: stats?.challenges_count ?? 0,
        purpose: 'Published DVWA vulnerability scenarios',
      },
      {
        table: 'attempts',
        domain: 'Telemetry',
        barColor: 'bg-[#C81E1E]',
        badgeVariant: 'red',
        count: stats?.total_attempts ?? 0,
        purpose: 'Recorded attacker exploit payload submissions',
      },
      {
        table: 'defenses',
        domain: 'Telemetry',
        barColor: 'bg-[#047857]',
        badgeVariant: 'green',
        count: stats?.total_defenses ?? 0,
        purpose: 'Verified defender security-level remediations',
      },
      {
        table: 'alerts',
        domain: 'Telemetry',
        barColor: 'bg-[#B45309]',
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
      className="hidden sm:inline-flex h-9 w-9 rounded-md bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/20 items-center justify-center text-[#111317] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
    >
      <ArrowsClockwise
        className={['w-4 h-4', refreshing ? 'animate-spin text-[#B45309]' : ''].join(' ')}
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
      onSearchChange={activeTab === 'moderators' ? handleSearchChange : undefined}
      searchPlaceholder="Filter moderators..."
      commandGroups={commandGroups}
      headerActions={headerActions}
      onSignOut={onSignOut}
    >
      {error && (
        <AlertBanner
          variant="error"
          message={error}
          onDismiss={() => setError('')}
          className="mb-3 shrink-0"
        />
      )}

      {/* 1. OVERVIEW (SINGLE-FRAME GOVERNANCE SHEET) */}
      {activeTab === 'overview' && (
        <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#111317] tracking-tight leading-tight">
                Root Governance Control Plane
              </h1>
              <p className="text-[14px] text-[#4B5260] mt-0.5">
                Oversee CyberForge identity distribution, delegate moderator authority, and monitor live DVWA infrastructure.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" loading={refreshing} onClick={() => loadData({ notify: true })}>
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                <span>Refresh</span>
              </Button>
              <Button variant="primary" size="sm" onClick={openProvisionInspector}>
                <Plus className="w-4 h-4" weight="bold" />
                <span>Provision Moderator</span>
              </Button>
            </div>
          </div>

          {/* 4 Crisp KPI Figures */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            <SpotlightSurface accent="brass" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Total Identities</span>
                <UsersThree className="w-4 h-4 text-[#B45309]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#111317] leading-none mt-1">
                <AnimatedTicker value={totalIdentities} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1 font-mono tabular-nums">
                {stats?.admins_count ?? 0} root · {stats?.moderators_count ?? moderators.length} moderators
              </div>
            </SpotlightSurface>

            <SpotlightSurface accent="crimson" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Red Team Seats</span>
                <ShieldCheck className="w-4 h-4 text-[#C81E1E]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#C81E1E] leading-none mt-1">
                <AnimatedTicker value={stats?.attackers_count ?? 0} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1 font-mono tabular-nums">
                {stats?.total_attempts ?? 0} exploit attempts
              </div>
            </SpotlightSurface>

            <SpotlightSurface accent="emerald" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Blue Team Seats</span>
                <ShieldCheck className="w-4 h-4 text-[#047857]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#047857] leading-none mt-1">
                <AnimatedTicker value={stats?.defenders_count ?? 0} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1 font-mono tabular-nums">
                {stats?.total_defenses ?? 0} defense checks
              </div>
            </SpotlightSurface>

            <SpotlightSurface accent="cobalt" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Published Labs</span>
                <ChartBar className="w-4 h-4 text-[#1D4ED8]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#1D4ED8] leading-none mt-1">
                <AnimatedTicker value={stats?.challenges_count ?? 0} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1 font-mono tabular-nums">
                {totalActivity} recorded events
              </div>
            </SpotlightSurface>
          </div>

          {/* 12-Col Governance Split */}
          <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <SpotlightSurface
              accent="brass"
              padding="p-4"
              className="lg:col-span-7 flex flex-col lg:min-h-0 justify-between gap-3"
            >
              <IdentityDistributionBar
                moderatorsCount={stats?.moderators_count ?? moderators.length}
                attackersCount={stats?.attackers_count ?? 0}
                defendersCount={stats?.defenders_count ?? 0}
              />

              <div className="pt-2 border-t border-[#111317]/15 flex-1 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#111317]">Moderator Oversight</h2>
                    <Badge variant="amber" className="font-mono tabular-nums">
                      {moderators.length} active
                    </Badge>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('moderators')}>
                    <UsersThree className="w-4 h-4" weight="regular" />
                    <span>Full Directory</span>
                  </Button>
                </div>

                {loading ? (
                  <SkeletonRows rows={3} columns={3} />
                ) : oversightModerators.length === 0 ? (
                  <EmptyState
                    icon={UsersThree}
                    title="No moderators provisioned"
                    description="Provision a moderator account to delegate challenge authoring and trainee oversight."
                    action={
                      <Button variant="primary" size="sm" onClick={openProvisionInspector}>
                        <Plus className="w-4 h-4" weight="bold" />
                        <span>Provision Moderator</span>
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {oversightModerators.map((mod) => {
                      const chCount = mod.challenges_count || 0;
                      const trCount = mod.accounts_managed || 0;
                      const challengePct = Math.round((chCount / maxWorkload) * 100);
                      const traineePct = Math.round((trCount / maxWorkload) * 100);

                      return (
                        <button
                          key={mod.moderator_id}
                          type="button"
                          onClick={() => openModeratorInspector(mod)}
                          className="text-left rounded-md bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/15 hover:border-[#111317]/35 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded bg-[#B45309]/12 border border-[#B45309]/35 flex items-center justify-center text-xs font-mono font-bold text-[#92400E] shrink-0">
                                {getInitials(mod.username)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[14px] font-bold text-[#111317] truncate">
                                  {mod.username}
                                </div>
                                <div className="text-xs text-[#4B5260] truncate">{mod.email}</div>
                              </div>
                            </div>
                            <span className="text-xs font-mono tabular-nums text-[#4B5260] shrink-0">
                              #{mod.moderator_id}
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-1">
                            <div className="h-1.5 w-full rounded-full bg-[#111317]/10 overflow-hidden flex">
                              {chCount > 0 && (
                                <div
                                  className="h-full bg-[#B45309]"
                                  style={{ width: `${Math.max(challengePct, 5)}%` }}
                                />
                              )}
                              {trCount > 0 && (
                                <div
                                  className="h-full bg-[#1D4ED8]"
                                  style={{ width: `${Math.max(traineePct, 5)}%` }}
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#4B5260]">
                              <span>{chCount} labs</span>
                              <span>{trCount} trainees</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </SpotlightSurface>

            <SpotlightSurface
              accent="cobalt"
              padding="p-4"
              className="lg:col-span-5 flex flex-col lg:min-h-0 justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#111317]">Live System Topology</h2>
                  <p className="text-xs text-[#4B5260] mt-0.5">
                    Split Docker planes and Postgres heartbeat
                  </p>
                </div>
                <Badge variant={dbConnected ? 'green' : dbChecking ? 'amber' : 'red'}>
                  {dbConnected ? 'CONNECTED' : dbChecking ? 'CHECKING' : 'DEGRADED'}
                </Badge>
              </div>

              <InfrastructureTopologySvg dbConnected={dbConnected} dbChecking={dbChecking} />

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-[#4B5260] shrink-0">FastAPI :8000</span>
                  <CopyChip value={API_BASE} label={API_BASE} />
                </div>
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-[#4B5260] shrink-0">PostgreSQL :5433</span>
                  <CopyChip value="127.0.0.1:5433" label="127.0.0.1:5433" />
                </div>
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-[#4B5260] shrink-0">DVWA Target :8081</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CopyChip value={DVWA_URL} label={DVWA_URL} />
                    <a
                      href={DVWA_URL}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open DVWA target in new tab"
                      className="h-7 w-7 rounded bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/20 inline-flex items-center justify-center text-[#111317] transition-colors shrink-0"
                    >
                      <ArrowSquareOut className="w-3.5 h-3.5" weight="regular" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#111317]/15 flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-[#4B5260]">
                  8 frozen PostgreSQL tables
                </span>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('infrastructure')}>
                  <Database className="w-4 h-4" weight="regular" />
                  <span>Open Infrastructure</span>
                </Button>
              </div>
            </SpotlightSurface>
          </div>
        </div>
      )}

      {/* 2. MODERATORS DIRECTORY (PAGINATED 8/PAGE) */}
      {activeTab === 'moderators' && (
        <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#111317] tracking-tight leading-tight">
                Moderators Directory
              </h1>
              <p className="text-[14px] text-[#4B5260] mt-0.5">
                Showing {filteredAndSortedModerators.length} of {moderators.length} provisioned moderator operators.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                role="group"
                aria-label="Sort moderators"
                className="inline-flex items-center rounded-md bg-[#FAF8F3] border border-[#111317]/20 p-0.5 gap-0.5"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#4B5260] mx-1.5" weight="regular" />
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSortChange(opt.id)}
                      className={[
                        'px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap',
                        active
                          ? 'bg-[#111317] text-[#FAF8F3]'
                          : 'text-[#4B5260] hover:text-[#111317]',
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
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                <span>Refresh</span>
              </Button>

              <Button variant="primary" size="sm" onClick={openProvisionInspector}>
                <Plus className="w-4 h-4" weight="bold" />
                <span>Provision Moderator</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 lg:min-h-0 flex flex-col justify-between gap-2.5">
            {loading ? (
              <SkeletonRows rows={6} columns={5} />
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
                    <Button variant="secondary" size="sm" onClick={() => handleSearchChange('')}>
                      Clear Search
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={openProvisionInspector}>
                      <Plus className="w-4 h-4" weight="bold" />
                      <span>Provision Moderator</span>
                    </Button>
                  )
                }
              />
            ) : (
              <div className="bg-[#FAF8F3] border border-[#111317]/15 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#111317]/15 bg-[#EAE4D7]/55 text-xs font-bold text-[#4B5260]">
                      <th className="py-2.5 px-4">Moderator</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Owner</th>
                      <th className="py-2.5 px-4">Workload Split</th>
                      <th className="py-2.5 px-4">Joined</th>
                      <th className="py-2.5 px-4 text-right">Inspector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111317]/10 text-[14px]">
                    {paginatedModerators.map((mod) => {
                      const chCount = mod.challenges_count || 0;
                      const trCount = mod.accounts_managed || 0;
                      const challengePct = Math.round((chCount / maxWorkload) * 100);
                      const traineePct = Math.round((trCount / maxWorkload) * 100);

                      return (
                        <tr key={mod.moderator_id} className="hover:bg-[#EAE4D7]/45 transition-colors">
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded bg-[#B45309]/12 border border-[#B45309]/35 flex items-center justify-center text-xs font-mono font-bold text-[#92400E] shrink-0">
                                {getInitials(mod.username)}
                              </div>
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="font-bold text-[#111317] truncate">
                                  {mod.username}
                                </span>
                                <span className="text-xs font-mono tabular-nums text-[#4B5260]">
                                  #{mod.moderator_id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-4">
                            <CopyChip value={mod.email} label={mod.email} />
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap">
                            {mod.admin_id !== null && mod.admin_id !== undefined ? (
                              <Badge variant="neutral" className="font-mono tabular-nums">
                                Admin #{mod.admin_id}
                              </Badge>
                            ) : (
                              <span className="text-xs text-[#4B5260]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-2 px-4 w-52">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#4B5260]">
                                <span>{chCount} labs</span>
                                <span>{trCount} trainees</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-[#111317]/10 overflow-hidden flex">
                                {chCount > 0 && (
                                  <div
                                    className="h-full bg-[#B45309]"
                                    style={{ width: `${Math.max(challengePct, 5)}%` }}
                                  />
                                )}
                                {trCount > 0 && (
                                  <div
                                    className="h-full bg-[#1D4ED8]"
                                    style={{ width: `${Math.max(traineePct, 5)}%` }}
                                  />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-4 font-mono tabular-nums text-xs text-[#4B5260] whitespace-nowrap">
                            {formatShortDate(mod.created_at)}
                          </td>
                          <td className="py-2 px-4 text-right whitespace-nowrap">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openModeratorInspector(mod)}
                              aria-label={`Inspect ${mod.username}`}
                            >
                              <TerminalWindow className="w-3.5 h-3.5 text-[#B45309]" weight="regular" />
                              <span>Inspect</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredAndSortedModerators.length > 0 && (
              <PaginationBar
                page={safeModeratorsPage}
                totalPages={moderatorsTotalPages}
                totalItems={filteredAndSortedModerators.length}
                pageSize={PAGE_SIZE}
                onPageChange={setModeratorsPage}
                itemLabel="moderators"
              />
            )}
          </div>
        </div>
      )}

      {/* 3. INFRASTRUCTURE (POSTGRES :5433, FASTAPI :8000, DVWA :8081 + DARKROOM ENDPOINT SHEET) */}
      {activeTab === 'infrastructure' && (
        <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#111317] tracking-tight leading-tight">
                Infrastructure &amp; Schema Ledger
              </h1>
              <p className="text-[14px] text-[#4B5260] mt-0.5">
                Live telemetry across PostgreSQL :5433, FastAPI :8000, DVWA :8081, and the 8 frozen relational tables.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {lastSyncedAt && (
                <span className="hidden md:inline text-xs font-mono tabular-nums text-[#4B5260]">
                  Synced {formatTimestamp(lastSyncedAt)}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                loading={refreshing}
                onClick={() => loadData({ notify: true })}
              >
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                <span>Refresh Ledger</span>
              </Button>
            </div>
          </div>

          {/* 3 Service Telemetry Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
            <SpotlightSurface accent="emerald" padding="p-3.5" className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-bold text-[#4B5260]">PostgreSQL :5433 (/health/db)</div>
                <div className="text-[15px] font-bold font-mono text-[#111317] truncate">
                  {dbHealth?.database || 'unknown'} · app_internal
                </div>
                <CopyChip value="127.0.0.1:5433" label="127.0.0.1:5433" />
              </div>
              <Badge variant={dbConnected ? 'green' : dbChecking ? 'amber' : 'red'}>
                {dbConnected ? 'CONNECTED' : dbChecking ? 'CHECKING' : 'DEGRADED'}
              </Badge>
            </SpotlightSurface>

            <SpotlightSurface accent="brass" padding="p-3.5" className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-bold text-[#4B5260]">FastAPI :8000</div>
                <div className="text-[15px] font-bold font-mono text-[#111317] truncate">
                  8 core tables · 7 security rings
                </div>
                <CopyChip value={API_BASE} label={API_BASE} />
              </div>
              <Badge variant="amber">ACTIVE</Badge>
            </SpotlightSurface>

            <SpotlightSurface accent="cobalt" padding="p-3.5" className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-bold text-[#4B5260]">DVWA :8081</div>
                <div className="text-[15px] font-bold font-mono text-[#111317] truncate">
                  MariaDB 10.4 · range_isolated
                </div>
                <CopyChip value={DVWA_URL} label={DVWA_URL} />
              </div>
              <a
                href={DVWA_URL}
                target="_blank"
                rel="noreferrer"
                className="h-9 px-3 rounded-md border border-[#111317]/20 bg-[#F3EFE6] hover:bg-[#EAE4D7] text-xs font-semibold text-[#111317] inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                <LinkSimple className="w-3.5 h-3.5" weight="regular" />
                <span>Open</span>
              </a>
            </SpotlightSurface>
          </div>

          {/* 8-Table Ledger + Embedded Darkroom Endpoint Sheet */}
          <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 flex flex-col lg:min-h-0">
              {loading ? (
                <SkeletonRows rows={8} columns={4} />
              ) : (
                <SpotlightSurface accent="brass" className="flex-1 flex flex-col justify-between">
                  <div className="px-4 py-2.5 border-b border-[#111317]/15 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#B45309]" weight="bold" />
                      <h2 className="text-base font-bold text-[#111317]">
                        Core PostgreSQL 8-Table Ledger
                      </h2>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-[#4B5260]">
                      8 frozen tables
                    </span>
                  </div>

                  <div className="divide-y divide-[#111317]/10 flex-1 flex flex-col justify-between">
                    {schemaLedger.map((row) => (
                      <div
                        key={row.table}
                        className="px-4 py-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-center hover:bg-[#EAE4D7]/45 transition-colors"
                      >
                        <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[13px] font-bold text-[#111317] truncate">
                            {row.table}
                          </span>
                          <Badge variant={row.badgeVariant}>{row.domain}</Badge>
                        </div>

                        <div className="md:col-span-4 text-xs text-[#4B5260] truncate">
                          {row.purpose}
                        </div>

                        <div className="md:col-span-3 flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-[#EAE4D7] overflow-hidden">
                            <div
                              className={['h-full rounded-full transition-all duration-300', row.barColor].join(' ')}
                              style={{ width: `${row.count > 0 ? Math.max(row.pct, 6) : 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-1 text-left md:text-right">
                          <AnimatedTicker
                            value={row.count}
                            className="text-[14px] font-bold text-[#111317]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SpotlightSurface>
              )}
            </div>

            <div className="cf-darkroom lg:col-span-5 rounded-lg bg-[#0E1014] text-[#ECEFF4] border border-[#111317]/25 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/15">
                  <div className="flex items-center gap-2">
                    <TerminalWindow className="w-4 h-4 text-[#F59E0B]" weight="bold" />
                    <h2 className="text-base font-bold text-[#ECEFF4]">Darkroom Endpoint Sheet</h2>
                  </div>
                  <span className="text-xs font-mono text-[#94A3B8]">docker-compose</span>
                </div>

                <div className="space-y-2 font-mono text-[13px]">
                  <div className="p-2.5 rounded bg-[#161922] border border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[#94A3B8]">API Plane</span>
                    <span className="text-[#ECEFF4] truncate">{API_BASE}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#161922] border border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[#94A3B8]">Postgres Host</span>
                    <span className="text-[#34D399]">127.0.0.1:5433 (app_internal)</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#161922] border border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[#94A3B8]">DVWA Target</span>
                    <span className="text-[#60A5FA]">127.0.0.1:8081 (range_isolated)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-semibold text-[#94A3B8]">
                    Control &amp; Health Probes
                  </div>
                  <pre className="p-3 rounded bg-[#07080B] border border-white/10 font-mono text-xs text-[#CBD5E1] leading-relaxed overflow-x-auto">
{`GET  ${API_BASE}/health/db
GET  ${API_BASE}/health/dvwa
GET  ${API_BASE}/api/admin/stats
GET  ${API_BASE}/api/moderators
POST ${API_BASE}/api/auth/refresh`}
                  </pre>
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2 text-xs font-mono text-[#94A3B8]">
                <span>no-new-privileges · pids_limit=128</span>
                <span className="text-[#34D399]">ISOLATED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PROFILE & SETTINGS */}
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
            <Button
              type="submit"
              form="cf-admin-inspector-form"
              variant="primary"
              loading={submitting}
            >
              {inspectorMode === 'create' ? 'Create Moderator' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {inspectorMode === 'inspect' && selectedModerator && (
            <div className="space-y-3 rounded-lg bg-[#F3EFE6] border border-[#111317]/15 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#4B5260]">Operator Email</span>
                <CopyChip value={selectedModerator.email} label={selectedModerator.email} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#111317]/15 text-center">
                <div>
                  <div className="text-xs font-semibold text-[#4B5260]">Challenges</div>
                  <div className="font-display text-2xl font-extrabold tabular-nums text-[#B45309] mt-0.5">
                    {selectedModerator.challenges_count ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#4B5260]">Trainees</div>
                  <div className="font-display text-2xl font-extrabold tabular-nums text-[#1D4ED8] mt-0.5">
                    {selectedModerator.accounts_managed ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#4B5260]">Admin Owner</div>
                  <div className="font-display text-2xl font-extrabold tabular-nums text-[#111317] mt-0.5">
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
                  ? 'Leave blank to keep the existing password (10–72 UTF-8 bytes if rotated).'
                  : '10 to 72 UTF-8 bytes with a letter and number/symbol, hashed with bcrypt.'
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
                      : 'Minimum 10 characters'
                  }
                  disabled={submitting}
                  required={inspectorMode === 'create'}
                  className="pr-9"
                />
                <Key
                  className="w-4 h-4 text-[#4B5260] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  weight="regular"
                />
              </div>
            </Field>
          </form>

          {inspectorMode === 'inspect' && selectedModerator && (
            <div className="pt-4 border-t border-[#111317]/15 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C81E1E]">
                <Warning className="w-4 h-4 shrink-0" weight="bold" />
                <span>Revoke Moderator Access</span>
              </div>

              {!confirmingDelete ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-[#C81E1E]/[0.06] border border-[#C81E1E]/30 p-3">
                  <p className="text-[13px] text-[#1C1F26] leading-relaxed">
                    Removes only this moderator account; dependent challenges and trainees remain unlinked.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={submitting}
                    className="shrink-0"
                  >
                    <Trash className="w-4 h-4" weight="regular" />
                    <span>Remove</span>
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg bg-[#C81E1E]/[0.08] border border-[#C81E1E]/40 p-3.5 space-y-3">
                  <p className="text-[13px] text-[#1C1F26] leading-relaxed">
                    Confirm permanent removal of{' '}
                    <span className="font-bold text-[#111317]">{selectedModerator.username}</span>?
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
                      <Trash className="w-4 h-4" weight="bold" />
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
