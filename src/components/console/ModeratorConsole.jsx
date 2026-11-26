import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowsClockwise,
  Bell,
  DownloadSimple,
  Gear,
  Lightning,
  PencilSimple,
  Plus,
  Pulse,
  Rows,
  ShieldCheck,
  SquaresFour,
  Sword,
  Target,
  Trash,
  UserCircle,
  Warning,
} from '@phosphor-icons/react';
import { apiFetch, exportActivityCsvUrl } from '../../utils/api';
import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  SkeletonRows,
  Textarea,
} from '../ui/primitives';
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

const EMPTY_CHALLENGE_FORM = {
  title: '',
  vulnerability_type: '',
  difficulty: 'Medium',
  dvwa_page_ref: '',
  reference_payload: '',
};

const EMPTY_ACCOUNT_FORM = {
  username: '',
  email: '',
  password: '',
};

const DIFFICULTY_META = {
  easy: { variant: 'green', points: 50 },
  medium: { variant: 'amber', points: 100 },
  hard: { variant: 'red', points: 250 },
};

const EVENT_TYPE_FILTERS = [
  { id: 'all', label: 'All Signals' },
  { id: 'alert', label: 'Alerts' },
  { id: 'attempt', label: 'Attempts' },
  { id: 'defense', label: 'Defenses' },
];

const TEAM_CONFIG = {
  attacker: {
    endpoint: '/api/attackers',
    idKey: 'attacker_id',
    countKey: 'attempts_count',
    countLabel: 'Attempts',
    singular: 'Attacker',
    plural: 'Red Team',
    accent: 'rose',
    accentHex: '#F43F5E',
    barClass: 'bg-[#F43F5E]',
    badgeVariant: 'red',
    placeholderEmail: 'attacker@cyberforge.dev',
    placeholderUser: 'red_operator_01',
    icon: Sword,
    heading: 'Red Team Operators',
    subtitle: 'Manage offensive trainee accounts, exploit attempt volume, and cumulative scores.',
    emptyTitle: 'No Red Team operators found',
    emptyDescription: 'Provision an attacker account to assign offensive DVWA scenarios.',
    deleteNotice: 'Removing this attacker permanently deletes all recorded exploit attempts by this operator.',
  },
  defender: {
    endpoint: '/api/defenders',
    idKey: 'defender_id',
    countKey: 'defenses_count',
    countLabel: 'Defenses',
    singular: 'Defender',
    plural: 'Blue Team',
    accent: 'sky',
    accentHex: '#38BDF8',
    barClass: 'bg-[#38BDF8]',
    badgeVariant: 'teal',
    placeholderEmail: 'defender@cyberforge.dev',
    placeholderUser: 'blue_guardian_01',
    icon: ShieldCheck,
    heading: 'Blue Team Guardians',
    subtitle: 'Manage defensive trainee accounts, verification volume, and remediation scores.',
    emptyTitle: 'No Blue Team operators found',
    emptyDescription: 'Provision a defender account to assign defensive DVWA hardening labs.',
    deleteNotice: 'Removing this defender permanently deletes all recorded defense verifications by this operator.',
  },
};

function formatUtcTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function getInitials(name) {
  const clean = (name || 'OP').trim();
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function utf8ByteLength(str) {
  return new TextEncoder().encode(str).length;
}

function getKindMeta(kind) {
  if (kind === 'alert') {
    return { label: 'Alert', variant: 'amber', color: '#F59E0B' };
  }
  if (kind === 'attempt') {
    return { label: 'Attempt', variant: 'red', color: '#F43F5E' };
  }
  if (kind === 'defense') {
    return { label: 'Defense', variant: 'teal', color: '#38BDF8' };
  }
  return { label: kind || 'Event', variant: 'neutral', color: '#71717A' };
}

function getStatusVariant(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'verified' || normalized === 'defense_applied') {
    return 'green';
  }
  if (normalized === 'failed' || normalized === 'exploit_attempt') {
    return 'red';
  }
  if (normalized === 'unverified') {
    return 'amber';
  }
  return 'neutral';
}

