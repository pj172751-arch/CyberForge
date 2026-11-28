import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  Compass,
  Cube,
  Gear,
  Globe,
  Lightning,
  LockKey,
  ShieldCheck,
  ShieldWarning,
  SlidersHorizontal,
  Trophy,
  User,
  Warning,
} from '@phosphor-icons/react';
import { apiFetch } from '../../utils/api';
import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  SkeletonRows,
} from '../ui/primitives';
import {
  CopyChip,
  PacketBeam,
  PaginationBar,
  SlideOverInspector,
  TactileToast,
  VerdictStamp,
} from '../ui/spells';
import { KineticTitleRoll } from '../ui/kinetic';
import CommandDeckShell from './CommandDeckShell';
import { ProfileView, SettingsView } from './AccountViews';
import {
  HttpWireInspector,
  LiveSinkVisualizer,
  MissionRibbon,
  SinkCodeViewer,
} from './LabVisualizer';
import LearningPathMap from './LearningPathMap';

const SECURITY_LEVELS = [
  {
    value: 'low',
    label: 'Low',
    badge: 'red',
    description: 'Baseline handler with minimal input checks or output escaping.',
  },
  {
    value: 'medium',
    label: 'Medium',
    badge: 'amber',
    description: 'Partial blocklist filtering and basic sanitization prior to execution.',
  },
  {
    value: 'high',
    label: 'High',
    badge: 'cobalt',
    description: 'Strict server-side validation, tighter type checks, and anti-CSRF controls.',
  },
  {
    value: 'impossible',
    label: 'Impossible',
    badge: 'green',
    description: 'Parameterized queries, explicit allowlists, and defense-in-depth hardening.',
  },
];

const SOURCE_TIERS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
  { id: 'impossible', label: 'Impossible' },
];

const DIFFICULTY_VARIANT = {
  easy: 'green',
  medium: 'amber',
  hard: 'red',
};

const LEVEL_BADGE_VARIANT = {
  low: 'red',
  medium: 'amber',
  high: 'cobalt',
  impossible: 'green',
};

const HARDENING_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'unverified', label: 'Unverified' },
  { id: 'verified', label: 'Verified' },
];

const DEFENSE_VERIFIED_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'unverified', label: 'Unverified' },
];

const ALERT_TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'EXPLOIT', label: 'Exploits' },
  { id: 'DEFENSE', label: 'Defenses' },
  { id: 'RECON', label: 'Recon' },
];

const PAGE_SIZE = 8;

const REMEDIATION_PLAYBOOKS = [
  {
    match: ['sql'],
    bullets: [
      'Bind user parameters with prepared statements (PDO / parameterized queries) instead of interpolating strings into SQL.',
      'Enforce strict integer/allowlist casting and suppress raw database error output in production responses.',
    ],
  },
  {
    match: ['xss', 'cross-site scripting'],
    bullets: [
      'Apply context-aware HTML/attribute/JS output encoding (e.g., htmlspecialchars with ENT_QUOTES) before rendering user input.',
      'Deploy a restrictive Content-Security-Policy (CSP) and HttpOnly session cookies to block inline script execution.',
    ],
  },
  {
    match: ['command', 'exec', 'rce'],
    bullets: [
      'Avoid invoking shell interpreters; pass validated arguments directly to native APIs or sanitize with escapeshellarg.',
      'Enforce strict IP/hostname allowlist regex validation and drop shell metacharacters (;, &, |, backticks).',
    ],
  },
  {
    match: ['csrf', 'forgery'],
    bullets: [
      'Require unpredictable per-session anti-CSRF synchronizer tokens on every state-changing form and validate server-side.',
      'Set SameSite=Strict/Lax on session cookies and verify current credentials for sensitive account mutations.',
    ],
  },
  {
    match: ['inclusion', 'traversal', 'lfi'],
    bullets: [
      'Replace dynamic file path parameters with an explicit server-side allowlist mapping IDs to fixed template files.',
      'Canonicalize paths, block directory traversal sequences, and disable allow_url_include in PHP configuration.',
    ],
  },
  {
    match: ['upload'],
    bullets: [
      'Validate file MIME magic bytes and image dimensions server-side instead of trusting Content-Type or extensions.',
      'Rename uploaded files to random hashes and store them outside executable web roots.',
    ],
  },
  {
    match: ['brute', 'auth', 'captcha'],
    bullets: [
      'Enforce per-account/IP rate limiting, progressive backoff, and anti-CSRF tokens on login handlers.',
      'Protect authentication flows with CAPTCHA challenges and parameterized credential lookups.',
    ],
  },
  {
    match: ['session'],
    bullets: [
      'Generate cryptographically random session identifiers instead of predictable sequential integers or hashes.',
      'Bind cookies with HttpOnly, Secure, and SameSite flags and rotate session IDs on privilege boundaries.',
    ],
  },
  {
    match: ['csp', 'bypass', 'javascript'],
    bullets: [
      'Eliminate unsafe-inline and overly broad script whitelist domains in Content-Security-Policy headers.',
      'Enforce server-side integrity validation instead of relying on client-side tokens or predictable nonces.',
    ],
  },
];

function getRemediationGuidance(vulnerabilityType) {
  const normalized = (vulnerabilityType || '').toLowerCase();
  const matched = REMEDIATION_PLAYBOOKS.find((entry) =>
    entry.match.some((keyword) => normalized.includes(keyword))
  );
  if (matched) return matched.bullets;
  return [
    'Enforce strict server-side input validation with explicit type checks and allowlists.',
    'Raise DVWA security to High or Impossible and verify that the reference attack vector is blocked.',
  ];
}

function getDifficultyVariant(difficulty) {
  return DIFFICULTY_VARIANT[(difficulty || '').trim().toLowerCase()] || 'neutral';
}

function getLevelBadgeVariant(level) {
  return LEVEL_BADGE_VARIANT[(level || '').trim().toLowerCase()] || 'neutral';
}

function getAlertBadgeVariant(alertType) {
  const upper = String(alertType || '').toUpperCase();
  if (upper.includes('EXPLOIT') || upper.includes('RECON')) return 'red';
  if (upper.includes('DEFENSE') || upper.includes('VERIFIED')) return 'green';
  return 'amber';
}

function formatDvwaUrl(pageRef) {
  const cleanRef = String(pageRef || '').replace(/^\/+/, '');
  return `http://localhost:8081/${cleanRef}`;
}

function formatUtcTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

let nextDefenderToastId = 0;

function findInitialTarget(challengeList, defenseList) {
  if (!Array.isArray(challengeList) || challengeList.length === 0) return null;
  const verifiedIds = new Set(
    (defenseList || []).filter((item) => item.verified).map((item) => item.challenge_id)
  );
  return challengeList.find((ch) => !verifiedIds.has(ch.challenge_id)) || challengeList[0];
}

function initialLevelForChallenge(challengeId, defenseList) {
  const latest = (defenseList || []).find((d) => d.challenge_id === challengeId);
  return latest?.security_level_applied || 'low';
}

