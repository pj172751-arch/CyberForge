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
import { apiFetch, downloadAuthenticatedCsv, exportActivityCsvUrl } from '../../utils/api';
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
  CopyChip,
  PaginationBar,
  SlideOverInspector,
  SpotlightSurface,
  TactileToast,
} from '../ui/spells';
import CommandDeckShell from './CommandDeckShell';
import { ProfileView, SettingsView } from './AccountViews';

const PAGE_SIZE = 8;

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
    accent: 'crimson',
    accentHex: '#C81E1E',
    barClass: 'bg-[#C81E1E]',
    badgeVariant: 'red',
    placeholderEmail: 'attacker@cyberforge.dev',
    placeholderUser: 'red_operator_01',
    icon: Sword,
    heading: 'Red Team Operators',
    subtitle: 'Manage offensive trainee accounts, exploit attempt volume, and cumulative scores.',
    emptyTitle: 'No Red Team operators found',
    emptyDescription: 'Provision an attacker account to assign offensive DVWA scenarios.',
    deleteNotice:
      'Removing this attacker permanently deletes all recorded exploit attempts by this operator.',
  },
  defender: {
    endpoint: '/api/defenders',
    idKey: 'defender_id',
    countKey: 'defenses_count',
    countLabel: 'Defenses',
    singular: 'Defender',
    plural: 'Blue Team',
    accent: 'cobalt',
    accentHex: '#1D4ED8',
    barClass: 'bg-[#1D4ED8]',
    badgeVariant: 'blue',
    placeholderEmail: 'defender@cyberforge.dev',
    placeholderUser: 'blue_guardian_01',
    icon: ShieldCheck,
    heading: 'Blue Team Guardians',
    subtitle: 'Manage defensive trainee accounts, verification volume, and remediation scores.',
    emptyTitle: 'No Blue Team operators found',
    emptyDescription: 'Provision a defender account to assign defensive DVWA hardening labs.',
    deleteNotice:
      'Removing this defender permanently deletes all recorded defense verifications by this operator.',
  },
};

function formatUtcTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function formatUtcTimeShort(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(11, 19) + ' UTC';
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
    return { label: 'Alert', variant: 'amber', color: '#B45309' };
  }
  if (kind === 'attempt') {
    return { label: 'Attempt', variant: 'red', color: '#C81E1E' };
  }
  if (kind === 'defense') {
    return { label: 'Defense', variant: 'blue', color: '#1D4ED8' };
  }
  return { label: kind || 'Event', variant: 'neutral', color: '#4B5260' };
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
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const [challenges, setChallenges] = useState([]);
  const [attackers, setAttackers] = useState([]);
  const [defenders, setDefenders] = useState([]);
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
  const [arsenalView, setArsenalView] = useState('table'); // 'table' | 'grid'

  // Pagination state (8 rows per page across tables/lists)
  const [overviewPage, setOverviewPage] = useState(1);
  const [challengesPage, setChallengesPage] = useState(1);
  const [attackersPage, setAttackersPage] = useState(1);
  const [defendersPage, setDefendersPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

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
    const [chRes, attRes, defRes] = await Promise.all([
      apiFetch('/api/challenges'),
      apiFetch('/api/attackers'),
      apiFetch('/api/defenders'),
    ]);
    return {
      challenges: Array.isArray(chRes) ? chRes : [],
      attackers: Array.isArray(attRes) ? attRes : [],
      defenders: Array.isArray(defRes) ? defRes : [],
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

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setOverviewPage(1);
    setChallengesPage(1);
    setAttackersPage(1);
    setDefendersPage(1);
    setActivityPage(1);
  }, []);

  const handleDifficultyFilterChange = useCallback((diff) => {
    setDifficultyFilter(diff);
    setChallengesPage(1);
  }, []);

  const handleEventTypeFilterChange = useCallback((kind) => {
    setEventTypeFilter(kind);
    setActivityPage(1);
  }, []);

  const handleChallengeFilterChange = useCallback((val) => {
    setChallengeFilter(val);
    setActivityPage(1);
  }, []);

  // Derived Telemetry Totals
  const signalTotals = useMemo(() => {
    const alerts = activity.filter((i) => i.kind === 'alert').length;
    const attempts = attackers.reduce((sum, item) => sum + (item.attempts_count || 0), 0);
    const defenses = defenders.reduce((sum, item) => sum + (item.defenses_count || 0), 0);
    const total = alerts + attempts + defenses;
    return { alerts, attempts, defenses, total };
  }, [activity, attackers, defenders]);

  // Challenge balance matrix counts from observed activity stream
  const challengeBalanceMap = useMemo(() => {
    const map = new Map();
    for (const ev of activity) {
      if (!ev.challenge_id) continue;
      const entry = map.get(ev.challenge_id) || { attempts: 0, defenses: 0, alerts: 0 };
      if (ev.kind === 'attempt') entry.attempts += 1;
      else if (ev.kind === 'defense') entry.defenses += 1;
      else if (ev.kind === 'alert') entry.alerts += 1;
      map.set(ev.challenge_id, entry);
    }
    return map;
  }, [activity]);

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

  // Paginated slices (8 items/page)
  const overviewTotalPages = Math.max(1, Math.ceil(challenges.length / PAGE_SIZE));
  const safeOverviewPage = Math.min(overviewPage, overviewTotalPages);
  const overviewChallenges = useMemo(() => {
    const start = (safeOverviewPage - 1) * PAGE_SIZE;
    return challenges.slice(start, start + PAGE_SIZE);
  }, [challenges, safeOverviewPage]);

  const challengesTotalPages = Math.max(1, Math.ceil(filteredChallenges.length / PAGE_SIZE));
  const safeChallengesPage = Math.min(challengesPage, challengesTotalPages);
  const paginatedChallenges = useMemo(() => {
    const start = (safeChallengesPage - 1) * PAGE_SIZE;
    return filteredChallenges.slice(start, start + PAGE_SIZE);
  }, [filteredChallenges, safeChallengesPage]);

  const attackersTotalPages = Math.max(1, Math.ceil(filteredAttackers.length / PAGE_SIZE));
  const safeAttackersPage = Math.min(attackersPage, attackersTotalPages);
  const paginatedAttackers = useMemo(() => {
    const start = (safeAttackersPage - 1) * PAGE_SIZE;
    return filteredAttackers.slice(start, start + PAGE_SIZE);
  }, [filteredAttackers, safeAttackersPage]);

  const defendersTotalPages = Math.max(1, Math.ceil(filteredDefenders.length / PAGE_SIZE));
  const safeDefendersPage = Math.min(defendersPage, defendersTotalPages);
  const paginatedDefenders = useMemo(() => {
    const start = (safeDefendersPage - 1) * PAGE_SIZE;
    return filteredDefenders.slice(start, start + PAGE_SIZE);
  }, [filteredDefenders, safeDefendersPage]);

  const activityTotalPages = Math.max(1, Math.ceil(activity.length / PAGE_SIZE));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const paginatedActivity = useMemo(() => {
    const start = (safeActivityPage - 1) * PAGE_SIZE;
    return activity.slice(start, start + PAGE_SIZE);
  }, [activity, safeActivityPage]);

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
      if (password.length < 10) {
        setOperatorError('Password must be at least 10 characters with a letter and number/symbol.');
        return;
      }
      if (utf8ByteLength(password) > 72) {
        setOperatorError('Password must be at most 72 UTF-8 bytes.');
        return;
      }
    } else if (password) {
      if (password.length < 10) {
        setOperatorError('New password must be at least 10 characters with a letter and number/symbol.');
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

  const [exportingCsv, setExportingCsv] = useState(false);

  const csvExportHref = useMemo(
    () =>
      exportActivityCsvUrl({
        event_type: eventTypeFilter,
        challenge_id: challengeFilter,
        search: searchQuery,
      }),
    [eventTypeFilter, challengeFilter, searchQuery]
  );

  const triggerCsvExport = useCallback(async () => {
    if (exportingCsv) return;
    setExportingCsv(true);
    try {
      await downloadAuthenticatedCsv(csvExportHref, 'cyberforge-activity.csv');
      pushToast('success', 'CSV Export Started', 'Downloaded cyberforge-activity.csv.');
    } catch (err) {
      const msg = err?.message || 'Unable to export activity CSV.';
      setActivityError(msg);
      pushToast('error', 'CSV Export Failed', msg);
    } finally {
      setExportingCsv(false);
    }
  }, [csvExportHref, exportingCsv, pushToast]);

  const navItems = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: SquaresFour },
      { id: 'challenges', label: 'Challenges', icon: Target, badge: challenges.length },
      { id: 'attackers', label: 'Red Team', icon: Sword, badge: attackers.length },
      { id: 'defenders', label: 'Blue Team', icon: ShieldCheck, badge: defenders.length },
      { id: 'activity', label: 'Activity Log', icon: Pulse, badge: activity.length },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [challenges.length, attackers.length, defenders.length, activity.length]
  );

  const commandGroups = useMemo(
    () => [
      {
        heading: 'Range Views',
        items: [
          ...navItems.map((item, idx) => ({
            id: `view-${item.id}`,
            label: item.label,
            hint: `Switch to ${item.label}`,
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
        ],
      },
      {
        heading: 'Operations Actions',
        items: [
          {
            id: 'op-deploy-challenge',
            label: 'Deploy Challenge',
            hint: 'Publish a new DVWA lab into Challenges',
            icon: Plus,
            onSelect: () => {
              setActiveTab('challenges');
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
        heading: 'Challenge Catalog',
        items: challenges.map((ch) => ({
          id: `ch-${ch.challenge_id}`,
          label: ch.title,
          hint: `${ch.vulnerability_type} · ${ch.difficulty} · ${ch.dvwa_page_ref}`,
          icon: Target,
          onSelect: () => {
            setActiveTab('challenges');
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
        label: 'Published Labs',
        value: challenges.length,
        detail: 'DVWA range scenarios',
        icon: Target,
        accent: 'blue',
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
    if (activeTab === 'challenges') return 'Filter challenges or endpoints...';
    if (activeTab === 'attackers') return 'Filter Red Team operators...';
    if (activeTab === 'defenders') return 'Filter Blue Team operators...';
    if (activeTab === 'activity') return 'Filter events, actors, payloads...';
    return 'Filter challenges or telemetry...';
  }, [activeTab]);

  function inspectTargetChallengeById(challengeId) {
    const match = challenges.find((ch) => ch.challenge_id === challengeId);
    if (!match) {
      pushToast('error', 'Challenge Not Found', `Challenge #${challengeId} is no longer in the catalog.`);
      return;
    }
    setActiveTab('challenges');
    openEditChallenge(match);
  }

  function renderSignalDistributionSvg() {
    const total = Math.max(signalTotals.total, 1);
    const segments = [
      {
        id: 'alert',
        label: 'Alerts',
        count: signalTotals.alerts,
        color: '#B45309',
        textClass: 'text-[#B45309]',
      },
      {
        id: 'attempt',
        label: 'Attempts',
        count: signalTotals.attempts,
        color: '#C81E1E',
        textClass: 'text-[#C81E1E]',
      },
      {
        id: 'defense',
        label: 'Defenses',
        count: signalTotals.defenses,
        color: '#1D4ED8',
        textClass: 'text-[#1D4ED8]',
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
      <div className="space-y-2.5">
        <div className="rounded-md bg-[#EAE4D7] border border-[#111317]/15 p-1.5">
          <svg
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            className="w-full h-3 rounded-sm overflow-hidden block"
            role="img"
            aria-label="Signal distribution across alerts, exploit attempts, and defenses"
          >
            <rect x="0" y="0" width="100" height="8" fill="#FAF8F3" />
            {svgSegments.map((seg) => (
              <rect
                key={seg.id}
                x={seg.x}
                y="0"
                width={Math.max(seg.width, signalTotals.total > 0 && seg.count > 0 ? 1.5 : 0)}
                height="8"
                fill={seg.color}
                className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                onClick={() => {
                  handleEventTypeFilterChange(seg.id);
                  setActiveTab('activity');
                }}
              >
                <title>{`${seg.label}: ${seg.count}`}</title>
              </rect>
            ))}
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => {
                handleEventTypeFilterChange(seg.id);
                setActiveTab('activity');
              }}
              className="px-2.5 py-2 rounded-md bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/15 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-xs font-semibold text-[#4B5260] truncate">{seg.label}</span>
              </div>
              <div className={['font-mono text-base font-bold tabular-nums mt-0.5', seg.textClass].join(' ')}>
                {seg.count.toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderTeamRoster(role) {
    const cfg = TEAM_CONFIG[role];
    const records = role === 'attacker' ? filteredAttackers : filteredDefenders;
    const allRecords = role === 'attacker' ? attackers : defenders;
    const paginated = role === 'attacker' ? paginatedAttackers : paginatedDefenders;
    const currentPage = role === 'attacker' ? safeAttackersPage : safeDefendersPage;
    const totalPages = role === 'attacker' ? attackersTotalPages : defendersTotalPages;
    const setPage = role === 'attacker' ? setAttackersPage : setDefendersPage;
    const Icon = cfg.icon;

    const totalOps = allRecords.reduce((sum, item) => sum + (item[cfg.countKey] || 0), 0);
    const totalScore = allRecords.reduce((sum, item) => sum + (item.total_score || 0), 0);
    const topThree = [...allRecords]
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, 3);
    const maxScore = Math.max(...topThree.map((item) => item.total_score || 0), 1);

    return (
      <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#111317] tracking-tight leading-tight">
              {cfg.heading}
            </h1>
            <p className="text-[14px] text-[#4B5260] mt-0.5">{cfg.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              onClick={() => syncAll({ notify: true })}
            >
              <ArrowsClockwise className="w-4 h-4" weight="bold" />
              <span>Sync</span>
            </Button>
            <Button
              variant={role === 'attacker' ? 'attacker' : 'defender'}
              size="sm"
              onClick={() => openCreateOperator(role)}
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Add {cfg.singular}</span>
            </Button>
          </div>
        </div>

        {/* Compact Readiness + Top 3 Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
          <SpotlightSurface accent={cfg.accent} padding="p-3.5" className="lg:col-span-5 flex items-center">
            <div className="grid grid-cols-3 divide-x divide-[#111317]/15 w-full">
              <div className="pr-3">
                <div className="text-xs font-semibold text-[#4B5260]">Operators</div>
                <div className="font-display text-[34px] font-extrabold text-[#111317] leading-none mt-1 tabular-nums">
                  <AnimatedTicker value={allRecords.length} />
                </div>
              </div>
              <div className="px-3">
                <div className="text-xs font-semibold text-[#4B5260]">{cfg.countLabel}</div>
                <div className="font-display text-[34px] font-extrabold text-[#111317] leading-none mt-1 tabular-nums">
                  <AnimatedTicker value={totalOps} />
                </div>
              </div>
              <div className="pl-3">
                <div className="text-xs font-semibold text-[#4B5260]">Team Score</div>
                <div
                  className="font-display text-[34px] font-extrabold leading-none mt-1 tabular-nums"
                  style={{ color: cfg.accentHex }}
                >
                  <AnimatedTicker value={totalScore} />
                </div>
              </div>
            </div>
          </SpotlightSurface>

          <SpotlightSurface accent="brass" padding="p-3.5" className="lg:col-span-7">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-[14px] font-bold text-[#111317]">Top Ranked Operators</h2>
              <span className="text-xs font-mono text-[#4B5260]">Click card to inspect</span>
            </div>
            {topThree.length === 0 ? (
              <div className="py-2 text-[14px] text-[#4B5260]">
                No {cfg.plural.toLowerCase()} accounts available to rank yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {topThree.map((op) => {
                  const idVal = op[cfg.idKey];
                  const pct = Math.max(6, Math.round(((op.total_score || 0) / maxScore) * 100));
                  return (
                    <button
                      key={idVal}
                      type="button"
                      onClick={() => openEditOperator(role, op)}
                      className="text-left px-3 py-2 rounded-md bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/15 hover:border-[#111317]/35 transition-colors space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-bold text-[#111317] truncate">
                          {op.username}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-[#4B5260] shrink-0">
                          #{idVal}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#111317]/10 overflow-hidden">
                        <div
                          className={['h-full rounded-full transition-all duration-300', cfg.barClass].join(' ')}
                          style={{ width: `${op.total_score ? pct : 6}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#4B5260]">
                        <span>{op[cfg.countKey] ?? 0} {cfg.countLabel.toLowerCase()}</span>
                        <span style={{ color: cfg.accentHex }} className="font-bold">
                          {op.total_score ?? 0} pts
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SpotlightSurface>
        </div>

        {/* Paginated Operator Table (8 rows/page) */}
        <div className="flex-1 lg:min-h-0 flex flex-col justify-between gap-2.5">
          {loadingCore ? (
            <SkeletonRows rows={6} columns={5} />
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
                  <Button variant="secondary" size="sm" onClick={() => handleSearchChange('')}>
                    Clear Filter
                  </Button>
                ) : (
                  <Button
                    variant={role === 'attacker' ? 'attacker' : 'defender'}
                    size="sm"
                    onClick={() => openCreateOperator(role)}
                  >
                    <Plus className="w-4 h-4" weight="bold" />
                    <span>Add {cfg.singular}</span>
                  </Button>
                )
              }
            />
          ) : (
            <div className="bg-[#FAF8F3] border border-[#111317]/15 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#111317]/15 bg-[#EAE4D7]/55 text-xs font-bold text-[#4B5260]">
                    <th className="py-2.5 px-4">Operator</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4 text-right">{cfg.countLabel}</th>
                    <th className="py-2.5 px-4 text-right">Score</th>
                    <th className="py-2.5 px-4">Joined</th>
                    <th className="py-2.5 px-4 text-right">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#111317]/10 text-[14px]">
                  {paginated.map((acc) => {
                    const idVal = acc[cfg.idKey];
                    return (
                      <tr key={idVal} className="hover:bg-[#EAE4D7]/45 transition-colors">
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-[#EAE4D7] border border-[#111317]/15 flex items-center justify-center text-xs font-mono font-bold text-[#111317] shrink-0">
                              {getInitials(acc.username)}
                            </div>
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="font-semibold text-[#111317] truncate">
                                {acc.username}
                              </span>
                              <span className="text-xs font-mono tabular-nums text-[#4B5260]">
                                #{idVal}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <CopyChip value={acc.email} />
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-[14px] font-medium text-[#1C1F26]">
                          {acc[cfg.countKey] ?? 0}
                        </td>
                        <td
                          className="py-2 px-4 text-right font-mono tabular-nums text-[14px] font-bold"
                          style={{ color: cfg.accentHex }}
                        >
                          {acc.total_score ?? 0} pts
                        </td>
                        <td className="py-2 px-4 font-mono tabular-nums text-xs text-[#4B5260] whitespace-nowrap">
                          {formatUtcTimestamp(acc.created_at)}
                        </td>
                        <td className="py-2 px-4 text-right whitespace-nowrap">
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

          {records.length > 0 && (
            <PaginationBar
              page={currentPage}
              totalPages={totalPages}
              totalItems={records.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel={cfg.plural.toLowerCase()}
            />
          )}
        </div>
      </div>
    );
  }

  const activeTeamCfg = TEAM_CONFIG[operatorInspector.role] || TEAM_CONFIG.attacker;

  const canFilterCurrentTab =
    activeTab === 'challenges' ||
    activeTab === 'attackers' ||
    activeTab === 'defenders' ||
    activeTab === 'activity';

  return (
    <CommandDeckShell
      user={user}
      roleTheme="moderator"
      roleLabel="RANGE OPERATIONS"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={canFilterCurrentTab ? handleSearchChange : undefined}
      searchPlaceholder={searchPlaceholder}
      commandGroups={commandGroups}
      headerActions={
        typeof onOpenOverview === 'function' ? (
          <Button variant="secondary" size="sm" onClick={onOpenOverview} className="hidden lg:inline-flex">
            <span>3D Hub</span>
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
          className="mb-3 shrink-0"
        />
      )}

      {/* 1. OVERVIEW (SINGLE-FRAME EXECUTIVE COMMAND SHEET) */}
      {activeTab === 'overview' && (
        <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
          {/* Header + Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#111317] tracking-tight leading-tight">
                Range Operations Command
              </h1>
              <p className="text-[14px] text-[#4B5260] mt-0.5">
                Monitor Red vs Blue challenge balance, inspect live DVWA range signals, and export verified audit logs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" loading={syncing} onClick={() => syncAll({ notify: true })}>
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                <span>Sync</span>
              </Button>
              <Button variant="secondary" size="sm" loading={exportingCsv} onClick={triggerCsvExport}>
                <DownloadSimple className="w-4 h-4" weight="bold" />
                <span>Export CSV</span>
              </Button>
              <Button variant="primary" size="sm" onClick={openCreateChallenge}>
                <Plus className="w-4 h-4" weight="bold" />
                <span>Deploy Challenge</span>
              </Button>
            </div>
          </div>

          {/* 4 Crisp KPI Figures */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            <SpotlightSurface accent="brass" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Published Labs</span>
                <Target className="w-4 h-4 text-[#B45309]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#111317] leading-none mt-1">
                <AnimatedTicker value={challenges.length} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1">Live DVWA challenge catalog</div>
            </SpotlightSurface>

            <SpotlightSurface accent="crimson" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Red Team</span>
                <Sword className="w-4 h-4 text-[#C81E1E]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#C81E1E] leading-none mt-1">
                <AnimatedTicker value={attackers.length} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1 font-mono tabular-nums">
                {signalTotals.attempts} exploit attempts
              </div>
            </SpotlightSurface>

            <SpotlightSurface accent="cobalt" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Blue Team</span>
                <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#1D4ED8] leading-none mt-1">
                <AnimatedTicker value={defenders.length} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1 font-mono tabular-nums">
                {signalTotals.defenses} defense verifications
              </div>
            </SpotlightSurface>

            <SpotlightSurface accent="emerald" padding="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#4B5260]">Range Signals</span>
                <Bell className="w-4 h-4 text-[#047857]" weight="bold" />
              </div>
              <div className="font-display text-[36px] sm:text-[40px] font-extrabold text-[#047857] leading-none mt-1">
                <AnimatedTicker value={signalTotals.total} />
              </div>
              <div className="text-xs font-medium text-[#4B5260] mt-1 font-mono tabular-nums">
                {signalTotals.alerts} alerts recorded
              </div>
            </SpotlightSurface>
          </div>

          {/* Executive Split: Red vs Blue Challenge Balance Matrix (Left) + Live 6 Events (Right) */}
          <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <SpotlightSurface
              accent="brass"
              className="lg:col-span-7 flex flex-col lg:min-h-0 justify-between"
            >
              <div>
                <div className="px-4 py-3 border-b border-[#111317]/15 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[#111317]">Red vs Blue Challenge Balance</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="red">Red Attempts</Badge>
                    <Badge variant="blue">Blue Defenses</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('challenges')}>
                      All {challenges.length}
                    </Button>
                  </div>
                </div>

                {loadingCore ? (
                  <div className="p-3">
                    <SkeletonRows rows={6} columns={4} />
                  </div>
                ) : overviewChallenges.length === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="No challenges available"
                    description="Deploy a DVWA challenge to start tracking Red vs Blue coverage."
                    className="border-0 rounded-none"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#111317]/15 bg-[#EAE4D7]/45 text-xs font-bold text-[#4B5260]">
                        <th className="py-2 px-4">Challenge</th>
                        <th className="py-2 px-3">Difficulty</th>
                        <th className="py-2 px-3">Red / Blue Ratio</th>
                        <th className="py-2 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111317]/10 text-[14px]">
                      {overviewChallenges.map((ch) => {
                        const diffMeta = DIFFICULTY_META[(ch.difficulty || '').toLowerCase()] || {
                          variant: 'neutral',
                        };
                        const counts = challengeBalanceMap.get(ch.challenge_id) || {
                          attempts: 0,
                          defenses: 0,
                        };
                        const totalEvents = counts.attempts + counts.defenses;
                        const redPct = totalEvents > 0 ? Math.round((counts.attempts / totalEvents) * 100) : 50;
                        const bluePct = totalEvents > 0 ? 100 - redPct : 50;
                        return (
                          <tr key={ch.challenge_id} className="hover:bg-[#EAE4D7]/45 transition-colors">
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-xs text-[#4B5260] shrink-0">
                                  #{ch.challenge_id}
                                </span>
                                <span className="font-semibold text-[#111317] truncate">
                                  {ch.title}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <Badge variant={diffMeta.variant}>{ch.difficulty}</Badge>
                            </td>
                            <td className="py-2 px-3 w-48">
                              <div className="space-y-1">
                                <div className="h-2 w-full rounded-full bg-[#EAE4D7] overflow-hidden flex border border-[#111317]/10">
                                  <div
                                    className="h-full bg-[#C81E1E]"
                                    style={{ width: `${totalEvents > 0 ? Math.max(redPct, counts.attempts ? 8 : 0) : 0}%` }}
                                  />
                                  <div
                                    className="h-full bg-[#1D4ED8]"
                                    style={{ width: `${totalEvents > 0 ? Math.max(bluePct, counts.defenses ? 8 : 0) : 0}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#4B5260]">
                                  <span className="text-[#C81E1E] font-semibold">{counts.attempts} red</span>
                                  <span className="text-[#1D4ED8] font-semibold">{counts.defenses} blue</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-4 text-right whitespace-nowrap">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEditChallenge(ch)}
                              >
                                Inspect
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

              {challenges.length > 0 && (
                <div className="border-t border-[#111317]/15">
                  <PaginationBar
                    page={safeOverviewPage}
                    totalPages={overviewTotalPages}
                    totalItems={challenges.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setOverviewPage}
                    itemLabel="challenges"
                    className="border-0 rounded-none bg-[#EAE4D7]/35"
                  />
                </div>
              )}
            </SpotlightSurface>

            <SpotlightSurface
              accent="cobalt"
              padding="p-4"
              className="lg:col-span-5 flex flex-col lg:min-h-0 justify-between gap-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-[#111317]">Live Range Telemetry</h2>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoPoll}
                    onClick={() => setAutoPoll((prev) => !prev)}
                    className={[
                      'h-8 px-2.5 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
                      autoPoll
                        ? 'bg-[#047857]/12 text-[#047857] border-[#047857]/40'
                        : 'bg-[#F3EFE6] text-[#111317] border-[#111317]/20 hover:bg-[#EAE4D7]',
                    ].join(' ')}
                  >
                    <Lightning className="w-3.5 h-3.5" weight={autoPoll ? 'fill' : 'regular'} />
                    <span>Auto-Poll 15s</span>
                  </button>
                </div>

                {renderSignalDistributionSvg()}

                <div className="pt-1">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-[14px] font-bold text-[#111317]">Latest 6 Events</h3>
                    <span className="text-xs font-mono text-[#4B5260]">Click row to triage</span>
                  </div>

                  {loadingActivity ? (
                    <SkeletonRows rows={4} columns={3} />
                  ) : activity.length === 0 ? (
                    <div className="py-6 text-center text-[14px] text-[#4B5260] border border-[#111317]/15 rounded-md bg-[#F3EFE6]">
                      No live telemetry events recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#111317]/10 border border-[#111317]/15 rounded-md bg-[#F3EFE6]/60 overflow-hidden">
                      {activity.slice(0, 6).map((item) => {
                        const kindMeta = getKindMeta(item.kind);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedEventId(item.id);
                              setActiveTab('activity');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#EAE4D7] transition-colors flex items-center justify-between gap-2.5"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <Badge variant={kindMeta.variant}>{kindMeta.label}</Badge>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[#111317] truncate">
                                  {item.title}
                                </div>
                                <div className="text-xs text-[#4B5260] truncate">
                                  {item.actor}
                                  {item.challenge_title ? ` · ${item.challenge_title}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                              <span className="text-xs font-mono tabular-nums text-[#4B5260]">
                                {formatUtcTimeShort(item.timestamp)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#111317]/15 flex items-center justify-between gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('attackers')}>
                  Red Team ({attackers.length})
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('defenders')}>
                  Blue Team ({defenders.length})
                </Button>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('activity')}>
                  Full Log ({activity.length})
                </Button>
              </div>
            </SpotlightSurface>
          </div>
        </div>
      )}

      {/* 2. CHALLENGES (PAGINATED 8/PAGE WITH DARKROOM VECTOR PREVIEW) */}
      {activeTab === 'challenges' && (
        <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#111317] tracking-tight leading-tight">
                Challenge Arsenal
              </h1>
              <p className="text-[14px] text-[#4B5260] mt-0.5">
                Publish, tune, or retire DVWA vulnerability scenarios and reference vectors.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" loading={syncing} onClick={() => syncAll({ notify: true })}>
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                <span>Sync</span>
              </Button>
              <Button variant="primary" size="sm" onClick={openCreateChallenge}>
                <Plus className="w-4 h-4" weight="bold" />
                <span>Deploy Challenge</span>
              </Button>
            </div>
          </div>

          <div className="bg-[#FAF8F3] border border-[#111317]/15 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter challenges by difficulty">
              {['all', 'easy', 'medium', 'hard'].map((diff) => {
                const active = difficultyFilter === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => handleDifficultyFilterChange(diff)}
                    aria-pressed={active}
                    className={[
                      'h-8 px-3 rounded-md text-xs font-semibold border capitalize transition-colors',
                      active
                        ? 'bg-[#111317] text-[#FAF8F3] border-[#111317]'
                        : 'bg-[#F3EFE6] text-[#1C1F26] border-[#111317]/20 hover:bg-[#EAE4D7]',
                    ].join(' ')}
                  >
                    {diff === 'all' ? 'All Difficulties' : diff}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-[#111317]/20 bg-[#F3EFE6] p-0.5">
                <button
                  type="button"
                  onClick={() => setArsenalView('table')}
                  aria-pressed={arsenalView === 'table'}
                  className={[
                    'h-7 px-2.5 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
                    arsenalView === 'table'
                      ? 'bg-[#111317] text-[#FAF8F3]'
                      : 'text-[#4B5260] hover:text-[#111317]',
                  ].join(' ')}
                >
                  <Rows className="w-3.5 h-3.5" weight="regular" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArsenalView('grid')}
                  aria-pressed={arsenalView === 'grid'}
                  className={[
                    'h-7 px-2.5 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
                    arsenalView === 'grid'
                      ? 'bg-[#111317] text-[#FAF8F3]'
                      : 'text-[#4B5260] hover:text-[#111317]',
                  ].join(' ')}
                >
                  <SquaresFour className="w-3.5 h-3.5" weight="regular" />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 lg:min-h-0 flex flex-col justify-between gap-2.5">
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
                        handleSearchChange('');
                        handleDifficultyFilterChange('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={openCreateChallenge}>
                      <Plus className="w-4 h-4" weight="bold" />
                      <span>Deploy Challenge</span>
                    </Button>
                  )
                }
              />
            ) : arsenalView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {paginatedChallenges.map((ch) => {
                  const diffMeta = DIFFICULTY_META[(ch.difficulty || '').toLowerCase()] || {
                    variant: 'neutral',
                    points: 100,
                  };
                  return (
                    <SpotlightSurface
                      key={ch.challenge_id}
                      accent="brass"
                      padding="p-3.5"
                      className="flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-mono tabular-nums text-[#4B5260]">
                              #{ch.challenge_id} · {diffMeta.points} pts
                            </div>
                            <h2 className="text-[15px] font-bold text-[#111317] mt-0.5 truncate">
                              {ch.title}
                            </h2>
                          </div>
                          <Badge variant={diffMeta.variant}>{ch.difficulty}</Badge>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="neutral">{ch.vulnerability_type}</Badge>
                          <CopyChip value={ch.dvwa_page_ref} />
                        </div>

                        <div className="cf-darkroom px-2.5 py-2 rounded-md bg-[#0E1014] text-[#ECEFF4] border border-[#111317]/20 font-mono text-xs truncate">
                          {ch.reference_payload}
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-2 border-t border-[#111317]/10">
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
              <div className="bg-[#FAF8F3] border border-[#111317]/15 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#111317]/15 bg-[#EAE4D7]/55 text-xs font-bold text-[#4B5260]">
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">Title</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Difficulty</th>
                      <th className="py-2.5 px-4">DVWA Endpoint</th>
                      <th className="py-2.5 px-4">Reference Vector</th>
                      <th className="py-2.5 px-4 text-right">Inspector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111317]/10 text-[14px]">
                    {paginatedChallenges.map((ch) => {
                      const diffMeta = DIFFICULTY_META[(ch.difficulty || '').toLowerCase()] || {
                        variant: 'neutral',
                        points: 100,
                      };
                      return (
                        <tr key={ch.challenge_id} className="hover:bg-[#EAE4D7]/45 transition-colors">
                          <td className="py-2 px-4 font-mono tabular-nums text-xs font-semibold text-[#4B5260]">
                            #{ch.challenge_id}
                          </td>
                          <td className="py-2 px-4 font-bold text-[#111317] whitespace-nowrap">
                            {ch.title}
                          </td>
                          <td className="py-2 px-4">
                            <Badge variant="neutral">{ch.vulnerability_type}</Badge>
                          </td>
                          <td className="py-2 px-4">
                            <Badge variant={diffMeta.variant}>{ch.difficulty}</Badge>
                          </td>
                          <td className="py-2 px-4">
                            <CopyChip value={ch.dvwa_page_ref} />
                          </td>
                          <td className="py-2 px-4 max-w-[240px]">
                            <div className="cf-darkroom px-2.5 py-1 rounded bg-[#0E1014] text-[#ECEFF4] font-mono text-xs truncate">
                              {ch.reference_payload}
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right whitespace-nowrap">
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

            {filteredChallenges.length > 0 && (
              <PaginationBar
                page={safeChallengesPage}
                totalPages={challengesTotalPages}
                totalItems={filteredChallenges.length}
                pageSize={PAGE_SIZE}
                onPageChange={setChallengesPage}
                itemLabel="challenges"
              />
            )}
          </div>
        </div>
      )}

      {/* 3. RED TEAM & BLUE TEAM */}
      {activeTab === 'attackers' && renderTeamRoster('attacker')}
      {activeTab === 'defenders' && renderTeamRoster('defender')}

      {/* 4. ACTIVITY LOG (PAGINATED 8/PAGE + DARKROOM PAYLOAD INSPECTOR) */}
      {activeTab === 'activity' && (
        <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-[#111317] tracking-tight leading-tight">
                Activity Log &amp; SOC Triage
              </h1>
              <p className="text-[14px] text-[#4B5260] mt-0.5">
                Inspect Red Team payloads, Blue Team patches, and security alerts with authenticated CSV export.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={autoPoll}
                onClick={() => setAutoPoll((prev) => !prev)}
                className={[
                  'h-9 px-3 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
                  autoPoll
                    ? 'bg-[#047857]/12 text-[#047857] border-[#047857]/40'
                    : 'bg-[#FAF8F3] text-[#111317] border-[#111317]/25 hover:bg-[#EAE4D7]',
                ].join(' ')}
              >
                <Lightning className="w-4 h-4" weight={autoPoll ? 'fill' : 'regular'} />
                <span>Auto-Poll 15s</span>
              </button>
              <Button variant="secondary" size="sm" loading={syncing} onClick={() => syncAll({ notify: true })}>
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                <span>Force Sync</span>
              </Button>
              <Button variant="primary" size="sm" loading={exportingCsv} onClick={triggerCsvExport}>
                <DownloadSimple className="w-4 h-4" weight="bold" />
                <span>{exportingCsv ? 'Exporting...' : 'Export Audit CSV'}</span>
              </Button>
            </div>
          </div>

          <div className="bg-[#FAF8F3] border border-[#111317]/15 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by signal type">
              {EVENT_TYPE_FILTERS.map((opt) => {
                const active = eventTypeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleEventTypeFilterChange(opt.id)}
                    aria-pressed={active}
                    className={[
                      'h-8 px-3 rounded-md text-xs font-semibold border transition-colors',
                      active
                        ? 'bg-[#111317] text-[#FAF8F3] border-[#111317]'
                        : 'bg-[#F3EFE6] text-[#1C1F26] border-[#111317]/20 hover:bg-[#EAE4D7]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 min-w-0 sm:w-64">
              <Select
                aria-label="Filter activity by challenge"
                value={challengeFilter}
                onChange={(e) => handleChallengeFilterChange(e.target.value)}
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
              className="shrink-0"
            />
          )}

          <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 flex flex-col lg:min-h-0 justify-between gap-2.5">
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
                          handleEventTypeFilterChange('all');
                          handleChallengeFilterChange('');
                          handleSearchChange('');
                        }}
                      >
                        Reset Filters
                      </Button>
                    )
                  }
                />
              ) : (
                <div className="bg-[#FAF8F3] border border-[#111317]/15 rounded-lg divide-y divide-[#111317]/10 overflow-hidden">
                  {paginatedActivity.map((item) => {
                    const kindMeta = getKindMeta(item.kind);
                    const isSelected = selectedEvent?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEventId(item.id)}
                        className={[
                          'w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition-colors',
                          isSelected ? 'bg-[#EAE4D7]' : 'hover:bg-[#EAE4D7]/45',
                        ].join(' ')}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: kindMeta.color }}
                          />
                          <Badge variant={kindMeta.variant}>{kindMeta.label}</Badge>
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold text-[#111317] truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-[#4B5260] truncate">
                              Actor: <span className="font-semibold text-[#1C1F26]">{item.actor}</span>
                              {item.challenge_title ? ` · ${item.challenge_title}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          <span className="text-xs font-mono tabular-nums text-[#4B5260] whitespace-nowrap">
                            {formatUtcTimeShort(item.timestamp)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activity.length > 0 && (
                <PaginationBar
                  page={safeActivityPage}
                  totalPages={activityTotalPages}
                  totalItems={activity.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setActivityPage}
                  itemLabel="events"
                />
              )}
            </div>

            <SpotlightSurface
              accent="brass"
              padding="p-4"
              className="lg:col-span-5 flex flex-col justify-between gap-3"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#111317]/15">
                  <h2 className="text-base font-bold text-[#111317]">Event Detail Inspector</h2>
                  {selectedEvent && (
                    <span className="text-xs font-mono tabular-nums text-[#4B5260]">
                      {selectedEvent.id}
                    </span>
                  )}
                </div>

                {!selectedEvent ? (
                  <div className="py-12 text-center text-[14px] text-[#4B5260]">
                    Select any event from the stream to inspect payload and telemetry details.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={getKindMeta(selectedEvent.kind).variant}>
                          {getKindMeta(selectedEvent.kind).label}
                        </Badge>
                        <Badge variant={getStatusVariant(selectedEvent.status)}>
                          {selectedEvent.status}
                        </Badge>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#4B5260]">
                        {formatUtcTimestamp(selectedEvent.timestamp)}
                      </span>
                    </div>

                    <div>
                      <div className="text-lg font-bold text-[#111317]">{selectedEvent.title}</div>
                      <div className="text-[14px] text-[#4B5260] mt-0.5">
                        Actor: <span className="text-[#111317] font-semibold">{selectedEvent.actor}</span>
                        {selectedEvent.challenge_title && (
                          <span> · Target: {selectedEvent.challenge_title}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#4B5260]">
                          Payload / Telemetry Message
                        </span>
                        <CopyChip value={selectedEvent.subtitle} label="Copy payload" />
                      </div>
                      <pre className="cf-darkroom p-3.5 rounded-md bg-[#0E1014] text-[#ECEFF4] border border-[#111317]/20 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                        {selectedEvent.subtitle}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {selectedEvent?.challenge_id && (
                <div className="pt-3 border-t border-[#111317]/15 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono tabular-nums text-[#4B5260]">
                    Challenge #{selectedEvent.challenge_id}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => inspectTargetChallengeById(selectedEvent.challenge_id)}
                  >
                    <Target className="w-4 h-4" weight="bold" />
                    <span>Inspect in Challenges</span>
                  </Button>
                </div>
              )}
            </SpotlightSurface>
          </div>
        </div>
      )}

      {/* 5. PROFILE & SETTINGS */}
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
                  <Trash className="w-4 h-4" weight="regular" />
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
        <div className="space-y-4">
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
                className="font-mono text-[14px]"
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
                className="cf-darkroom bg-[#0E1014] text-[#ECEFF4] placeholder:text-[#9CA3AF] font-mono text-[13px] border-[#111317]"
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
            <div className="p-3.5 rounded-lg bg-[#C81E1E]/[0.07] border border-[#C81E1E]/35 space-y-3">
              <div className="flex items-start gap-2 text-[13px] text-[#1C1F26] leading-relaxed">
                <Warning className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" weight="bold" />
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
                  <Trash className="w-4 h-4" weight="regular" />
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
        <div className="space-y-4">
          {operatorError && (
            <AlertBanner
              variant="error"
              message={operatorError}
              onDismiss={() => setOperatorError('')}
            />
          )}

          {operatorInspector.mode === 'edit' && operatorInspector.record && (
            <div className="grid grid-cols-2 divide-x divide-[#111317]/15 border border-[#111317]/15 rounded-lg bg-[#F3EFE6]">
              <div className="p-3">
                <div className="text-xs font-semibold text-[#4B5260]">{activeTeamCfg.countLabel}</div>
                <div className="font-display text-2xl font-extrabold tabular-nums text-[#111317] mt-0.5">
                  {operatorInspector.record[activeTeamCfg.countKey] ?? 0}
                </div>
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-[#4B5260]">Total Score</div>
                <div
                  className="font-display text-2xl font-extrabold tabular-nums mt-0.5"
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
                  ? 'Leave blank to keep existing password (10–72 UTF-8 bytes if changed).'
                  : '10 to 72 UTF-8 bytes with a letter and number/symbol, hashed with bcrypt.'
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
                    : 'Minimum 10 characters'
                }
                disabled={savingOperator}
                required={operatorInspector.mode === 'create'}
              />
            </Field>
          </form>

          {operatorInspector.mode === 'edit' && confirmDeleteOperator && (
            <div className="p-3.5 rounded-lg bg-[#C81E1E]/[0.07] border border-[#C81E1E]/35 space-y-3">
              <div className="flex items-start gap-2 text-[13px] text-[#1C1F26] leading-relaxed">
                <Warning className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" weight="bold" />
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