export default function ModeratorConsole({ user, onSignOut, onOpenOverview }) {
  const [activeTab, setActiveTab] = useState('triage');
  const [searchQuery, setSearchQuery] = useState('');

  const [challenges, setChallenges] = useState([]);
  const [attackers, setAttackers] = useState([]);
  const [defenders, setDefenders] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [loadingCore, setLoadingCore] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [coreError, setCoreError] = useState('');

  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [challengeFilter, setChallengeFilter] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [autoPoll, setAutoPoll] = useState(false);

  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [arsenalView, setArsenalView] = useState('grid'); // 'grid' | 'table'

  // Slide-over Inspector for Challenges
  const [challengeInspector, setChallengeInspector] = useState({
    open: false,
    mode: 'create', // 'create' | 'edit'
    record: null,
  });
  const [challengeForm, setChallengeForm] = useState(EMPTY_CHALLENGE_FORM);
  const [challengeError, setChallengeError] = useState('');
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [confirmDeleteChallenge, setConfirmDeleteChallenge] = useState(false);

  // Slide-over Inspector for Red / Blue Team Operators
  const [operatorInspector, setOperatorInspector] = useState({
    open: false,
    mode: 'create', // 'create' | 'edit'
    role: 'attacker', // 'attacker' | 'defender'
    record: null,
  });
  const [operatorForm, setOperatorForm] = useState(EMPTY_ACCOUNT_FORM);
  const [operatorError, setOperatorError] = useState('');
  const [savingOperator, setSavingOperator] = useState(false);
  const [confirmDeleteOperator, setConfirmDeleteOperator] = useState(false);

  // Tactile Toasts
  const [toasts, setToasts] = useState([]);
  const toastCounterRef = useRef(0);

  const pushToast = useCallback((variant, title, message) => {
    toastCounterRef.current += 1;
    const id = `mod-toast-${toastCounterRef.current}`;
    setToasts((prev) => [...prev.slice(-3), { id, variant, title, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const fetchCoreData = useCallback(async () => {
    const [chRes, attRes, defRes, statsRes] = await Promise.all([
      apiFetch('/api/challenges'),
      apiFetch('/api/attackers'),
      apiFetch('/api/defenders'),
      apiFetch('/api/admin/stats').catch(() => null),
    ]);
    return {
      challenges: Array.isArray(chRes) ? chRes : [],
      attackers: Array.isArray(attRes) ? attRes : [],
      defenders: Array.isArray(defRes) ? defRes : [],
      stats: statsRes,
    };
  }, []);

  const buildActivityPath = useCallback(() => {
    const params = new URLSearchParams();
    params.set('event_type', eventTypeFilter || 'all');
    params.set('limit', '100');
    if (challengeFilter) {
      params.set('challenge_id', challengeFilter);
    }
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }
    return `/api/activity?${params.toString()}`;
  }, [eventTypeFilter, challengeFilter, searchQuery]);

  const syncAll = useCallback(
    async ({ notify = false } = {}) => {
      setSyncing(true);
      try {
        const [core, activityItems] = await Promise.all([
          fetchCoreData(),
          apiFetch(buildActivityPath()),
        ]);
        setChallenges(core.challenges);
        setAttackers(core.attackers);
        setDefenders(core.defenders);
        setPlatformStats(core.stats);
        setActivity(Array.isArray(activityItems) ? activityItems : []);
        setCoreError('');
        setActivityError('');
        if (notify) {
          pushToast('info', 'Telemetry Synced', 'Live activity stream and range rosters refreshed.');
        }
      } catch (err) {
        const msg = err.message || 'Unable to synchronize range operations data.';
        setCoreError(msg);
        if (notify) {
          pushToast('error', 'Sync Failed', msg);
        }
      } finally {
        setLoadingCore(false);
        setLoadingActivity(false);
        setSyncing(false);
      }
    },
    [fetchCoreData, buildActivityPath, pushToast]
  );

  useEffect(() => {
    let cancelled = false;
    async function initCore() {
      try {
        const core = await fetchCoreData();
        if (cancelled) return;
        setChallenges(core.challenges);
        setAttackers(core.attackers);
        setDefenders(core.defenders);
        setPlatformStats(core.stats);
        setCoreError('');
      } catch (err) {
        if (!cancelled) {
          setCoreError(err.message || 'Failed to load range operations workspace.');
        }
      } finally {
        if (!cancelled) {
          setLoadingCore(false);
        }
      }
    }
    initCore();
    return () => {
      cancelled = true;
    };
  }, [fetchCoreData]);

  useEffect(() => {
    const controller = new AbortController();
    async function syncActivityStream() {
      try {
        const items = await apiFetch(buildActivityPath(), { signal: controller.signal });
        if (controller.signal.aborted) return;
        setActivity(Array.isArray(items) ? items : []);
        setActivityError('');
      } catch (err) {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        setActivityError(err.message || 'Failed to load live activity stream.');
      } finally {
        if (!controller.signal.aborted) {
          setLoadingActivity(false);
        }
      }
    }
    syncActivityStream();
    return () => controller.abort();
  }, [buildActivityPath]);

  useEffect(() => {
    if (!autoPoll) return undefined;
    const timer = window.setInterval(() => {
      syncAll();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [autoPoll, syncAll]);

  // Derived Telemetry Totals
  const signalTotals = useMemo(() => {
    const alerts = platformStats?.total_alerts ?? activity.filter((i) => i.kind === 'alert').length;
    const attempts =
      platformStats?.total_attempts ??
      attackers.reduce((sum, item) => sum + (item.attempts_count || 0), 0);
    const defenses =
      platformStats?.total_defenses ??
      defenders.reduce((sum, item) => sum + (item.defenses_count || 0), 0);
    const total = alerts + attempts + defenses;
    return { alerts, attempts, defenses, total };
  }, [platformStats, activity, attackers, defenders]);

  const selectedEvent = useMemo(() => {
    if (activity.length === 0) return null;
    return activity.find((item) => item.id === selectedEventId) || activity[0];
  }, [activity, selectedEventId]);

  const filteredChallenges = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return challenges.filter((ch) => {
      if (difficultyFilter !== 'all' && ch.difficulty?.toLowerCase() !== difficultyFilter) {
        return false;
      }
      if (!term) return true;
      return (
        ch.title?.toLowerCase().includes(term) ||
        ch.vulnerability_type?.toLowerCase().includes(term) ||
        ch.dvwa_page_ref?.toLowerCase().includes(term) ||
        String(ch.challenge_id).includes(term)
      );
    });
  }, [challenges, difficultyFilter, searchQuery]);

  const filteredAttackers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return attackers;
    return attackers.filter(
      (a) =>
        a.username?.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        String(a.attacker_id).includes(term)
    );
  }, [attackers, searchQuery]);

  const filteredDefenders = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return defenders;
    return defenders.filter(
      (d) =>
        d.username?.toLowerCase().includes(term) ||
        d.email?.toLowerCase().includes(term) ||
        String(d.defender_id).includes(term)
    );
  }, [defenders, searchQuery]);

  // --- Inspector Openers ---

  const openCreateChallenge = useCallback(() => {
    setChallengeForm(EMPTY_CHALLENGE_FORM);
    setChallengeError('');
    setConfirmDeleteChallenge(false);
    setChallengeInspector({ open: true, mode: 'create', record: null });
  }, []);

  const openEditChallenge = useCallback((ch) => {
    setChallengeForm({
      title: ch.title || '',
      vulnerability_type: ch.vulnerability_type || '',
      difficulty: ch.difficulty || 'Medium',
      dvwa_page_ref: ch.dvwa_page_ref || '',
      reference_payload: ch.reference_payload || '',
    });
    setChallengeError('');
    setConfirmDeleteChallenge(false);
    setChallengeInspector({ open: true, mode: 'edit', record: ch });
  }, []);

  const closeChallengeInspector = useCallback(() => {
    if (savingChallenge) return;
    setChallengeInspector((prev) => ({ ...prev, open: false }));
    setChallengeError('');
    setConfirmDeleteChallenge(false);
  }, [savingChallenge]);

  const openCreateOperator = useCallback((role) => {
    setOperatorForm(EMPTY_ACCOUNT_FORM);
    setOperatorError('');
    setConfirmDeleteOperator(false);
    setOperatorInspector({ open: true, mode: 'create', role, record: null });
  }, []);

  const openEditOperator = useCallback((role, record) => {
    setOperatorForm({
      username: record.username || '',
      email: record.email || '',
      password: '',
    });
    setOperatorError('');
    setConfirmDeleteOperator(false);
    setOperatorInspector({ open: true, mode: 'edit', role, record });
  }, []);

  const closeOperatorInspector = useCallback(() => {
    if (savingOperator) return;
    setOperatorInspector((prev) => ({ ...prev, open: false }));
    setOperatorError('');
    setConfirmDeleteOperator(false);
  }, [savingOperator]);

  // --- Challenge CRUD ---

  async function handleSaveChallenge(event) {
    event.preventDefault();
    setChallengeError('');

    const payload = {
      title: challengeForm.title.trim(),
      vulnerability_type: challengeForm.vulnerability_type.trim(),
      difficulty: challengeForm.difficulty.trim(),
      dvwa_page_ref: challengeForm.dvwa_page_ref.trim(),
      reference_payload: challengeForm.reference_payload.trim(),
    };

    if (
      !payload.title ||
      !payload.vulnerability_type ||
      !payload.difficulty ||
      !payload.dvwa_page_ref ||
      !payload.reference_payload
    ) {
      setChallengeError('All challenge fields are required.');
      return;
    }

    setSavingChallenge(true);
    try {
      if (challengeInspector.mode === 'create') {
        await apiFetch('/api/challenges', {
          method: 'POST',
          body: {
            ...payload,
            ...(user?.role === 'moderator' && user?.id ? { moderator_id: user.id } : {}),
          },
        });
        pushToast('success', 'Challenge Deployed', `"${payload.title}" added to the DVWA arsenal.`);
      } else if (challengeInspector.record) {
        await apiFetch(`/api/challenges/${challengeInspector.record.challenge_id}`, {
          method: 'PUT',
          body: payload,
        });
        pushToast('success', 'Challenge Updated', `Saved changes to "${payload.title}".`);
      }
      setChallengeInspector((prev) => ({ ...prev, open: false }));
      await syncAll();
    } catch (err) {
      const msg = err.message || 'Unable to save challenge.';
      setChallengeError(msg);
      pushToast('error', 'Challenge Save Failed', msg);
    } finally {
      setSavingChallenge(false);
    }
  }

  async function handleDeleteChallenge() {
    const ch = challengeInspector.record;
    if (!ch) return;

    setChallengeError('');
    setSavingChallenge(true);
    try {
      await apiFetch(`/api/challenges/${ch.challenge_id}`, { method: 'DELETE' });
      setChallengeInspector((prev) => ({ ...prev, open: false }));
      setConfirmDeleteChallenge(false);
      pushToast('success', 'Challenge Removed', `"${ch.title}" and linked telemetry deleted.`);
      await syncAll();
    } catch (err) {
      const msg = err.message || 'Unable to delete challenge.';
      setChallengeError(msg);
      pushToast('error', 'Delete Failed', msg);
    } finally {
      setSavingChallenge(false);
    }
  }

  // --- Operator CRUD ---

  async function handleSaveOperator(event) {
    event.preventDefault();
    setOperatorError('');

    const cfg = TEAM_CONFIG[operatorInspector.role] || TEAM_CONFIG.attacker;
    const username = operatorForm.username.trim();
    const email = operatorForm.email.trim().toLowerCase();
    const password = operatorForm.password;

    if (username.length < 2) {
      setOperatorError('Username must be at least 2 characters.');
      return;
    }
    if (!email || !email.includes('@')) {
      setOperatorError('Enter a valid email address.');
      return;
    }

    if (operatorInspector.mode === 'create') {
      if (password.length < 8) {
        setOperatorError('Password must be at least 8 characters.');
        return;
      }
      if (utf8ByteLength(password) > 72) {
        setOperatorError('Password must be at most 72 UTF-8 bytes.');
        return;
      }
    } else if (password) {
      if (password.length < 8) {
        setOperatorError('New password must be at least 8 characters.');
        return;
      }
      if (utf8ByteLength(password) > 72) {
        setOperatorError('New password must be at most 72 UTF-8 bytes.');
        return;
      }
    }

    setSavingOperator(true);
    try {
      if (operatorInspector.mode === 'create') {
        await apiFetch(cfg.endpoint, {
          method: 'POST',
          body: {
            username,
            email,
            password,
            ...(user?.role === 'moderator' && user?.id ? { moderator_id: user.id } : {}),
          },
        });
        pushToast('success', `${cfg.singular} Provisioned`, `Account "${username}" is now active.`);
      } else if (operatorInspector.record) {
        const recordId = operatorInspector.record[cfg.idKey];
        await apiFetch(`${cfg.endpoint}/${recordId}`, {
          method: 'PUT',
          body: {
            username,
            email,
            ...(password ? { password } : {}),
          },
        });
        pushToast('success', `${cfg.singular} Updated`, `Saved updates for "${username}".`);
      }
      setOperatorInspector((prev) => ({ ...prev, open: false }));
      await syncAll();
    } catch (err) {
      const msg = err.message || `Unable to save ${cfg.singular.toLowerCase()} account.`;
      setOperatorError(msg);
      pushToast('error', `${cfg.singular} Save Failed`, msg);
    } finally {
      setSavingOperator(false);
    }
  }

  async function handleDeleteOperator() {
    const cfg = TEAM_CONFIG[operatorInspector.role] || TEAM_CONFIG.attacker;
    const recordId = operatorInspector.record?.[cfg.idKey];
    if (!recordId) return;

    setOperatorError('');
    setSavingOperator(true);
    try {
      await apiFetch(`${cfg.endpoint}/${recordId}`, { method: 'DELETE' });
      const deletedName = operatorInspector.record?.username || cfg.singular;
      setOperatorInspector((prev) => ({ ...prev, open: false }));
      setConfirmDeleteOperator(false);
      pushToast('success', `${cfg.singular} Removed`, `Deleted "${deletedName}" and linked logs.`);
      await syncAll();
    } catch (err) {
      const msg = err.message || `Unable to remove ${cfg.singular.toLowerCase()}.`;
      setOperatorError(msg);
      pushToast('error', 'Removal Failed', msg);
    } finally {
      setSavingOperator(false);
    }
  }

  const csvExportHref = useMemo(
    () =>
      exportActivityCsvUrl({
        event_type: eventTypeFilter,
        challenge_id: challengeFilter,
        search: searchQuery,
      }),
    [eventTypeFilter, challengeFilter, searchQuery]
  );

  const triggerCsvExport = useCallback(() => {
    const link = document.createElement('a');
    link.href = csvExportHref;
    link.download = 'cyberforge-activity.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    pushToast('success', 'CSV Export Started', 'Downloading cyberforge-activity.csv.');
  }, [csvExportHref, pushToast]);

  const navItems = useMemo(
    () => [
      { id: 'triage', label: 'Live Ops', icon: Pulse, badge: activity.length },
      { id: 'arsenal', label: 'Arsenal', icon: Target, badge: challenges.length },
      { id: 'attackers', label: 'Red Team', icon: Sword, badge: attackers.length },
      { id: 'defenders', label: 'Blue Team', icon: ShieldCheck, badge: defenders.length },
      { id: 'profile', label: 'Profile', icon: UserCircle },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [activity.length, challenges.length, attackers.length, defenders.length]
  );

  const commandGroups = useMemo(
    () => [
      {
        heading: 'Range Views',
        items: navItems.map((item, idx) => ({
          id: `view-${item.id}`,
          label: item.label,
          hint: `Switch to ${item.label}`,
          shortcut: String(idx + 1),
          icon: item.icon,
          onSelect: () => setActiveTab(item.id),
        })),
      },
      {
        heading: 'Operations Actions',
        items: [
          {
            id: 'op-deploy-challenge',
            label: 'Deploy Challenge',
            hint: 'Publish a new DVWA lab into Arsenal',
            icon: Plus,
            onSelect: () => {
              setActiveTab('arsenal');
              openCreateChallenge();
            },
          },
          {
            id: 'op-add-attacker',
            label: 'Add Attacker',
            hint: 'Provision a new Red Team trainee',
            icon: Sword,
            onSelect: () => {
              setActiveTab('attackers');
              openCreateOperator('attacker');
            },
          },
          {
            id: 'op-add-defender',
            label: 'Add Defender',
            hint: 'Provision a new Blue Team guardian',
            icon: ShieldCheck,
            onSelect: () => {
              setActiveTab('defenders');
              openCreateOperator('defender');
            },
          },
          {
            id: 'op-export-csv',
            label: 'Export Activity CSV',
            hint: 'Download filtered SOC triage logs',
            icon: DownloadSimple,
            onSelect: triggerCsvExport,
          },
          {
            id: 'op-sync',
            label: 'Force Sync Telemetry',
            hint: 'Refresh challenges, rosters, and activity stream',
            icon: ArrowsClockwise,
            onSelect: () => syncAll({ notify: true }),
          },
        ],
      },
      {
        heading: 'Challenge Arsenal',
        items: challenges.map((ch) => ({
          id: `ch-${ch.challenge_id}`,
          label: ch.title,
          hint: `${ch.vulnerability_type} · ${ch.difficulty} · ${ch.dvwa_page_ref}`,
          icon: Target,
          onSelect: () => {
            setActiveTab('arsenal');
            openEditChallenge(ch);
          },
        })),
      },
      {
        heading: 'Operators',
        items: [
          ...attackers.map((a) => ({
            id: `att-${a.attacker_id}`,
            label: a.username,
            hint: `Red Team · ${a.attempts_count ?? 0} attempts · ${a.total_score ?? 0} pts`,
            icon: Sword,
            onSelect: () => {
              setActiveTab('attackers');
              openEditOperator('attacker', a);
            },
          })),
          ...defenders.map((d) => ({
            id: `def-${d.defender_id}`,
            label: d.username,
            hint: `Blue Team · ${d.defenses_count ?? 0} defenses · ${d.total_score ?? 0} pts`,
            icon: ShieldCheck,
            onSelect: () => {
              setActiveTab('defenders');
              openEditOperator('defender', d);
            },
          })),
        ],
      },
    ],
    [
      navItems,
      challenges,
      attackers,
      defenders,
      openCreateChallenge,
      openCreateOperator,
      openEditChallenge,
      openEditOperator,
      triggerCsvExport,
      syncAll,
    ]
  );

  const profileStats = useMemo(
    () => [
      {
        label: 'Arsenal Labs',
        value: challenges.length,
        detail: 'Published DVWA challenges',
        icon: Target,
        accent: 'teal',
      },
      {
        label: 'Red Team',
        value: attackers.length,
        detail: `${signalTotals.attempts} exploit attempts`,
        icon: Sword,
        accent: 'red',
      },
      {
        label: 'Blue Team',
        value: defenders.length,
        detail: `${signalTotals.defenses} defense checks`,
        icon: ShieldCheck,
        accent: 'green',
      },
      {
        label: 'Alerts Logged',
        value: signalTotals.alerts,
        detail: 'Telemetry stream events',
        icon: Bell,
        accent: 'amber',
      },
    ],
    [challenges.length, attackers.length, defenders.length, signalTotals]
  );

  const searchPlaceholder = useMemo(() => {
    if (activeTab === 'arsenal') return 'Filter challenges by title, category, or endpoint...';
    if (activeTab === 'attackers') return 'Filter Red Team operators...';
    if (activeTab === 'defenders') return 'Filter Blue Team operators...';
    return 'Filter triage events, actors, or challenges...';
  }, [activeTab]);

  function inspectTargetChallengeById(challengeId) {
    const match = challenges.find((ch) => ch.challenge_id === challengeId);
    if (!match) {
      pushToast('error', 'Challenge Not Found', `Challenge #${challengeId} is no longer in the catalog.`);
      return;
    }
    setActiveTab('arsenal');
    openEditChallenge(match);
  }

  function renderSegmentedDistributionBar() {
    const total = Math.max(signalTotals.total, 1);
    const segments = [
      {
        id: 'alert',
        label: 'Alerts',
        count: signalTotals.alerts,
        color: '#F59E0B',
        textClass: 'text-[#F59E0B]',
        borderActive: 'border-[#F59E0B]/50 bg-[#F59E0B]/10',
      },
      {
        id: 'attempt',
        label: 'Exploit Attempts',
        count: signalTotals.attempts,
        color: '#F43F5E',
        textClass: 'text-[#F43F5E]',
        borderActive: 'border-[#F43F5E]/50 bg-[#F43F5E]/10',
      },
      {
        id: 'defense',
        label: 'Defenses',
        count: signalTotals.defenses,
        color: '#38BDF8',
        textClass: 'text-[#38BDF8]',
        borderActive: 'border-[#38BDF8]/50 bg-[#38BDF8]/10',
      },
    ];

    let offset = 0;
    const svgSegments = segments.map((seg) => {
      const width = signalTotals.total > 0 ? (seg.count / total) * 100 : 33.33;
      const item = { ...seg, x: offset, width };
      offset += width;
      return item;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight">
              Range Operations &amp; SOC Triage
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click any signal segment to isolate alerts, exploit attempts, or defensive verifications.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-zinc-300">
            <span className="text-zinc-500">Total Signals</span>
            <AnimatedTicker value={signalTotals.total} className="text-base font-semibold text-zinc-100" />
          </div>
        </div>

        {/* Custom SVG Segmented Interactive Signal Distribution Bar */}
        <div className="rounded-lg bg-[#07080B] border border-white/[0.08] p-2">
          <svg
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            className="w-full h-3.5 rounded overflow-hidden block"
            role="img"
            aria-label="Signal distribution across alerts, exploit attempts, and defenses"
          >
            <rect x="0" y="0" width="100" height="8" fill="#141720" />
            {svgSegments.map((seg) => {
              const dimmed = eventTypeFilter !== 'all' && eventTypeFilter !== seg.id;
              return (
                <rect
                  key={seg.id}
                  x={seg.x}
                  y="0"
                  width={Math.max(seg.width, signalTotals.total > 0 && seg.count > 0 ? 1.5 : 0)}
                  height="8"
                  fill={seg.color}
                  opacity={dimmed ? 0.25 : 0.92}
                  className="cursor-pointer transition-opacity duration-150"
                  onClick={() =>
                    setEventTypeFilter((prev) => (prev === seg.id ? 'all' : seg.id))
                  }
                >
                  <title>{`${seg.label}: ${seg.count}`}</title>
                </rect>
              );
            })}
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {segments.map((seg) => {
            const isSelected = eventTypeFilter === seg.id;
            const share = signalTotals.total > 0 ? Math.round((seg.count / signalTotals.total) * 100) : 0;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() =>
                  setEventTypeFilter((prev) => (prev === seg.id ? 'all' : seg.id))
                }
                aria-pressed={isSelected}
                className={[
                  'px-3 py-2.5 rounded-lg border text-left transition-colors duration-150 flex items-center justify-between gap-2',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
                  isSelected
                    ? seg.borderActive
                    : 'bg-[#090B10]/80 border-white/[0.08] hover:border-white/[0.16]',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-xs font-medium text-zinc-200 truncate">{seg.label}</span>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-zinc-500 mt-1">
                    {share}% share
                  </div>
                </div>
                <AnimatedTicker
                  value={seg.count}
                  className={['text-lg font-semibold', seg.textClass].join(' ')}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTeamRoster(role) {
    const cfg = TEAM_CONFIG[role];
    const records = role === 'attacker' ? filteredAttackers : filteredDefenders;
    const allRecords = role === 'attacker' ? attackers : defenders;
    const Icon = cfg.icon;

    const totalOps = allRecords.reduce((sum, item) => sum + (item[cfg.countKey] || 0), 0);
    const totalScore = allRecords.reduce((sum, item) => sum + (item.total_score || 0), 0);
    const topThree = [...allRecords]
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, 3);
    const maxScore = Math.max(...topThree.map((item) => item.total_score || 0), 1);

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{cfg.heading}</h1>
            <p className="text-sm text-zinc-400 mt-1">{cfg.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              onClick={() => syncAll({ notify: true })}
            >
              <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
              <span>Sync</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => openCreateOperator(role)}>
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>Add {cfg.singular}</span>
            </Button>
          </div>
        </div>

        {/* Team Readiness Bento Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <SpotlightSurface accent={cfg.accent} padding="p-5" className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: cfg.accentHex }} weight="bold" />
                <h2 className="text-sm font-semibold text-zinc-100">{cfg.plural} Readiness</h2>
              </div>
              <Badge variant={cfg.badgeVariant}>{allRecords.length} active</Badge>
            </div>

            <div className="grid grid-cols-3 divide-x divide-white/[0.08] border border-white/[0.08] rounded-lg bg-[#07080B]">
              <div className="p-3">
                <div className="text-[11px] text-zinc-500">Operators</div>
                <div className="mt-1 text-lg font-semibold text-zinc-100">
                  <AnimatedTicker value={allRecords.length} />
                </div>
              </div>
              <div className="p-3">
                <div className="text-[11px] text-zinc-500">{cfg.countLabel}</div>
                <div className="mt-1 text-lg font-semibold text-zinc-100">
                  <AnimatedTicker value={totalOps} />
                </div>
              </div>
              <div className="p-3">
                <div className="text-[11px] text-zinc-500">Team Score</div>
                <div className="mt-1 text-lg font-semibold" style={{ color: cfg.accentHex }}>
                  <AnimatedTicker value={totalScore} suffix=" pts" />
                </div>
              </div>
            </div>
          </SpotlightSurface>

          <SpotlightSurface accent="teal" padding="p-5" className="lg:col-span-7">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-zinc-100">Top Ranked Operators</h2>
              <span className="text-xs font-mono text-zinc-500">Click to inspect</span>
            </div>
            {topThree.length === 0 ? (
              <div className="py-5 text-xs text-zinc-500">
                No {cfg.plural.toLowerCase()} accounts available to rank yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topThree.map((op) => {
                  const idVal = op[cfg.idKey];
                  const pct = Math.max(4, Math.round(((op.total_score || 0) / maxScore) * 100));
                  return (
                    <button
                      key={idVal}
                      type="button"
                      onClick={() => openEditOperator(role, op)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#07080B] border border-white/[0.06] hover:border-white/[0.16] transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-zinc-100 truncate">
                          {op.username}{' '}
                          <span className="font-mono text-zinc-500">#{idVal}</span>
                        </span>
                        <span className="font-mono tabular-nums text-zinc-300 shrink-0">
                          {op[cfg.countKey] ?? 0} {cfg.countLabel.toLowerCase()} ·{' '}
                          <span style={{ color: cfg.accentHex }} className="font-semibold">
                            {op.total_score ?? 0} pts
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={['h-full rounded-full transition-all duration-300', cfg.barClass].join(' ')}
                          style={{ width: `${op.total_score ? pct : 4}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SpotlightSurface>
        </div>

        {/* Searchable Operator Roster */}
        {loadingCore ? (
          <SkeletonRows rows={5} columns={5} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={searchQuery ? `No matching ${cfg.plural.toLowerCase()}` : cfg.emptyTitle}
            description={
              searchQuery
                ? `No ${cfg.singular.toLowerCase()} accounts match "${searchQuery}".`
                : cfg.emptyDescription
            }
            action={
              searchQuery ? (
                <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                  Clear Filter
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => openCreateOperator(role)}>
                  <Plus className="w-3.5 h-3.5" weight="bold" />
                  <span>Add {cfg.singular}</span>
                </Button>
              )
            }
          />
        ) : (
          <div className="bg-[#0D0F14]/90 border border-white/[0.08] rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-400">
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-right">{cfg.countLabel}</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {records.map((acc) => {
                  const idVal = acc[cfg.idKey];
                  return (
                    <tr key={idVal} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#07080B] border border-white/[0.08] flex items-center justify-center text-xs font-mono font-semibold text-zinc-200 shrink-0">
                            {getInitials(acc.username)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-100 truncate">{acc.username}</div>
                            <div className="text-[11px] font-mono tabular-nums text-zinc-500">
                              ID #{idVal}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <CopyChip value={acc.email} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-zinc-200">
                        {acc[cfg.countKey] ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold" style={{ color: cfg.accentHex }}>
                        {acc.total_score ?? 0} pts
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-zinc-400 whitespace-nowrap">
                        {formatUtcTimestamp(acc.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditOperator(role, acc)}
                        >
                          <PencilSimple className="w-3.5 h-3.5" weight="regular" />
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
      </div>
    );
  }

  const activeTeamCfg = TEAM_CONFIG[operatorInspector.role] || TEAM_CONFIG.attacker;

  return (
    <CommandDeckShell
      user={user}
      roleTheme="moderator"
      roleLabel="RANGE OPERATIONS"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={searchPlaceholder}
      commandGroups={commandGroups}
      headerActions={
        typeof onOpenOverview === 'function' ? (
          <Button variant="secondary" size="sm" onClick={onOpenOverview} className="hidden lg:inline-flex">
            <span>3D Overview</span>
          </Button>
        ) : null
      }
      onSignOut={onSignOut}
    >
      {coreError && (
        <AlertBanner
          variant="error"
          message={coreError}
          onDismiss={() => setCoreError('')}
          className="mb-5"
        />
      )}

      {/* 1. LIVE OPS / SOC TRIAGE */}
      {activeTab === 'triage' && (
        <div className="space-y-5">
          {/* Top Asymmetric Telemetry Deck (8 cols + 4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <SpotlightSurface accent="teal" padding="p-5" className="lg:col-span-8">
              <BorderSweep color="#00E5CC" secondary="#38BDF8" duration={9} />
              {renderSegmentedDistributionBar()}
            </SpotlightSurface>

            <SpotlightSurface accent="sky" padding="p-5" className="lg:col-span-4 flex flex-col justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Ops Action Rail</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Export filtered audit logs or toggle continuous range telemetry polling.
                </p>
              </div>

              <div className="space-y-2.5">
                <a
                  href={csvExportHref}
                  download="cyberforge-activity.csv"
                  onClick={() =>
                    pushToast('success', 'CSV Export Started', 'Downloading cyberforge-activity.csv.')
                  }
                  className="w-full h-9 px-3.5 rounded-[4px] bg-[#00E5CC] text-[#0A0A0B] border border-[#00E5CC] text-sm font-semibold hover:bg-[#00CCA6] hover:border-[#00CCA6] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <DownloadSimple className="w-4 h-4" weight="bold" />
                  <span>Export Audit CSV</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoPoll}
                    onClick={() => setAutoPoll((prev) => !prev)}
                    className={[
                      'h-9 px-3 rounded-[4px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
                      autoPoll
                        ? 'bg-[#00E5CC]/15 text-[#00E5CC] border-[#00E5CC]/40'
                        : 'bg-[#090B10] text-zinc-300 border-white/[0.08] hover:border-white/[0.18]',
                    ].join(' ')}
                  >
                    <Lightning className="w-3.5 h-3.5" weight={autoPoll ? 'fill' : 'regular'} />
                    <span>Auto-Poll 15s</span>
                  </button>

                  <Button
                    variant="secondary"
                    size="md"
                    loading={syncing}
                    onClick={() => syncAll({ notify: true })}
                    className="w-full"
                  >
                    <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
                    <span>Force Sync</span>
                  </Button>
                </div>
              </div>
            </SpotlightSurface>
          </div>

          {/* Master-Detail Triage Workspace (7 cols + 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 space-y-3">
              {/* Filter Bar */}
              <div className="bg-[#0D0F14]/90 border border-white/[0.08] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by signal type">
                  {EVENT_TYPE_FILTERS.map((opt) => {
                    const active = eventTypeFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEventTypeFilter(opt.id)}
                        aria-pressed={active}
                        className={[
                          'h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors',
                          active
                            ? 'bg-[#00E5CC]/15 text-[#00E5CC] border-[#00E5CC]/40'
                            : 'bg-[#07080B] text-zinc-400 border-white/[0.08] hover:text-zinc-100',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 min-w-0 sm:w-56">
                  <Select
                    aria-label="Filter activity by challenge"
                    value={challengeFilter}
                    onChange={(e) => setChallengeFilter(e.target.value)}
                  >
                    <option value="">All Challenges</option>
                    {challenges.map((ch) => (
                      <option key={ch.challenge_id} value={String(ch.challenge_id)}>
                        #{ch.challenge_id} — {ch.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {activityError && (
                <AlertBanner
                  variant="error"
                  message={activityError}
                  onDismiss={() => setActivityError('')}
                />
              )}

              {loadingActivity ? (
                <SkeletonRows rows={6} columns={3} />
              ) : activity.length === 0 ? (
                <EmptyState
                  icon={Pulse}
                  title="No matching triage events"
                  description="Adjust the signal type, challenge filter, or search query to inspect events."
                  action={
                    (eventTypeFilter !== 'all' || challengeFilter || searchQuery) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEventTypeFilter('all');
                          setChallengeFilter('');
                          setSearchQuery('');
                        }}
                      >
                        Reset Filters
                      </Button>
                    )
                  }
                />
              ) : (
                <div className="bg-[#0D0F14]/90 border border-white/[0.08] rounded-xl divide-y divide-white/[0.06] overflow-hidden">
                  {activity.map((item) => {
                    const kindMeta = getKindMeta(item.kind);
                    const isSelected = selectedEvent?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEventId(item.id)}
                        className={[
                          'w-full text-left px-4 py-3 flex items-start justify-between gap-3 transition-colors border-l-2',
                          isSelected
                            ? 'bg-white/[0.06] border-l-[#00E5CC]'
                            : 'border-l-transparent hover:bg-white/[0.03]',
                        ].join(' ')}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={kindMeta.variant}>{kindMeta.label}</Badge>
                            <span className="text-sm font-medium text-zinc-100 truncate">
                              {item.title}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-zinc-400 truncate">
                            {item.subtitle}
                          </div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap">
                            <span>Actor: {item.actor}</span>
                            {item.challenge_title && <span>· {item.challenge_title}</span>}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          <span className="text-[11px] font-mono tabular-nums text-zinc-500 whitespace-nowrap">
                            {formatUtcTimestamp(item.timestamp)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Event Detail Inspector (sticky on desktop) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <SpotlightSurface accent="teal" padding="p-5">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                  <h2 className="text-sm font-semibold text-zinc-100">Event Detail Inspector</h2>
                  {selectedEvent && (
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                      {selectedEvent.id}
                    </span>
                  )}
                </div>

                {!selectedEvent ? (
                  <div className="py-10 text-center text-xs text-zinc-500">
                    Select any event from the live stream to inspect full telemetry and payload details.
                  </div>
                ) : (
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={getKindMeta(selectedEvent.kind).variant}>
                          {getKindMeta(selectedEvent.kind).label}
                        </Badge>
                        <Badge variant={getStatusVariant(selectedEvent.status)}>
                          {selectedEvent.status}
                        </Badge>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-zinc-400">
                        {formatUtcTimestamp(selectedEvent.timestamp)}
                      </span>
                    </div>

                    <div>
                      <div className="text-base font-semibold text-zinc-100">
                        {selectedEvent.title}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Actor: <span className="text-zinc-200 font-medium">{selectedEvent.actor}</span>
                        {selectedEvent.challenge_title && (
                          <span> · Target: {selectedEvent.challenge_title}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-400">
                          Payload / Telemetry Message
                        </span>
                        <CopyChip value={selectedEvent.subtitle} label="Copy payload" />
                      </div>
                      <pre className="p-3 rounded-lg bg-[#07080B] border border-white/[0.08] font-mono text-xs text-zinc-200 whitespace-pre-wrap break-all">
                        {selectedEvent.subtitle}
                      </pre>
                    </div>

                    {selectedEvent.challenge_id && (
                      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                        <span className="text-xs font-mono tabular-nums text-zinc-400">
                          Challenge #{selectedEvent.challenge_id}
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => inspectTargetChallengeById(selectedEvent.challenge_id)}
                        >
                          <Target className="w-3.5 h-3.5" weight="bold" />
                          <span>Inspect Challenge in Arsenal</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </SpotlightSurface>
            </div>
          </div>
        </div>
      )}

      {/* 2. CHALLENGE ARSENAL */}
      {activeTab === 'arsenal' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Challenge Arsenal</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Publish, tune, or retire DVWA vulnerability scenarios and reference vectors.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={openCreateChallenge} className="self-start sm:self-auto">
              <Plus className="w-3.5 h-3.5" weight="bold" />
              <span>Deploy Challenge</span>
            </Button>
          </div>

          <div className="bg-[#0D0F14]/90 border border-white/[0.08] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter challenges by difficulty">
              {['all', 'easy', 'medium', 'hard'].map((diff) => {
                const active = difficultyFilter === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    aria-pressed={active}
                    className={[
                      'h-8 px-3 rounded-lg text-xs font-medium border capitalize transition-colors',
                      active
                        ? 'bg-[#00E5CC]/15 text-[#00E5CC] border-[#00E5CC]/40'
                        : 'bg-[#07080B] text-zinc-400 border-white/[0.08] hover:text-zinc-100',
                    ].join(' ')}
                  >
                    {diff === 'all' ? 'All Difficulties' : diff}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#07080B] p-0.5">
                <button
                  type="button"
                  onClick={() => setArsenalView('grid')}
                  aria-pressed={arsenalView === 'grid'}
                  className={[
                    'h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                    arsenalView === 'grid' ? 'bg-white/[0.1] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
                  ].join(' ')}
                >
                  <SquaresFour className="w-3.5 h-3.5" weight="regular" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArsenalView('table')}
                  aria-pressed={arsenalView === 'table'}
                  className={[
                    'h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                    arsenalView === 'table' ? 'bg-white/[0.1] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
                  ].join(' ')}
                >
                  <Rows className="w-3.5 h-3.5" weight="regular" />
                  <span>Table</span>
                </button>
              </div>

              <Button variant="secondary" size="sm" loading={syncing} onClick={() => syncAll({ notify: true })}>
                <ArrowsClockwise className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </div>
          </div>

          {loadingCore ? (
            <SkeletonRows rows={6} columns={5} />
          ) : filteredChallenges.length === 0 ? (
            <EmptyState
              icon={Target}
              title={searchQuery || difficultyFilter !== 'all' ? 'No matching challenges' : 'No challenges deployed'}
              description="Try adjusting your difficulty filter or deploy a new DVWA challenge."
              action={
                searchQuery || difficultyFilter !== 'all' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setDifficultyFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={openCreateChallenge}>
                    <Plus className="w-3.5 h-3.5" weight="bold" />
                    <span>Deploy Challenge</span>
                  </Button>
                )
              }
            />
          ) : arsenalView === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredChallenges.map((ch) => {
                const diffMeta = DIFFICULTY_META[(ch.difficulty || '').toLowerCase()] || {
                  variant: 'neutral',
                  points: 100,
                };
                return (
                  <SpotlightSurface
                    key={ch.challenge_id}
                    accent="teal"
                    padding="p-4"
                    className="flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-mono tabular-nums text-zinc-500">
                            #{ch.challenge_id} · {diffMeta.points} pts
                          </div>
                          <h2 className="text-base font-semibold text-zinc-100 mt-0.5 truncate">
                            {ch.title}
                          </h2>
                        </div>
                        <Badge variant={diffMeta.variant}>{ch.difficulty}</Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="neutral">{ch.vulnerability_type}</Badge>
                        <CopyChip value={ch.dvwa_page_ref} />
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#07080B] border border-white/[0.06] font-mono text-xs text-zinc-400 truncate">
                        {ch.reference_payload}
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-white/[0.06]">
                      <Button variant="secondary" size="sm" onClick={() => openEditChallenge(ch)}>
                        <PencilSimple className="w-3.5 h-3.5" weight="regular" />
                        <span>Inspect &amp; Edit</span>
                      </Button>
                    </div>
                  </SpotlightSurface>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#0D0F14]/90 border border-white/[0.08] rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-medium text-zinc-400">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">DVWA Endpoint</th>
                    <th className="py-3 px-4">Reference Vector</th>
                    <th className="py-3 px-4 text-right">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-sm">
                  {filteredChallenges.map((ch) => {
                    const diffMeta = DIFFICULTY_META[(ch.difficulty || '').toLowerCase()] || {
                      variant: 'neutral',
                      points: 100,
                    };
                    return (
                      <tr key={ch.challenge_id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-4 font-mono tabular-nums text-xs text-zinc-400">
                          #{ch.challenge_id}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-100 whitespace-nowrap">
                          {ch.title}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral">{ch.vulnerability_type}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={diffMeta.variant}>{ch.difficulty}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <CopyChip value={ch.dvwa_page_ref} />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-zinc-400 max-w-[220px] truncate">
                          {ch.reference_payload}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button variant="secondary" size="sm" onClick={() => openEditChallenge(ch)}>
                            <PencilSimple className="w-3.5 h-3.5" weight="regular" />
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
        </div>
      )}

      {/* 3. RED TEAM (ATTACKERS) & BLUE TEAM (DEFENDERS) */}
      {activeTab === 'attackers' && renderTeamRoster('attacker')}
      {activeTab === 'defenders' && renderTeamRoster('defender')}

      {/* 4. PROFILE & SETTINGS */}
      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}
      {activeTab === 'settings' && <SettingsView user={user} onAccountDeleted={onSignOut} />}

      {/* Challenge Slide-Over Inspector */}
      <SlideOverInspector
        open={challengeInspector.open}
        onClose={closeChallengeInspector}
        title={
          challengeInspector.mode === 'create'
            ? 'Deploy Challenge'
            : challengeInspector.record?.title || 'Inspect Challenge'
        }
        subtitle={
          challengeInspector.mode === 'create'
            ? 'Publish a new DVWA training module and verification vector.'
            : `Challenge #${challengeInspector.record?.challenge_id} · ${challengeInspector.record?.vulnerability_type}`
        }
        badge={
          challengeInspector.mode === 'edit' && challengeInspector.record ? (
            <Badge
              variant={
                DIFFICULTY_META[(challengeInspector.record.difficulty || '').toLowerCase()]?.variant ||
                'neutral'
              }
            >
              {challengeInspector.record.difficulty}
            </Badge>
          ) : null
        }
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div>
              {challengeInspector.mode === 'edit' && !confirmDeleteChallenge && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDeleteChallenge(true)}
                  disabled={savingChallenge}
                >
                  <Trash className="w-3.5 h-3.5" weight="regular" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={closeChallengeInspector} disabled={savingChallenge}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="cf-deck-challenge-form"
                variant="primary"
                loading={savingChallenge}
              >
                {challengeInspector.mode === 'create' ? 'Deploy Challenge' : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {challengeError && (
            <AlertBanner
              variant="error"
              message={challengeError}
              onDismiss={() => setChallengeError('')}
            />
          )}

          <form id="cf-deck-challenge-form" onSubmit={handleSaveChallenge} className="space-y-4">
            <Field label="Title" htmlFor="cf-deck-ch-title" required>
              <Input
                id="cf-deck-ch-title"
                value={challengeForm.title}
                onChange={(e) => setChallengeForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Broken Login"
                disabled={savingChallenge}
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Category" htmlFor="cf-deck-ch-vuln" required>
                <Input
                  id="cf-deck-ch-vuln"
                  value={challengeForm.vulnerability_type}
                  onChange={(e) =>
                    setChallengeForm((prev) => ({ ...prev, vulnerability_type: e.target.value }))
                  }
                  placeholder="SQLi, XSS, LFI..."
                  disabled={savingChallenge}
                  required
                />
              </Field>

              <Field label="Difficulty" htmlFor="cf-deck-ch-diff" required>
                <Select
                  id="cf-deck-ch-diff"
                  value={challengeForm.difficulty}
                  onChange={(e) =>
                    setChallengeForm((prev) => ({ ...prev, difficulty: e.target.value }))
                  }
                  disabled={savingChallenge}
                >
                  <option value="Easy">Easy (50 pts)</option>
                  <option value="Medium">Medium (100 pts)</option>
                  <option value="Hard">Hard (250 pts)</option>
                </Select>
              </Field>
            </div>

            <Field label="DVWA Page Reference" htmlFor="cf-deck-ch-page" required>
              <Input
                id="cf-deck-ch-page"
                className="font-mono text-xs"
                value={challengeForm.dvwa_page_ref}
                onChange={(e) =>
                  setChallengeForm((prev) => ({ ...prev, dvwa_page_ref: e.target.value }))
                }
                placeholder="vulnerabilities/sqli/"
                disabled={savingChallenge}
                required
              />
            </Field>

            <Field
              label="Reference Vector"
              htmlFor="cf-deck-ch-payload"
              hint="Evaluated during Red Team attempts and Blue Team defense replay."
              required
            >
              <Textarea
                id="cf-deck-ch-payload"
                rows={4}
                className="font-mono text-xs"
                value={challengeForm.reference_payload}
                onChange={(e) =>
                  setChallengeForm((prev) => ({ ...prev, reference_payload: e.target.value }))
                }
                placeholder="' OR '1'='1"
                disabled={savingChallenge}
                required
              />
            </Field>
          </form>

          {challengeInspector.mode === 'edit' && confirmDeleteChallenge && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-3">
              <div className="flex items-start gap-2 text-xs text-red-200 leading-relaxed">
                <Warning className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" weight="bold" />
                <span>
                  Permanent deletion removes this challenge and all linked attempts, defenses, and alerts.
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmDeleteChallenge(false)}
                  disabled={savingChallenge}
                >
                  Keep Challenge
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteChallenge}
                  loading={savingChallenge}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </SlideOverInspector>

      {/* Red / Blue Team Operator Slide-Over Inspector */}
      <SlideOverInspector
        open={operatorInspector.open}
        onClose={closeOperatorInspector}
        title={
          operatorInspector.mode === 'create'
            ? `Add ${activeTeamCfg.singular}`
            : operatorInspector.record?.username || `Inspect ${activeTeamCfg.singular}`
        }
        subtitle={
          operatorInspector.mode === 'create'
            ? `Provision a new ${activeTeamCfg.plural} trainee account.`
            : `${activeTeamCfg.plural} ID #${operatorInspector.record?.[activeTeamCfg.idKey]}`
        }
        badge={
          operatorInspector.mode === 'edit' ? (
            <Badge variant={activeTeamCfg.badgeVariant}>{activeTeamCfg.plural}</Badge>
          ) : null
        }
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div>
              {operatorInspector.mode === 'edit' && !confirmDeleteOperator && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDeleteOperator(true)}
                  disabled={savingOperator}
                >
                  <Trash className="w-3.5 h-3.5" weight="regular" />
                  <span>Remove</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={closeOperatorInspector} disabled={savingOperator}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="cf-deck-operator-form"
                variant="primary"
                loading={savingOperator}
              >
                {operatorInspector.mode === 'create'
                  ? `Create ${activeTeamCfg.singular}`
                  : 'Save Changes'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {operatorError && (
            <AlertBanner
              variant="error"
              message={operatorError}
              onDismiss={() => setOperatorError('')}
            />
          )}

          {operatorInspector.mode === 'edit' && operatorInspector.record && (
            <div className="grid grid-cols-2 divide-x divide-white/[0.08] border border-white/[0.08] rounded-xl bg-[#07080B]">
              <div className="p-3">
                <div className="text-[11px] text-zinc-500">{activeTeamCfg.countLabel}</div>
                <div className="text-base font-mono tabular-nums font-semibold text-zinc-100 mt-0.5">
                  {operatorInspector.record[activeTeamCfg.countKey] ?? 0}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[11px] text-zinc-500">Total Score</div>
                <div
                  className="text-base font-mono tabular-nums font-semibold mt-0.5"
                  style={{ color: activeTeamCfg.accentHex }}
                >
                  {operatorInspector.record.total_score ?? 0} pts
                </div>
              </div>
            </div>
          )}

          <form id="cf-deck-operator-form" onSubmit={handleSaveOperator} className="space-y-4">
            <Field label="Username" htmlFor="cf-deck-op-username" required>
              <Input
                id="cf-deck-op-username"
                value={operatorForm.username}
                onChange={(e) => setOperatorForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder={activeTeamCfg.placeholderUser}
                disabled={savingOperator}
                required
              />
            </Field>

            <Field label="Email address" htmlFor="cf-deck-op-email" required>
              <Input
                id="cf-deck-op-email"
                type="email"
                value={operatorForm.email}
                onChange={(e) => setOperatorForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={activeTeamCfg.placeholderEmail}
                disabled={savingOperator}
                required
              />
            </Field>

            <Field
              label={operatorInspector.mode === 'edit' ? 'New password (optional)' : 'Password'}
              htmlFor="cf-deck-op-password"
              hint={
                operatorInspector.mode === 'edit'
                  ? 'Leave blank to keep existing password (8–72 UTF-8 bytes if changed).'
                  : '8 to 72 UTF-8 bytes, hashed with bcrypt.'
              }
              required={operatorInspector.mode === 'create'}
            >
              <Input
                id="cf-deck-op-password"
                type="password"
                value={operatorForm.password}
                onChange={(e) => setOperatorForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={
                  operatorInspector.mode === 'edit'
                    ? 'Leave blank to keep unchanged'
                    : 'Minimum 8 characters'
                }
                disabled={savingOperator}
                required={operatorInspector.mode === 'create'}
              />
            </Field>
          </form>

          {operatorInspector.mode === 'edit' && confirmDeleteOperator && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-3">
              <div className="flex items-start gap-2 text-xs text-red-200 leading-relaxed">
                <Warning className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" weight="bold" />
                <span>{activeTeamCfg.deleteNotice}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmDeleteOperator(false)}
                  disabled={savingOperator}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteOperator}
                  loading={savingOperator}
                >
                  Confirm Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      </SlideOverInspector>

      <TactileToast toasts={toasts} onDismiss={dismissToast} />
    </CommandDeckShell>
  );
}