export default function DefenderConsole({
  user,
  onSignOut,
  onOpenOverview,
  onTriggerTransition,
  initialChallengeId = null,
  onConsumeInitialChallenge,
}) {
  const defenderId = user?.id;

  const [activeTab, setActiveTab] = useState('paths');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [defenseVerifiedFilter, setDefenseVerifiedFilter] = useState('all');
  const [defenseLevelFilter, setDefenseLevelFilter] = useState('all');
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [defensesPage, setDefensesPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);

  const [tracks, setTracks] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(defenderId));
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [leftSubTab, setLeftSubTab] = useState('remediate');
  const [rightSubTab, setRightSubTab] = useState('source');
  const [sourceTier, setSourceTier] = useState('low');
  const [diagnosedLine, setDiagnosedLine] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [sourceState, setSourceState] = useState({ challengeId: null, data: null });
  const [selectedPatchOptionId, setSelectedPatchOptionId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('low');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [inspectedDefense, setInspectedDefense] = useState(null);
  const [inspectedAlert, setInspectedAlert] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!selectedChallengeId) return undefined;

    const controller = new AbortController();

    apiFetch(`/api/challenges/${selectedChallengeId}/source`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSourceState({ challengeId: selectedChallengeId, data: data || null });
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        setSourceState({ challengeId: selectedChallengeId, data: null });
      });

    return () => controller.abort();
  }, [selectedChallengeId]);

  const sourceLoading =
    Boolean(selectedChallengeId) && sourceState.challengeId !== selectedChallengeId;
  const challengeSource =
    selectedChallengeId && sourceState.challengeId === selectedChallengeId ? sourceState.data : null;

  const pushToast = useCallback((variant, title, message) => {
    nextDefenderToastId += 1;
    const id = `def-toast-${nextDefenderToastId}`;
    setToasts((prev) => [...prev, { id, variant, title, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!defenderId) return undefined;
    let cancelled = false;

    async function fetchInitial() {
      try {
        const [challengeList, defenseList, trackList, alertList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/defenses?defender_id=${encodeURIComponent(defenderId)}`),
          apiFetch('/api/tracks').catch(() => []),
          apiFetch('/api/alerts?limit=100').catch(() => []),
        ]);
        if (!cancelled) {
          const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
          const nextDefenses = Array.isArray(defenseList) ? defenseList : [];
          setTracks(Array.isArray(trackList) ? trackList : []);
          setAlerts(Array.isArray(alertList) ? alertList : []);
          setChallenges(nextChallenges);
          setDefenses(nextDefenses);
          const initialTarget = findInitialTarget(nextChallenges, nextDefenses);
          if (initialTarget) {
            setSelectedChallengeId((prev) => prev ?? initialTarget.challenge_id);
            setSelectedLevel(initialLevelForChallenge(initialTarget.challenge_id, nextDefenses));
          }
          setLoadError('');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Unable to load assigned challenges and defenses.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [defenderId]);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!defenderId) return;
      setRefreshing(true);
      setLoadError('');
      try {
        const [challengeList, defenseList, trackList, alertList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/defenses?defender_id=${encodeURIComponent(defenderId)}`),
          apiFetch('/api/tracks').catch(() => []),
          apiFetch('/api/alerts?limit=100').catch(() => []),
        ]);
        const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
        const nextDefenses = Array.isArray(defenseList) ? defenseList : [];
        setTracks(Array.isArray(trackList) ? trackList : []);
        setAlerts(Array.isArray(alertList) ? alertList : []);
        setChallenges(nextChallenges);
        setDefenses(nextDefenses);
        setSelectedChallengeId((prev) => {
          if (prev && nextChallenges.some((ch) => ch.challenge_id === prev)) return prev;
          return findInitialTarget(nextChallenges, nextDefenses)?.challenge_id ?? null;
        });
        if (!silent) {
          pushToast('info', 'Posture synced', 'Loaded latest DVWA targets, defenses, and SOC alerts.');
        }
      } catch (err) {
        setLoadError(err.message || 'Unable to load assigned challenges and defenses.');
      } finally {
        setRefreshing(false);
      }
    },
    [defenderId, pushToast]
  );

  const defenseSummaryByChallenge = useMemo(() => {
    const map = new Map();
    for (const def of defenses) {
      const prev = map.get(def.challenge_id);
      if (!prev) {
        map.set(def.challenge_id, {
          count: 1,
          verified: Boolean(def.verified),
          latest: def,
        });
      } else {
        map.set(def.challenge_id, {
          count: prev.count + 1,
          verified: prev.verified || Boolean(def.verified),
          latest: prev.latest,
        });
      }
    }
    return map;
  }, [defenses]);

  const selectChallenge = useCallback(
    (challenge) => {
      if (!challenge) return;
      const summary = defenseSummaryByChallenge.get(challenge.challenge_id);
      const current = summary?.latest?.security_level_applied;
      setActiveTab('remediate');
      setLeftSubTab('remediate');
      setRightSubTab('source');
      setSourceTier('low');
      setDiagnosedLine(null);
      setSelectedChallengeId(challenge.challenge_id);
      setSelectedLevel(current || 'low');
      setSelectedPatchOptionId(null);
      setSubmitError('');
      setLastResult(null);
    },
    [defenseSummaryByChallenge]
  );

  useEffect(() => {
    if (loading || initialChallengeId === null || initialChallengeId === undefined) return undefined;
    if (challenges.length === 0) return undefined;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const matched = challenges.find(
        (ch) => String(ch.challenge_id) === String(initialChallengeId)
      );
      if (matched) {
        selectChallenge(matched);
      }
      onConsumeInitialChallenge?.();
    });
    return () => {
      cancelled = true;
    };
  }, [loading, initialChallengeId, challenges, selectChallenge, onConsumeInitialChallenge]);

  const stats = useMemo(() => {
    let verifiedCount = 0;
    const tierCounts = { none: 0, low: 0, medium: 0, high: 0, impossible: 0 };

    for (const ch of challenges) {
      const summary = defenseSummaryByChallenge.get(ch.challenge_id);
      if (summary?.verified) verifiedCount += 1;
      const tier = (summary?.latest?.security_level_applied || 'none').toLowerCase();
      if (Object.hasOwn(tierCounts, tier)) {
        tierCounts[tier] += 1;
      } else {
        tierCounts.none += 1;
      }
    }

    const pendingCount = Math.max(0, challenges.length - verifiedCount);
    const totalScore = defenses.reduce((sum, item) => sum + (Number(item.score_earned) || 0), 0);
    const verifiedSubmissions = defenses.filter((item) => item.verified).length;
    const pctVerified = challenges.length > 0 ? Math.round((verifiedCount / challenges.length) * 100) : 0;

    return {
      assigned: challenges.length,
      verified: verifiedCount,
      pending: pendingCount,
      totalScore,
      verifiedSubmissions,
      unverifiedSubmissions: Math.max(0, defenses.length - verifiedSubmissions),
      pctVerified,
      tierCounts,
    };
  }, [challenges, defenses, defenseSummaryByChallenge]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const ch of challenges) {
      set.add((ch.vulnerability_type || 'Uncategorized').trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return challenges.filter((ch) => {
      const summary = defenseSummaryByChallenge.get(ch.challenge_id);
      const currentLevel = (summary?.latest?.security_level_applied || 'none').toLowerCase();

      if (categoryFilter !== 'all' && (ch.vulnerability_type || '').trim() !== categoryFilter) {
        return false;
      }
      if (levelFilter !== 'all' && currentLevel !== levelFilter) {
        return false;
      }
      if (statusFilter === 'verified' && !summary?.verified) return false;
      if (statusFilter === 'unverified' && (!summary || summary.verified)) return false;
      if (statusFilter === 'pending' && summary?.count > 0) return false;

      if (!q) return true;
      return (
        (ch.title || '').toLowerCase().includes(q) ||
        (ch.vulnerability_type || '').toLowerCase().includes(q) ||
        (ch.difficulty || '').toLowerCase().includes(q) ||
        (ch.dvwa_page_ref || '').toLowerCase().includes(q) ||
        currentLevel.includes(q)
      );
    });
  }, [challenges, categoryFilter, levelFilter, statusFilter, searchQuery, defenseSummaryByChallenge]);

  const filteredDefenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return defenses.filter((item) => {
      if (defenseVerifiedFilter === 'verified' && !item.verified) return false;
      if (defenseVerifiedFilter === 'unverified' && item.verified) return false;
      if (
        defenseLevelFilter !== 'all' &&
        (item.security_level_applied || '').toLowerCase() !== defenseLevelFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (item.challenge_title || '').toLowerCase().includes(q) ||
        (item.security_level_applied || '').toLowerCase().includes(q) ||
        String(item.defense_id).includes(q)
      );
    });
  }, [defenses, defenseVerifiedFilter, defenseLevelFilter, searchQuery]);

  const filteredAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alerts.filter((al) => {
      const typeUpper = String(al.alert_type || '').toUpperCase();
      if (alertTypeFilter !== 'all' && !typeUpper.includes(alertTypeFilter)) {
        return false;
      }
      if (!q) return true;
      const targetCh = challenges.find((ch) => ch.challenge_id === al.challenge_id);
      return (
        (al.alert_type || '').toLowerCase().includes(q) ||
        (al.message || '').toLowerCase().includes(q) ||
        (targetCh?.title || '').toLowerCase().includes(q) ||
        String(al.alert_id).includes(q)
      );
    });
  }, [alerts, alertTypeFilter, searchQuery, challenges]);

  const totalDefensePages = Math.max(1, Math.ceil(filteredDefenses.length / PAGE_SIZE));
  const safeDefensePage = Math.min(Math.max(1, defensesPage), totalDefensePages);
  const pagedDefenses = useMemo(() => {
    const start = (safeDefensePage - 1) * PAGE_SIZE;
    return filteredDefenses.slice(start, start + PAGE_SIZE);
  }, [filteredDefenses, safeDefensePage]);

  const totalAlertPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const safeAlertPage = Math.min(Math.max(1, alertsPage), totalAlertPages);
  const pagedAlerts = useMemo(() => {
    const start = (safeAlertPage - 1) * PAGE_SIZE;
    return filteredAlerts.slice(start, start + PAGE_SIZE);
  }, [filteredAlerts, safeAlertPage]);

  const selectedChallenge = useMemo(
    () => challenges.find((ch) => ch.challenge_id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );

  const handleSelectNextPending = useCallback(() => {
    if (challenges.length === 0) return;
    const nextPending =
      challenges.find((ch) => !defenseSummaryByChallenge.get(ch.challenge_id)?.verified) ||
      challenges[0];
    selectChallenge(nextPending);
  }, [challenges, defenseSummaryByChallenge, selectChallenge]);

  function resetTargetFilters() {
    setCategoryFilter('all');
    setLevelFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  }

  async function submitDefenseLevel(levelToApply) {
    if (!selectedChallenge || !defenderId || submitting) return;
    const targetLevel = levelToApply || selectedLevel;

    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await apiFetch('/api/defenses', {
        method: 'POST',
        body: {
          defender_id: defenderId,
          challenge_id: selectedChallenge.challenge_id,
          security_level_applied: targetLevel,
          patch_option_id: selectedPatchOptionId || null,
        },
      });
      setLastResult(response);
      setDefenses((prev) => [response, ...prev]);
      setLeftSubTab('remediate');
      if (response.verified) {
        pushToast(
          'success',
          `Patch verified (+${response.score_earned} pts)`,
          `${selectedChallenge.title} hardened to ${response.security_level_applied}.`
        );
      } else {
        pushToast(
          'info',
          `Tier '${response.security_level_applied}' active (+${response.score_earned} pts)`,
          'Replay exploit still succeeded. Escalate to High or Impossible and verify.'
        );
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to apply defense configuration.');
      pushToast('error', 'Defense failed', err.message || 'Unable to apply security tier.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmitDefense(event) {
    if (event) event.preventDefault();
    submitDefenseLevel(selectedLevel);
  }

  const navItems = useMemo(
    () => [
      {
        id: 'paths',
        label: 'Tracks',
        icon: Compass,
        badge: `${stats.verified}/${stats.assigned}`,
      },
      {
        id: 'remediate',
        label: 'Remediate',
        icon: ShieldCheck,
        badge: `${stats.verified}/${stats.assigned}`,
      },
      {
        id: 'defenses',
        label: 'Defenses',
        icon: ClockCounterClockwise,
        badge: defenses.length,
      },
      {
        id: 'alerts',
        label: 'Alerts',
        icon: Warning,
        badge: alerts.length,
      },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [stats.verified, stats.assigned, defenses.length, alerts.length]
  );

  const commandGroups = useMemo(() => {
    const viewItems = [
      ...navItems.map((item, idx) => ({
        id: `nav-${item.id}`,
        label: item.label,
        hint: `Switch to ${item.label}`,
        shortcut: String(idx + 1),
        icon: item.icon,
        onSelect: () => setActiveTab(item.id),
      })),
      {
        id: 'nav-profile',
        label: 'Profile',
        hint: 'Inspect operator identity and rotate password',
        icon: User,
        onSelect: () => setActiveTab('profile'),
      },
    ];

    const actionItems = [
      {
        id: 'action-next-pending',
        label: 'Harden Next Pending Target',
        hint: 'Jump to next unverified module in Remediate Studio',
        icon: ShieldWarning,
        onSelect: handleSelectNextPending,
      },
      {
        id: 'action-dvwa-security',
        label: 'Open DVWA Security Settings',
        hint: 'Launch http://localhost:8081/security.php in a new tab',
        icon: LockKey,
        onSelect: () => window.open('http://localhost:8081/security.php', '_blank', 'noopener,noreferrer'),
      },
      {
        id: 'action-refresh',
        label: 'Refresh Range Telemetry',
        hint: 'Reload challenges, defenses, and alerts from PostgreSQL',
        icon: ArrowsClockwise,
        onSelect: () => loadData(),
      },
      ...(typeof onOpenOverview === 'function'
        ? [
            {
              id: 'action-overview',
              label: 'Open 3D Range Hub',
              hint: 'Launch visual 3D curriculum hub',
              icon: Cube,
              onSelect: onOpenOverview,
            },
          ]
        : []),
    ];

    const targetItems = challenges.map((ch) => {
      const current = defenseSummaryByChallenge.get(ch.challenge_id)?.latest?.security_level_applied;
      return {
        id: `target-${ch.challenge_id}`,
        label: ch.title,
        hint: `${ch.vulnerability_type} · Current: ${current || 'none'}`,
        icon: ShieldCheck,
        onSelect: () => selectChallenge(ch),
      };
    });

    return [
      { heading: 'Console Views', items: viewItems },
      { heading: 'Quick Actions', items: actionItems },
      { heading: 'Assigned Targets', items: targetItems },
    ];
  }, [
    navItems,
    challenges,
    defenseSummaryByChallenge,
    handleSelectNextPending,
    loadData,
    onOpenOverview,
    selectChallenge,
  ]);

  const profileStats = [
    {
      label: 'Assigned',
      value: stats.assigned,
      detail: `${categories.length} vulnerability classes`,
      icon: ShieldCheck,
    },
    {
      label: 'Verified',
      value: stats.verified,
      detail: `${stats.pctVerified}% hardened`,
      icon: CheckCircle,
      accent: 'green',
    },
    {
      label: 'Pending',
      value: stats.pending,
      detail: 'Awaiting verified remediation',
      icon: ShieldWarning,
      accent: 'amber',
    },
    {
      label: 'Total Score',
      value: stats.totalScore,
      detail: '150 pts per verified fix',
      icon: Trophy,
      accent: 'blue',
    },
  ];

  const hasActiveTargetFilters =
    categoryFilter !== 'all' ||
    levelFilter !== 'all' ||
    statusFilter !== 'all' ||
    Boolean(searchQuery);

  const searchPlaceholder =
    activeTab === 'defenses'
      ? 'Filter defenses by challenge or security tier...'
      : activeTab === 'alerts'
        ? 'Filter SOC alerts by message, type, or module...'
        : 'Search assigned targets by title, class, or tier...';

  function renderRemediateStudioTab() {
    const activeSummary = selectedChallenge
      ? defenseSummaryByChallenge.get(selectedChallenge.challenge_id)
      : null;
    const currentApplied = activeSummary?.latest?.security_level_applied || null;
    const activeUrl = selectedChallenge ? formatDvwaUrl(selectedChallenge.dvwa_page_ref) : '';
    const displayedResult =
      lastResult && selectedChallenge && lastResult.challenge_id === selectedChallenge.challenge_id
        ? lastResult
        : null;
    const guidance = selectedChallenge
      ? getRemediationGuidance(selectedChallenge.vulnerability_type)
      : [];
    const patchQuiz = challengeSource?.patch_quiz;
    const patchOptions = Array.isArray(patchQuiz?.options) ? patchQuiz.options : [];
    const hasPatchQuiz = patchOptions.length > 0;
    const selectedPatchOption =
      patchOptions.find((opt) => opt.id === selectedPatchOptionId) || null;
    const activeLevelMeta =
      SECURITY_LEVELS.find((lvl) => lvl.value === selectedLevel) || SECURITY_LEVELS[0];
    const vulnerableLines = Array.isArray(challengeSource?.vulnerable_lines)
      ? challengeSource.vulnerable_lines
      : [];
    const afterLevel =
      displayedResult?.dvwa_security_level ||
      displayedResult?.security_level_applied ||
      selectedLevel;
    const beforeExploited = displayedResult?.baseline_before
      ? Boolean(displayedResult.baseline_before.exploited)
      : true;
    const activePhpCode = challengeSource?.source_available
      ? challengeSource?.sources_by_tier?.[sourceTier] ||
        (sourceTier === 'low' ? challengeSource?.vulnerable_code : '') ||
        (sourceTier === 'impossible' ? challengeSource?.hardened_code : '')
      : '';
    const socIncidents = alerts
      .filter((al) => {
        if (!selectedChallenge) return true;
        return al.challenge_id === selectedChallenge.challenge_id || String(al.alert_type || '').toUpperCase().includes('EXPLOIT');
      })
      .slice(0, 6);

    return (
      <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
        {loadError && (
          <AlertBanner
            variant="error"
            message={loadError}
            onDismiss={() => setLoadError('')}
            className="shrink-0"
          />
        )}

        <MissionRibbon
          role="defender"
          challenges={challenges}
          selectedId={selectedChallengeId}
          onSelect={(ch) => selectChallenge(ch)}
          summaryMap={defenseSummaryByChallenge}
          stats={stats}
          onOpenCatalog={() => setCatalogOpen(true)}
          onOpenTour={onOpenOverview}
          onNextTarget={handleSelectNextPending}
          onRefresh={() => loadData()}
          refreshing={refreshing}
          extraActions={
            <a
              href="http://localhost:8081/security.php"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-9 px-2.5 rounded-md bg-[#FAF8F3] hover:bg-[#EAE4D7] border border-[#111317]/25 text-[13px] font-semibold text-[#111317] items-center gap-1.5 transition-colors"
            >
              <span>DVWA Sec</span>
              <ArrowSquareOut className="w-3.5 h-3.5 text-[#1D4ED8]" weight="bold" />
            </a>
          }
        />

        {loading ? (
          <SkeletonRows rows={6} columns={4} />
        ) : !selectedChallenge ? (
          <EmptyState
            icon={ShieldCheck}
            title="Select an assigned target"
            description="Choose a challenge from the target ribbon or All Labs drawer to audit PHP code and verify hardening."
          />
        ) : (
          <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 50%: Warm Archival Drafting Deck */}
            <section className="lg:col-span-6 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg flex flex-col lg:min-h-0 overflow-hidden">
              {/* Target Header + 4-Tier Switcher + Set Live */}
              <div className="px-5 py-2.5 border-b border-[#111317]/15 shrink-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-[22px] sm:text-[24px] font-bold text-[#111317] leading-tight">
                        <KineticTitleRoll
                          text={selectedChallenge.title}
                          triggerKey={`${selectedChallenge.challenge_id}-${selectedLevel}`}
                          role="defender"
                        />
                      </h1>
                      <Badge variant={getDifficultyVariant(selectedChallenge.difficulty)}>
                        {selectedChallenge.difficulty}
                      </Badge>
                      {activeSummary?.verified ? (
                        <Badge variant="green">
                          <CheckCircle className="w-3.5 h-3.5" weight="bold" />
                          VERIFIED
                        </Badge>
                      ) : currentApplied ? (
                        <Badge variant={getLevelBadgeVariant(currentApplied)}>
                          Tier: {currentApplied}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[13.5px] text-[#4B5260]">
                      <span className="font-editorial italic text-[16px] text-[#111317] leading-none">
                        {selectedChallenge.vulnerability_type}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-[#1E40AF]">+150 XP verified</span>
                      {challengeSource?.owasp_category && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-xs text-[#111317]">
                            {challengeSource.owasp_category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <CopyChip value={activeUrl} label={selectedChallenge.dvwa_page_ref} />
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded bg-[#EAE4D7]/80 hover:bg-[#EAE4D7] border border-[#111317]/20 text-xs font-semibold text-[#111317] transition-colors"
                    >
                      <span>DVWA</span>
                      <ArrowSquareOut className="w-3.5 h-3.5 text-[#1D4ED8]" weight="bold" />
                    </a>
                  </div>
                </div>

                {/* Tier Switcher: Low | Medium | High | Impossible + Set Live */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div
                    role="radiogroup"
                    aria-label="Target DVWA security level"
                    className="inline-flex flex-wrap items-center p-0.5 rounded-md bg-[#EAE4D7] border border-[#111317]/15"
                  >
                    {SECURITY_LEVELS.map((lvl) => {
                      const active = selectedLevel === lvl.value;
                      return (
                        <button
                          key={lvl.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setSelectedLevel(lvl.value);
                            setSourceTier(lvl.value);
                          }}
                          className={[
                            'px-2.5 py-1 rounded text-[13px] font-semibold transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]',
                            active
                              ? 'bg-[#1D4ED8] text-[#FAF8F3]'
                              : 'text-[#1C1F26] hover:bg-[#FAF8F3]/70',
                          ].join(' ')}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="defender"
                    size="sm"
                    loading={submitting}
                    onClick={() => submitDefenseLevel(selectedLevel)}
                  >
                    <ShieldCheck className="w-4 h-4" weight="bold" />
                    <span>{submitting ? 'Verifying...' : 'Set Live'}</span>
                  </Button>
                </div>
              </div>

              {/* 3 Clean Sub-Tabs: Remediate | Patch Audit Quiz | SOC Incidents */}
              <div
                role="tablist"
                aria-label="Defensive studio sections"
                className="px-5 border-b border-[#111317]/15 bg-[#EAE4D7]/35 flex items-center gap-2 shrink-0"
              >
                {[
                  { id: 'remediate', label: 'Remediate', icon: SlidersHorizontal },
                  { id: 'quiz', label: 'Patch Audit Quiz', icon: ShieldCheck },
                  {
                    id: 'incidents',
                    label: 'SOC Incidents',
                    icon: Warning,
                    badge: socIncidents.length,
                  },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const active = leftSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setLeftSubTab(tab.id)}
                      className={[
                        'py-2 px-2.5 inline-flex items-center gap-1.5 text-[14px] font-semibold border-b-2 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111317]',
                        active
                          ? 'border-[#1D4ED8] text-[#111317]'
                          : 'border-transparent text-[#4B5260] hover:text-[#111317]',
                      ].join(' ')}
                    >
                      <TabIcon className="w-4 h-4" weight={active ? 'fill' : 'regular'} />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#EAE4D7] border border-[#111317]/15 text-xs font-mono font-semibold text-[#111317] leading-none">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sub-Tab Content */}
              <div className="flex-1 lg:min-h-0 overflow-y-auto p-4">
                {leftSubTab === 'remediate' && (
                  <div className="flex flex-col gap-2.5">
                    <form onSubmit={handleSubmitDefense} className="space-y-2.5">
                      {submitError && (
                        <AlertBanner
                          variant="error"
                          message={submitError}
                          onDismiss={() => setSubmitError('')}
                        />
                      )}

                      <div className="p-3 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[15px] font-bold text-[#111317]">
                            Selected Security Posture: {activeLevelMeta.label}
                          </span>
                          <Badge variant={activeLevelMeta.badge}>{activeLevelMeta.label}</Badge>
                        </div>
                        <p className="text-[14px] text-[#1C1F26] leading-relaxed">
                          {activeLevelMeta.description}
                        </p>
                        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#4B5260]">
                          <span>
                            Transition: <strong className="text-[#111317]">{currentApplied || 'none'}</strong>{' '}
                            &rarr; <strong className="text-[#1D4ED8]">{selectedLevel}</strong>
                          </span>
                          {hasPatchQuiz && (
                            <button
                              type="button"
                              onClick={() => setLeftSubTab('quiz')}
                              className="font-sans text-[13px] font-semibold text-[#1D4ED8] hover:underline"
                            >
                              {selectedPatchOption
                                ? `Fix chosen: ${selectedPatchOption.label}`
                                : 'Pick code fix in Patch Audit Quiz ->'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setLeftSubTab('quiz')}
                        >
                          <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" weight="regular" />
                          <span>{hasPatchQuiz ? 'Patch Audit Quiz' : 'Guidance'}</span>
                        </Button>

                        <Button
                          type="submit"
                          variant="defender"
                          size="md"
                          loading={submitting}
                        >
                          <ShieldCheck className="w-4 h-4" weight="bold" />
                          <span>{submitting ? 'Replaying Exploit...' : 'Apply & Verify Replay'}</span>
                        </Button>
                      </div>
                    </form>

                    <PacketBeam
                      active={submitting}
                      accent="cobalt"
                      fromLabel={`Replay (${selectedLevel})`}
                      toLabel={selectedChallenge.dvwa_page_ref || 'DVWA :8081'}
                      statusText={
                        submitting
                          ? 'REPLAYING...'
                          : displayedResult
                            ? `HTTP ${displayedResult.dvwa_http_status ?? 200} · ${afterLevel.toUpperCase()}`
                            : 'READY'
                      }
                    />

                    {displayedResult ? (
                      <div className="p-3 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <VerdictStamp
                            status={displayedResult.verified ? 'patched' : 'blocked'}
                            label={displayedResult.verified ? 'PATCH VERIFIED' : 'STILL VULNERABLE'}
                            sublabel={`+${displayedResult.score_earned} PTS · ${afterLevel.toUpperCase()}`}
                          />

                          <div className="flex items-center gap-2 flex-wrap">
                            {displayedResult.patch_correct !== null &&
                              displayedResult.patch_correct !== undefined && (
                                <Badge variant={displayedResult.patch_correct ? 'green' : 'amber'}>
                                  {displayedResult.patch_correct
                                    ? 'Accurate Code Fix'
                                    : 'Suboptimal Fix'}
                                </Badge>
                              )}
                            {displayedResult.verified ? (
                              <Button
                                type="button"
                                variant="defender"
                                size="sm"
                                onClick={handleSelectNextPending}
                              >
                                <span>Next Target</span>
                                <ArrowRight className="w-4 h-4" weight="bold" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="defender"
                                size="sm"
                                onClick={() => {
                                  setSelectedLevel('impossible');
                                  setSourceTier('impossible');
                                  submitDefenseLevel('impossible');
                                }}
                              >
                                <span>Harden to Impossible</span>
                                <ArrowRight className="w-4 h-4" weight="bold" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="cf-darkroom rounded-md bg-[#0E1014] border border-[#111317] p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-[#ECEFF4] font-bold">BEFORE · low</span>
                              <span className={beforeExploited ? 'text-[#FCA5A5]' : 'text-[#A7F3D0]'}>
                                {beforeExploited ? 'BREACHED' : 'NEUTRALIZED'}
                              </span>
                            </div>
                            <pre className="font-mono text-xs text-[#D1D5DB] max-h-16 overflow-y-auto whitespace-pre-wrap break-words">
                              {displayedResult.baseline_before?.evidence
                                ? String(displayedResult.baseline_before.evidence)
                                : `Baseline vector succeeded: ${selectedChallenge.reference_payload || 'N/A'}`}
                            </pre>
                          </div>

                          <div className="cf-darkroom rounded-md bg-[#0E1014] border border-[#111317] p-2.5 space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-[#ECEFF4] font-bold">AFTER · {afterLevel}</span>
                              <span
                                className={displayedResult.verified ? 'text-[#A7F3D0]' : 'text-[#FCA5A5]'}
                              >
                                {displayedResult.verified ? 'NEUTRALIZED' : 'VULNERABLE'}
                              </span>
                            </div>
                            <pre className="font-mono text-xs text-[#ECEFF4] max-h-16 overflow-y-auto whitespace-pre-wrap break-words">
                              {displayedResult.evidence
                                ? String(displayedResult.evidence)
                                : displayedResult.verified
                                  ? `Exploit vector neutralized at '${afterLevel}'.`
                                  : `Exploit vector still succeeds at '${afterLevel}'.`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-1.5">
                        <div className="text-[15px] font-bold text-[#111317]">
                          Live Exploit Replay Ready
                        </div>
                        <p className="text-[14px] text-[#4B5260] leading-relaxed">
                          Audit the vulnerable PHP lines on the right terminal, pick your target
                          tier above, and click <strong>Set Live</strong> to replay the attack
                          vector before and after hardening.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {leftSubTab === 'quiz' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-bold text-[#111317]">Patch Audit Quiz</h2>
                        <p className="text-[14px] text-[#4B5260]">
                          Identify the secure PHP remediation pattern for {selectedChallenge.title}.
                        </p>
                      </div>
                      <Button
                        variant="defender"
                        size="sm"
                        onClick={() => setLeftSubTab('remediate')}
                      >
                        <span>Back to Remediate</span>
                      </Button>
                    </div>

                    {displayedResult?.patch_feedback && (
                      <AlertBanner
                        variant={displayedResult.patch_correct ? 'success' : 'warning'}
                        title={
                          displayedResult.patch_correct
                            ? 'Accurate Remediation Choice'
                            : 'Review Remediation Pattern'
                        }
                        message={displayedResult.patch_feedback}
                      />
                    )}

                    {hasPatchQuiz ? (
                      <div className="space-y-3">
                        {patchQuiz.prompt && (
                          <p className="text-[15px] font-medium text-[#111317] leading-relaxed">
                            {patchQuiz.prompt}
                          </p>
                        )}
                        <div
                          role="radiogroup"
                          aria-label="Select secure code fix"
                          className="space-y-2.5"
                        >
                          {patchOptions.map((opt) => {
                            const isSelected = selectedPatchOptionId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => setSelectedPatchOptionId(opt.id)}
                                className={[
                                  'w-full text-left p-3.5 rounded-lg border transition-colors',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]',
                                  isSelected
                                    ? 'bg-[#1D4ED8]/10 border-[#1D4ED8] ring-1 ring-inset ring-[#1D4ED8]/35'
                                    : 'bg-[#FAF8F3] border-[#111317]/20 hover:bg-[#EAE4D7]/50',
                                ].join(' ')}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[14px] font-bold text-[#111317]">
                                    {opt.label}
                                  </span>
                                  <span
                                    className={[
                                      'w-4 h-4 rounded-full border shrink-0',
                                      isSelected
                                        ? 'border-[#1D4ED8] bg-[#1D4ED8]'
                                        : 'border-[#111317]/35 bg-transparent',
                                    ].join(' ')}
                                  />
                                </div>
                                {opt.code_snippet && (
                                  <pre className="cf-darkroom mt-2 p-2.5 rounded bg-[#0E1014] border border-[#111317] font-mono text-[13px] text-[#ECEFF4] whitespace-pre-wrap break-all">
                                    {opt.code_snippet}
                                  </pre>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-2">
                        <div className="text-[15px] font-bold text-[#111317]">
                          OWASP Remediation Playbook
                        </div>
                        <ul className="space-y-1.5 text-[14px] text-[#1C1F26] leading-relaxed list-disc pl-5">
                          {guidance.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {leftSubTab === 'incidents' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-bold text-[#111317]">Live SOC Incidents</h2>
                        <p className="text-[14px] text-[#4B5260]">
                          Recent offensive alerts and range events requiring Blue-Team triage.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab('alerts')}
                      >
                        <span>All Alerts</span>
                        <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                      </Button>
                    </div>

                    {socIncidents.length === 0 ? (
                      <div className="p-5 rounded-lg bg-[#EAE4D7]/45 border border-[#111317]/15 text-[14px] text-[#4B5260]">
                        No exploit alerts recorded yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#111317]/12 rounded-lg border border-[#111317]/15 bg-[#FAF8F3]">
                        {socIncidents.map((inc) => {
                          const targetCh = challenges.find(
                            (c) => c.challenge_id === inc.challenge_id
                          );
                          return (
                            <div
                              key={inc.alert_id}
                              className="px-4 py-3 flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={getAlertBadgeVariant(inc.alert_type)}>
                                    {inc.alert_type}
                                  </Badge>
                                  <span className="text-xs font-mono text-[#4B5260]">
                                    {formatUtcTimestamp(inc.timestamp)}
                                  </span>
                                </div>
                                <p className="text-[14px] text-[#111317] leading-snug">
                                  {inc.message}
                                </p>
                              </div>
                              {targetCh && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => selectChallenge(targetCh)}
                                  className="shrink-0"
                                >
                                  Triage
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Right 50%: Recessed Darkroom Terminal */}
            <section className="lg:col-span-6 cf-darkroom rounded-lg bg-[#0E1014] text-[#ECEFF4] border border-[#111317] flex flex-col lg:min-h-0 overflow-hidden">
              <div className="px-4 py-2 border-b border-white/[0.1] bg-[#14171D] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div
                  role="tablist"
                  aria-label="Darkroom inspection tabs"
                  className="inline-flex items-center gap-1"
                >
                  {[
                    { id: 'source', label: 'PHP Source', icon: Code },
                    { id: 'wire', label: 'Live HTTP Wire', icon: Globe },
                    { id: 'sink', label: 'Sink Dataflow', icon: Lightning },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const active = rightSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setRightSubTab(tab.id)}
                        className={[
                          'px-3 py-1.5 rounded text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ECEFF4]',
                          active
                            ? 'bg-[#1D4ED8] text-[#FAF8F3]'
                            : 'text-[#C8CFD8] hover:text-[#FAF8F3] hover:bg-white/[0.06]',
                        ].join(' ')}
                      >
                        <TabIcon className="w-4 h-4" weight={active ? 'fill' : 'regular'} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {rightSubTab === 'source' && challengeSource?.source_available && (
                  <div
                    role="group"
                    aria-label="PHP handler tier"
                    className="inline-flex items-center p-0.5 rounded bg-[#0E1014] border border-white/[0.12]"
                  >
                    {SOURCE_TIERS.filter(
                      (tier) =>
                        tier.id === 'low' ||
                        tier.id === 'impossible' ||
                        Boolean(challengeSource?.sources_by_tier?.[tier.id])
                    ).map((tier) => {
                      const active = sourceTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            setSourceTier(tier.id);
                            setDiagnosedLine(null);
                          }}
                          className={[
                            'px-2 py-1 rounded text-xs font-mono font-semibold transition-colors',
                            active
                              ? 'bg-white/[0.16] text-[#FAF8F3]'
                              : 'text-[#9CA3AF] hover:text-[#ECEFF4]',
                          ].join(' ')}
                        >
                          {tier.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex-1 lg:min-h-0 overflow-hidden flex flex-col">
                {rightSubTab === 'source' && (
                  sourceLoading ? (
                    <div className="p-5 text-[14px] text-[#C8CFD8]">
                      Loading live DVWA PHP handler source...
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <SinkCodeViewer
                        code={activePhpCode}
                        sinkPattern={
                          sourceTier === 'impossible' ? null : challengeSource?.sink_pattern
                        }
                        title={
                          challengeSource?.module_key
                            ? `Handler Audit (${sourceTier}.php · ${challengeSource.module_key})`
                            : `Handler Audit (${sourceTier}.php)`
                        }
                        emptyMessage={`No DVWA ${sourceTier}.php source mapped for this target.`}
                        highlightTone={sourceTier === 'impossible' ? 'amber' : 'crimson'}
                        selectedLine={sourceTier === 'low' ? diagnosedLine : null}
                        onSelectLine={sourceTier === 'low' ? setDiagnosedLine : null}
                        vulnerableLines={sourceTier === 'low' ? vulnerableLines : []}
                        className="flex-1 min-h-0 border-0 rounded-none"
                      />
                      {sourceTier === 'low' && diagnosedLine !== null && (
                        <div className="px-4 py-2 border-t border-white/[0.1] bg-[#14171D] flex items-center justify-between gap-2 text-xs font-mono shrink-0">
                          <span
                            className={
                              vulnerableLines.includes(diagnosedLine)
                                ? 'text-[#34D399]'
                                : 'text-[#FCD34D]'
                            }
                          >
                            {vulnerableLines.includes(diagnosedLine)
                              ? `Line ${diagnosedLine} confirmed as a vulnerable sink handling untrusted input.`
                              : `Line ${diagnosedLine} is scaffolding/safe context — keep tracing untrusted input toward the sink.`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDiagnosedLine(null)}
                            className="text-[#9CA3AF] hover:text-[#ECEFF4]"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {rightSubTab === 'wire' && (
                  <HttpWireInspector wireTrace={displayedResult?.wire_trace} role="defender" />
                )}

                {rightSubTab === 'sink' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    <LiveSinkVisualizer
                      mode="defend"
                      moduleKey={challengeSource?.module_key}
                      pageRef={selectedChallenge.dvwa_page_ref}
                      vulnerabilityType={selectedChallenge.vulnerability_type}
                      referencePayload={selectedChallenge.reference_payload}
                      selectedPatchLabel={selectedPatchOption?.label || ''}
                      selectedPatchSnippet={selectedPatchOption?.code_snippet || ''}
                      securityLevel={selectedLevel}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* All Labs Catalog Drawer */}
        <SlideOverInspector
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          title="All Defensive Labs"
          subtitle={`${stats.verified} of ${stats.assigned} verified · ${stats.totalScore} XP`}
          badge={<Badge variant="cobalt">{filteredChallenges.length} shown</Badge>}
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              {hasActiveTargetFilters ? (
                <Button variant="ghost" size="sm" onClick={resetTargetFilters}>
                  Reset Filters
                </Button>
              ) : (
                <span className="text-xs text-[#4B5260] font-mono">
                  {categories.length} classes
                </span>
              )}
              <Button variant="secondary" size="sm" onClick={() => setCatalogOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Filter by security level"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <option value="all">All Applied Tiers</option>
                  <option value="none">Not Applied</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="impossible">Impossible</option>
                </Select>
              </div>

              <div
                role="group"
                aria-label="Filter by verification status"
                className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#EAE4D7] border border-[#111317]/15"
              >
                {HARDENING_STATUS_FILTERS.map((opt) => {
                  const active = statusFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatusFilter(opt.id)}
                      className={[
                        'flex-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                        active
                          ? 'bg-[#1D4ED8] text-[#FAF8F3]'
                          : 'text-[#4B5260] hover:text-[#111317]',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredChallenges.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#EAE4D7]/50 border border-[#111317]/15 text-center space-y-2">
                <p className="text-[14px] text-[#4B5260]">
                  No assigned targets match your current filters.
                </p>
                {hasActiveTargetFilters && (
                  <Button variant="secondary" size="sm" onClick={resetTargetFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#111317]/12 rounded-lg border border-[#111317]/15 bg-[#FAF8F3]">
                {filteredChallenges.map((ch) => {
                  const summary = defenseSummaryByChallenge.get(ch.challenge_id);
                  const currentLevel = summary?.latest?.security_level_applied || null;
                  const isSelected = selectedChallengeId === ch.challenge_id;
                  return (
                    <button
                      key={ch.challenge_id}
                      type="button"
                      onClick={() => {
                        selectChallenge(ch);
                        setCatalogOpen(false);
                      }}
                      className={[
                        'w-full text-left px-3.5 py-3 flex items-start justify-between gap-3 transition-colors',
                        isSelected ? 'bg-[#1D4ED8]/10' : 'hover:bg-[#EAE4D7]/50',
                      ].join(' ')}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-[#111317]">{ch.title}</span>
                          <Badge variant={getDifficultyVariant(ch.difficulty)}>
                            {ch.difficulty}
                          </Badge>
                        </div>
                        <div className="text-xs text-[#4B5260] truncate">
                          {ch.vulnerability_type} ·{' '}
                          <span className="font-mono text-[#111317]">{ch.dvwa_page_ref}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={currentLevel ? getLevelBadgeVariant(currentLevel) : 'neutral'}>
                          {currentLevel || 'none'}
                        </Badge>
                        {summary?.verified ? (
                          <Badge variant="green">Verified</Badge>
                        ) : currentLevel ? (
                          <Badge variant="amber">Unverified</Badge>
                        ) : (
                          <Badge variant="neutral">Pending</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SlideOverInspector>
      </div>
    );
  }

  function renderDefensesTab() {
    const inspectedTarget = inspectedDefense
      ? challenges.find((ch) => ch.challenge_id === inspectedDefense.challenge_id)
      : null;

    return (
      <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
        <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#111317] tracking-tight">Defense Ledger</h1>
            <p className="text-[14px] text-[#4B5260] mt-0.5">
              {defenses.length} submissions · {stats.verifiedSubmissions} verified ·{' '}
              {stats.unverifiedSubmissions} unverified · {stats.totalScore} XP
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDefensesPage(1);
                }}
                placeholder="Filter challenge or tier..."
                aria-label="Filter defense history"
              />
            </div>

            <div
              role="group"
              aria-label="Filter defenses by verification status"
              className="inline-flex items-center p-1 rounded-md bg-[#EAE4D7] border border-[#111317]/15"
            >
              {DEFENSE_VERIFIED_FILTERS.map((opt) => {
                const active = defenseVerifiedFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDefenseVerifiedFilter(opt.id);
                      setDefensesPage(1);
                    }}
                    className={[
                      'px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                      active
                        ? 'bg-[#1D4ED8] text-[#FAF8F3]'
                        : 'text-[#4B5260] hover:text-[#111317]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="w-36">
              <Select
                aria-label="Filter defenses by security level"
                value={defenseLevelFilter}
                onChange={(e) => {
                  setDefenseLevelFilter(e.target.value);
                  setDefensesPage(1);
                }}
              >
                <option value="all">All Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="impossible">Impossible</option>
              </Select>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => loadData({ silent: true })}
              loading={refreshing}
            >
              <ArrowsClockwise className="w-3.5 h-3.5" weight="regular" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={6} columns={5} />
        ) : filteredDefenses.length === 0 ? (
          <EmptyState
            icon={ClockCounterClockwise}
            title="No defenses submitted yet"
            description="Raise a target's DVWA security level in Remediate Studio to verify remediation."
            action={
              <Button variant="defender" size="sm" onClick={() => setActiveTab('remediate')}>
                Open Remediate Studio
              </Button>
            }
          />
        ) : (
          <div className="flex-1 lg:min-h-0 flex flex-col gap-3">
            <div className="flex-1 lg:min-h-0 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#EAE4D7]/90 border-b border-[#111317]/15">
                    <tr className="text-xs font-bold uppercase tracking-wider text-[#4B5260]">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Challenge</th>
                      <th className="py-3 px-4">Security Tier</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Score</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111317]/10 text-[14px]">
                    {pagedDefenses.map((item) => {
                      const targetChallenge = challenges.find(
                        (ch) => ch.challenge_id === item.challenge_id
                      );
                      return (
                        <tr
                          key={item.defense_id}
                          onClick={() => setInspectedDefense(item)}
                          className="cursor-pointer hover:bg-[#EAE4D7]/45 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono tabular-nums text-[#4B5260] whitespace-nowrap">
                            #{item.defense_id}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#111317] whitespace-nowrap">
                            {item.challenge_title || `Challenge #${item.challenge_id}`}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant={getLevelBadgeVariant(item.security_level_applied)}>
                              {item.security_level_applied}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant={item.verified ? 'green' : 'amber'}>
                              {item.verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold tabular-nums text-right text-[#111317] whitespace-nowrap">
                            +{item.score_earned}
                          </td>
                          <td className="py-3 px-4 font-mono text-[13px] tabular-nums text-[#4B5260] whitespace-nowrap">
                            {formatUtcTimestamp(item.timestamp)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setInspectedDefense(item);
                                }}
                              >
                                Inspect
                              </Button>
                              {targetChallenge && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    selectChallenge(targetChallenge);
                                  }}
                                >
                                  <span>Configure</span>
                                  <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <PaginationBar
              page={safeDefensePage}
              totalPages={totalDefensePages}
              totalItems={filteredDefenses.length}
              pageSize={PAGE_SIZE}
              onPageChange={setDefensesPage}
              itemLabel="defenses"
            />
          </div>
        )}

        <SlideOverInspector
          open={Boolean(inspectedDefense)}
          onClose={() => setInspectedDefense(null)}
          title={
            inspectedDefense
              ? `Defense #${inspectedDefense.defense_id} · ${
                  inspectedDefense.challenge_title || `Challenge #${inspectedDefense.challenge_id}`
                }`
              : ''
          }
          subtitle={inspectedTarget ? formatDvwaUrl(inspectedTarget.dvwa_page_ref) : undefined}
          badge={
            inspectedDefense && (
              <Badge variant={inspectedDefense.verified ? 'green' : 'amber'}>
                {inspectedDefense.verified ? 'Verified' : 'Unverified'}
              </Badge>
            )
          }
          footer={
            inspectedDefense && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setInspectedDefense(null)}>
                  Close
                </Button>
                {inspectedTarget && (
                  <Button
                    type="button"
                    variant="defender"
                    size="sm"
                    onClick={() => {
                      setInspectedDefense(null);
                      selectChallenge(inspectedTarget);
                    }}
                  >
                    <span>Open in Remediate Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                  </Button>
                )}
              </>
            )
          }
        >
          {inspectedDefense && (
            <div className="space-y-4 text-[14px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15">
                  <div className="text-xs font-semibold text-[#4B5260]">Applied Security</div>
                  <div className="mt-1.5">
                    <Badge variant={getLevelBadgeVariant(inspectedDefense.security_level_applied)}>
                      {inspectedDefense.security_level_applied}
                    </Badge>
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15">
                  <div className="text-xs font-semibold text-[#4B5260]">Score Earned</div>
                  <div className="font-display text-2xl font-extrabold text-[#1D4ED8] mt-1">
                    +{inspectedDefense.score_earned} pts
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4B5260]">Submitted</span>
                  <span className="font-mono text-xs text-[#111317]">
                    {formatUtcTimestamp(inspectedDefense.timestamp)}
                  </span>
                </div>
                {inspectedTarget && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#4B5260]">Vulnerability Class</span>
                      <span className="font-semibold text-[#111317]">
                        {inspectedTarget.vulnerability_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#4B5260]">DVWA Target</span>
                      <CopyChip
                        value={formatDvwaUrl(inspectedTarget.dvwa_page_ref)}
                        label={inspectedTarget.dvwa_page_ref}
                      />
                    </div>
                  </>
                )}
              </div>

              {inspectedTarget?.reference_payload && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#111317]">Replayed Attack Vector</span>
                    <CopyChip value={inspectedTarget.reference_payload} label="Copy vector" />
                  </div>
                  <pre className="cf-darkroom p-3.5 rounded-lg bg-[#0E1014] border border-[#111317] font-mono text-[13.5px] text-[#ECEFF4] whitespace-pre-wrap break-all">
                    {inspectedTarget.reference_payload}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SlideOverInspector>
      </div>
    );
  }

  function renderAlertsTab() {
    const inspectedTarget = inspectedAlert
      ? challenges.find((ch) => ch.challenge_id === inspectedAlert.challenge_id)
      : null;

    return (
      <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
        <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#111317] tracking-tight">Security Alerts</h1>
            <p className="text-[14px] text-[#4B5260] mt-0.5">
              {alerts.length} total SOC alerts recorded across DVWA modules and Canary traps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAlertsPage(1);
                }}
                placeholder="Filter alert message or type..."
                aria-label="Filter security alerts"
              />
            </div>

            <div
              role="group"
              aria-label="Filter alerts by category"
              className="inline-flex items-center p-1 rounded-md bg-[#EAE4D7] border border-[#111317]/15"
            >
              {ALERT_TYPE_FILTERS.map((opt) => {
                const active = alertTypeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAlertTypeFilter(opt.id);
                      setAlertsPage(1);
                    }}
                    className={[
                      'px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                      active
                        ? 'bg-[#1D4ED8] text-[#FAF8F3]'
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
              onClick={() => loadData({ silent: true })}
              loading={refreshing}
            >
              <ArrowsClockwise className="w-3.5 h-3.5" weight="regular" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={6} columns={4} />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={Warning}
            title="No matching security alerts"
            description="Alerts appear here when offensive probes, verified defenses, or recon blocks fire."
          />
        ) : (
          <div className="flex-1 lg:min-h-0 flex flex-col gap-3">
            <div className="flex-1 lg:min-h-0 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#EAE4D7]/90 border-b border-[#111317]/15">
                    <tr className="text-xs font-bold uppercase tracking-wider text-[#4B5260]">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Target Module</th>
                      <th className="py-3 px-4">Alert Message</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111317]/10 text-[14px]">
                    {pagedAlerts.map((al) => {
                      const targetCh = challenges.find((ch) => ch.challenge_id === al.challenge_id);
                      return (
                        <tr
                          key={al.alert_id}
                          onClick={() => setInspectedAlert(al)}
                          className="cursor-pointer hover:bg-[#EAE4D7]/45 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono tabular-nums text-[#4B5260] whitespace-nowrap">
                            #{al.alert_id}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant={getAlertBadgeVariant(al.alert_type)}>
                              {al.alert_type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#111317] whitespace-nowrap">
                            {targetCh ? targetCh.title : al.challenge_id ? `Challenge #${al.challenge_id}` : 'Platform'}
                          </td>
                          <td className="py-3 px-4 text-[#1C1F26] max-w-[340px] truncate">
                            {al.message}
                          </td>
                          <td className="py-3 px-4 font-mono text-[13px] tabular-nums text-[#4B5260] whitespace-nowrap">
                            {formatUtcTimestamp(al.timestamp)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setInspectedAlert(al);
                                }}
                              >
                                Inspect
                              </Button>
                              {targetCh && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    selectChallenge(targetCh);
                                  }}
                                >
                                  <span>Remediate</span>
                                  <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <PaginationBar
              page={safeAlertPage}
              totalPages={totalAlertPages}
              totalItems={filteredAlerts.length}
              pageSize={PAGE_SIZE}
              onPageChange={setAlertsPage}
              itemLabel="alerts"
            />
          </div>
        )}

        <SlideOverInspector
          open={Boolean(inspectedAlert)}
          onClose={() => setInspectedAlert(null)}
          title={inspectedAlert ? `Alert #${inspectedAlert.alert_id} · ${inspectedAlert.alert_type}` : ''}
          subtitle={
            inspectedTarget
              ? `${inspectedTarget.title} (${inspectedTarget.dvwa_page_ref})`
              : 'System Security Telemetry'
          }
          badge={
            inspectedAlert && (
              <Badge variant={getAlertBadgeVariant(inspectedAlert.alert_type)}>
                {inspectedAlert.alert_type}
              </Badge>
            )
          }
          footer={
            inspectedAlert && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setInspectedAlert(null)}>
                  Close
                </Button>
                {inspectedTarget && (
                  <Button
                    type="button"
                    variant="defender"
                    size="sm"
                    onClick={() => {
                      setInspectedAlert(null);
                      selectChallenge(inspectedTarget);
                    }}
                  >
                    <span>Remediate Target</span>
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                  </Button>
                )}
              </>
            )
          }
        >
          {inspectedAlert && (
            <div className="space-y-4 text-[14px]">
              <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4B5260]">Recorded</span>
                  <span className="font-mono text-xs text-[#111317]">
                    {formatUtcTimestamp(inspectedAlert.timestamp)}
                  </span>
                </div>
                {inspectedTarget && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#4B5260]">Module</span>
                    <span className="font-semibold text-[#111317]">{inspectedTarget.title}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-[#111317]">Incident Detail</div>
                <div className="p-3.5 rounded-lg bg-[#EAE4D7]/45 border border-[#111317]/15 text-[#111317] leading-relaxed">
                  {inspectedAlert.message}
                </div>
              </div>
            </div>
          )}
        </SlideOverInspector>
      </div>
    );
  }

  return (
    <CommandDeckShell
      user={user}
      roleTheme="defender"
      roleLabel="BLUE TEAM DEFENSE"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={
        activeTab === 'defenses' || activeTab === 'alerts'
          ? (val) => {
              setSearchQuery(val);
              setDefensesPage(1);
              setAlertsPage(1);
            }
          : undefined
      }
      searchPlaceholder={searchPlaceholder}
      commandGroups={commandGroups}
      headerActions={
        typeof onOpenOverview === 'function' ? (
          <Button variant="secondary" size="sm" onClick={onOpenOverview}>
            <Cube className="w-4 h-4 text-[#1D4ED8]" weight="regular" />
            <span className="hidden lg:inline">3D Hub</span>
          </Button>
        ) : null
      }
      onSignOut={onSignOut}
    >
      {activeTab === 'paths' && (
        <LearningPathMap
          role="defender"
          tracks={tracks}
          challenges={challenges}
          summaryMap={defenseSummaryByChallenge}
          stats={stats}
          onSelectChallenge={(ch) => {
            if (typeof onTriggerTransition === 'function') {
              onTriggerTransition({
                role: 'defender',
                title: ch?.title || 'Defense Studio',
                subtitle: ch?.vulnerability_type || 'Live Hardening Audit',
                trackLabel: ch?.dvwa_page_ref || 'DVWA :8081',
                onMidpoint: () => selectChallenge(ch),
              });
            } else {
              selectChallenge(ch);
            }
          }}
          onContinueMission={handleSelectNextPending}
          onOpenTour={onOpenOverview}
        />
      )}
      {activeTab === 'remediate' && renderRemediateStudioTab()}
      {activeTab === 'defenses' && renderDefensesTab()}
      {activeTab === 'alerts' && renderAlertsTab()}
      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}
      {activeTab === 'settings' && <SettingsView user={user} onAccountDeleted={onSignOut} />}
      <TactileToast toasts={toasts} onDismiss={dismissToast} />
    </CommandDeckShell>
  );
}
