import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  Cube,
  Gear,
  GitDiff,
  Lock,
  LockKey,
  ShieldCheck,
  ShieldWarning,
  SlidersHorizontal,
  Trophy,
  User,
  XCircle,
} from '@phosphor-icons/react';
import { apiFetch } from '../../utils/api';
import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  Select,
  SkeletonRows,
} from '../ui/primitives';
import {
  CopyChip,
  SlideOverInspector,
  SpotlightSurface,
  TactileToast,
} from '../ui/spells';
import CommandDeckShell from './CommandDeckShell';
import { ProfileView, SettingsView } from './AccountViews';
import { LiveSinkVisualizer, MissionRibbon, SinkCodeViewer } from './LabVisualizer';

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
    badge: 'teal',
    description: 'Strict server-side validation, tighter type checks, and anti-CSRF controls.',
  },
  {
    value: 'impossible',
    label: 'Impossible',
    badge: 'green',
    description: 'Parameterized queries, explicit allowlists, and defense-in-depth hardening.',
  },
];

const DIFFICULTY_VARIANT = {
  easy: 'green',
  medium: 'amber',
  hard: 'red',
};

const LEVEL_BADGE_VARIANT = {
  low: 'red',
  medium: 'amber',
  high: 'teal',
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

export default function DefenderConsole({ user, onSignOut, onOpenOverview }) {
  const defenderId = user?.id;

  const [activeTab, setActiveTab] = useState('challenges');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [defenseVerifiedFilter, setDefenseVerifiedFilter] = useState('all');
  const [defenseLevelFilter, setDefenseLevelFilter] = useState('all');

  const [challenges, setChallenges] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(defenderId));
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [workbenchTab, setWorkbenchTab] = useState('diagnose');
  const [leftCodeTab, setLeftCodeTab] = useState('low');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [sourceState, setSourceState] = useState({ challengeId: null, data: null });
  const [selectedPatchOptionId, setSelectedPatchOptionId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('low');
  const [showCodeDiff, setShowCodeDiff] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [inspectedDefense, setInspectedDefense] = useState(null);
  const [toasts, setToasts] = useState([]);

  const workbenchRef = useRef(null);
  const [focusWorkbenchNonce, setFocusWorkbenchNonce] = useState(0);

  useEffect(() => {
    if (!focusWorkbenchNonce) return undefined;
    const timer = window.setTimeout(() => {
      workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [focusWorkbenchNonce]);

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
        const [challengeList, defenseList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/defenses?defender_id=${encodeURIComponent(defenderId)}`),
        ]);
        if (!cancelled) {
          const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
          const nextDefenses = Array.isArray(defenseList) ? defenseList : [];
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
        const [challengeList, defenseList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/defenses?defender_id=${encodeURIComponent(defenderId)}`),
        ]);
        const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
        const nextDefenses = Array.isArray(defenseList) ? defenseList : [];
        setChallenges(nextChallenges);
        setDefenses(nextDefenses);
        setSelectedChallengeId((prev) => {
          if (prev && nextChallenges.some((ch) => ch.challenge_id === prev)) return prev;
          return findInitialTarget(nextChallenges, nextDefenses)?.challenge_id ?? null;
        });
        if (!silent) {
          pushToast('info', 'Posture synced', 'Loaded latest DVWA targets and defense ledger.');
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

  const categoryBreakdown = useMemo(() => {
    const counts = new Map();
    for (const ch of challenges) {
      const cat = (ch.vulnerability_type || 'Uncategorized').trim();
      const entry = counts.get(cat) || { category: cat, total: 0, verified: 0 };
      entry.total += 1;
      if (defenseSummaryByChallenge.get(ch.challenge_id)?.verified) {
        entry.verified += 1;
      }
      counts.set(cat, entry);
    }
    return Array.from(counts.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [challenges, defenseSummaryByChallenge]);

  const categories = useMemo(
    () => categoryBreakdown.map((item) => item.category),
    [categoryBreakdown]
  );

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

  const selectedChallenge = useMemo(
    () => challenges.find((ch) => ch.challenge_id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );

  const selectedChallengeDefenses = useMemo(() => {
    if (!selectedChallenge) return [];
    return defenses.filter((item) => item.challenge_id === selectedChallenge.challenge_id);
  }, [defenses, selectedChallenge]);

  const selectChallenge = useCallback(
    (challenge, { scrollToWorkbench = false } = {}) => {
      if (!challenge) return;
      const summary = defenseSummaryByChallenge.get(challenge.challenge_id);
      const current = summary?.latest?.security_level_applied;
      setActiveTab('challenges');
      setWorkbenchTab('diagnose');
      setLeftCodeTab('low');
      setSelectedChallengeId(challenge.challenge_id);
      setSelectedLevel(current || 'low');
      setSelectedPatchOptionId(null);
      setSubmitError('');
      setLastResult(null);
      if (scrollToWorkbench) {
        setFocusWorkbenchNonce((n) => n + 1);
      }
    },
    [defenseSummaryByChallenge]
  );

  const handleSelectNextPending = useCallback(() => {
    if (challenges.length === 0) return;
    const nextPending =
      challenges.find((ch) => !defenseSummaryByChallenge.get(ch.challenge_id)?.verified) ||
      challenges[0];
    selectChallenge(nextPending, { scrollToWorkbench: true });
  }, [challenges, defenseSummaryByChallenge, selectChallenge]);

  function resetTargetFilters() {
    setCategoryFilter('all');
    setLevelFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  }

  async function handleSubmitDefense(event) {
    if (event) event.preventDefault();
    if (!selectedChallenge || !defenderId || submitting) return;

    const hasPatchQuiz =
      Array.isArray(challengeSource?.patch_quiz?.options) &&
      challengeSource.patch_quiz.options.length > 0;

    if (hasPatchQuiz && !selectedPatchOptionId) {
      setSubmitError('Select a secure code fix in Step 1 before running live replay.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await apiFetch('/api/defenses', {
        method: 'POST',
        body: {
          defender_id: defenderId,
          challenge_id: selectedChallenge.challenge_id,
          security_level_applied: selectedLevel,
          patch_option_id: selectedPatchOptionId || null,
        },
      });
      setLastResult(response);
      setDefenses((prev) => [response, ...prev]);
      setWorkbenchTab('replay');
      if (response.verified) {
        pushToast(
          'success',
          `Remediation verified (+${response.score_earned} pts)`,
          `${selectedChallenge.title} hardened to ${response.security_level_applied}.`
        );
      } else {
        pushToast(
          'info',
          `Level '${response.security_level_applied}' recorded (+${response.score_earned} pts)`,
          'Exploit vector still succeeded on live replay. Adjust remediation and retry.'
        );
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to apply defense configuration.');
      pushToast('error', 'Defense failed', err.message || 'Unable to apply security tier.');
    } finally {
      setSubmitting(false);
    }
  }

  const navItems = useMemo(
    () => [
      {
        id: 'challenges',
        label: 'Hardening',
        icon: ShieldCheck,
        badge: `${stats.verified}/${stats.assigned}`,
      },
      {
        id: 'defenses',
        label: 'Defenses',
        icon: ClockCounterClockwise,
        badge: defenses.length,
      },
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [stats.verified, stats.assigned, defenses.length]
  );

  const commandGroups = useMemo(() => {
    const viewItems = navItems.map((item, idx) => ({
      id: `nav-${item.id}`,
      label: item.label,
      hint: `Switch to ${item.label}`,
      shortcut: String(idx + 1),
      icon: item.icon,
      onSelect: () => setActiveTab(item.id),
    }));

    const actionItems = [
      {
        id: 'action-next-pending',
        label: 'Harden Next Pending Target',
        hint: 'Jump to next unverified module in the hardening queue',
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
        hint: 'Reload challenges and defense history from PostgreSQL',
        icon: ArrowsClockwise,
        onSelect: () => loadData(),
      },
      ...(typeof onOpenOverview === 'function'
        ? [
            {
              id: 'action-overview',
              label: 'Open 3D Overview',
              hint: 'Launch particle perimeter overview',
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
        onSelect: () => selectChallenge(ch, { scrollToWorkbench: true }),
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
      accent: 'teal',
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
      : 'Search assigned targets by title, class, or tier...';

  function renderHardeningDeckTab() {
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
    const diffUnlocked = Boolean(displayedResult) || Boolean(activeSummary?.verified);
    const activeLeftCode =
      diffUnlocked && leftCodeTab === 'impossible'
        ? challengeSource?.hardened_code || ''
        : challengeSource?.vulnerable_code || '';
    const activeLeftTitle =
      diffUnlocked && leftCodeTab === 'impossible'
        ? `Hardened Reference (impossible.php${
            challengeSource?.module_key ? ` · ${challengeSource.module_key}` : ''
          })`
        : `Vulnerable Source (low.php${
            challengeSource?.module_key ? ` · ${challengeSource.module_key}` : ''
          })`;

    return (
      <div className="space-y-4">
        {loadError && (
          <AlertBanner variant="error" message={loadError} onDismiss={() => setLoadError('')} />
        )}

        <MissionRibbon
          role="defender"
          challenges={challenges}
          selectedId={selectedChallengeId}
          onSelect={(ch) => selectChallenge(ch, { scrollToWorkbench: false })}
          summaryMap={defenseSummaryByChallenge}
          stats={stats}
          onOpenCatalog={() => setCatalogOpen(true)}
          onNextTarget={handleSelectNextPending}
          onRefresh={() => loadData()}
          refreshing={refreshing}
          extraActions={
            <a
              href="http://localhost:8081/security.php"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <span className="hidden sm:inline">DVWA Security</span>
              <ArrowSquareOut className="w-3.5 h-3.5 text-[#38BDF8]" weight="regular" />
            </a>
          }
        />

        {/* Full-Viewport 50/50 Defensive Engineering Studio */}
        {loading ? (
          <SkeletonRows rows={6} columns={4} />
        ) : !selectedChallenge ? (
          <EmptyState
            icon={ShieldCheck}
            title="Select an assigned target"
            description="Choose a challenge from the mission ribbon or All Labs drawer to inspect vulnerable code, pick a fix, and run live replay."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Pane: Target Header + Sink Code Viewer + Live Remediation Pipeline */}
            <SpotlightSurface accent="sky" padding="p-4 sm:p-5" className="lg:col-span-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-white/[0.08]">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
                      {selectedChallenge.title}
                    </h1>
                    <Badge variant={getDifficultyVariant(selectedChallenge.difficulty)}>
                      {selectedChallenge.difficulty}
                    </Badge>
                    {challengeSource?.owasp_category && (
                      <Badge variant="teal">{challengeSource.owasp_category}</Badge>
                    )}
                    {activeSummary?.verified ? (
                      <Badge variant="green">
                        <CheckCircle className="w-3 h-3" weight="bold" />
                        Verified
                      </Badge>
                    ) : currentApplied ? (
                      <Badge variant={getLevelBadgeVariant(currentApplied)}>
                        Tier: {currentApplied}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Pending</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {selectedChallenge.vulnerability_type} · Verified Reward:{' '}
                    <span className="font-mono tabular-nums text-[#38BDF8] font-semibold">
                      150 pts
                    </span>{' '}
                    · {activeSummary?.count || 0} submissions
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <CopyChip value={activeUrl} label={selectedChallenge.dvwa_page_ref} />
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors"
                  >
                    <span>Open DVWA</span>
                    <ArrowSquareOut className="w-3.5 h-3.5 text-[#38BDF8]" weight="regular" />
                  </a>
                </div>
              </div>

              {sourceLoading ? (
                <SkeletonRows rows={5} columns={2} className="border-white/[0.06] bg-[#07080B]/70" />
              ) : (
                <SinkCodeViewer
                  code={challengeSource?.source_available ? activeLeftCode : ''}
                  sinkPattern={
                    diffUnlocked && leftCodeTab === 'impossible'
                      ? null
                      : challengeSource?.sink_pattern
                  }
                  title={activeLeftTitle}
                  maxHeightClass="max-h-72"
                  emptyMessage="No DVWA source code mapped for this target endpoint."
                  highlightTone="amber"
                  headerExtra={
                    diffUnlocked && challengeSource?.hardened_code ? (
                      <div className="inline-flex items-center p-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                        {[
                          { id: 'low', label: 'low.php' },
                          { id: 'impossible', label: 'impossible.php' },
                        ].map((tab) => {
                          const active = leftCodeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setLeftCodeTab(tab.id)}
                              className={[
                                'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
                                active
                                  ? 'bg-[#38BDF8]/20 text-[#38BDF8]'
                                  : 'text-zinc-400 hover:text-zinc-200',
                              ].join(' ')}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null
                  }
                />
              )}

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
            </SpotlightSurface>

            {/* Right Pane: Sticky 3-Tab Patch & Harden / Live Replay / Audit History */}
            <div ref={workbenchRef} className="lg:col-span-6 lg:sticky lg:top-20">
              <SpotlightSurface accent="sky" className="divide-y divide-white/[0.08]">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div
                    role="tablist"
                    aria-label="Defense studio tabs"
                    className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#07080B] border border-white/[0.08]"
                  >
                    {[
                      { id: 'diagnose', label: 'Patch & Harden', icon: SlidersHorizontal },
                      { id: 'replay', label: 'Live Replay', icon: GitDiff },
                      {
                        id: 'history',
                        label: 'Audit History',
                        icon: ClockCounterClockwise,
                        count: selectedChallengeDefenses.length,
                      },
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      const active = workbenchTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setWorkbenchTab(tab.id)}
                          className={[
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]',
                            active
                              ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                              : 'text-zinc-400 hover:text-zinc-200',
                          ].join(' ')}
                        >
                          <TabIcon className="w-3.5 h-3.5" weight={active ? 'fill' : 'regular'} />
                          <span>{tab.label}</span>
                          {tab.count !== undefined && (
                            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono tabular-nums text-[10px] text-zinc-300">
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-xs font-mono tabular-nums text-zinc-400">
                    Current: <span className="text-zinc-200">{currentApplied || 'none'}</span>
                  </span>
                </div>

                {workbenchTab === 'diagnose' && (
                  <form onSubmit={handleSubmitDefense} className="divide-y divide-white/[0.08]">
                    {/* Step 1: Select Secure Code Fix */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-zinc-100">
                          Step 1: Select Secure Code Fix
                        </h2>
                        <Badge variant={hasPatchQuiz ? 'teal' : 'neutral'}>
                          {hasPatchQuiz ? 'Required' : 'Auto-Ready'}
                        </Badge>
                      </div>

                      {hasPatchQuiz ? (
                        <div className="space-y-2.5">
                          {patchQuiz.prompt && (
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {patchQuiz.prompt}
                            </p>
                          )}
                          <div
                            role="radiogroup"
                            aria-label="Select secure code fix"
                            className="space-y-2"
                          >
                            {patchOptions.map((opt) => {
                              const isSelected = selectedPatchOptionId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={isSelected}
                                  onClick={() => {
                                    setSelectedPatchOptionId(opt.id);
                                    if (submitError) setSubmitError('');
                                  }}
                                  className={[
                                    'w-full text-left p-3 rounded-lg border transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]',
                                    isSelected
                                      ? 'bg-[#38BDF8]/10 border-[#38BDF8] ring-1 ring-inset ring-[#38BDF8]/40'
                                      : 'bg-[#07080B]/70 border-white/[0.06] hover:border-white/[0.16]',
                                  ].join(' ')}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-zinc-100">
                                      {opt.label}
                                    </span>
                                    <span
                                      className={[
                                        'w-3.5 h-3.5 rounded-full border shrink-0',
                                        isSelected
                                          ? 'border-[#38BDF8] bg-[#38BDF8]'
                                          : 'border-white/25 bg-transparent',
                                      ].join(' ')}
                                    />
                                  </div>
                                  {opt.code_snippet && (
                                    <pre className="mt-2 p-2 rounded bg-[#050608] border border-white/[0.06] font-mono text-[11px] text-zinc-200 whitespace-pre-wrap break-all">
                                      {opt.code_snippet}
                                    </pre>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] space-y-2">
                          <div className="text-xs font-medium text-zinc-200">
                            Remediation Guidance
                          </div>
                          <ul className="space-y-1 text-xs text-zinc-300 leading-relaxed list-disc pl-4">
                            {guidance.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Select DVWA Security Tier */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-zinc-100">
                          Step 2: Select DVWA Security Tier
                        </h2>
                        <span className="text-xs font-mono text-zinc-400">
                          Target: <span className="text-[#38BDF8]">{selectedLevel}</span>
                        </span>
                      </div>

                      {submitError && (
                        <AlertBanner
                          variant="error"
                          message={submitError}
                          onDismiss={() => setSubmitError('')}
                        />
                      )}

                      <div
                        role="radiogroup"
                        aria-label="DVWA security level"
                        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                      >
                        {SECURITY_LEVELS.map((lvl) => {
                          const isSelected = selectedLevel === lvl.value;
                          return (
                            <button
                              key={lvl.value}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => setSelectedLevel(lvl.value)}
                              className={[
                                'px-3 py-2.5 rounded-lg border text-center transition-colors flex items-center justify-center gap-2',
                                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]',
                                isSelected
                                  ? 'bg-[#38BDF8]/10 border-[#38BDF8] ring-1 ring-inset ring-[#38BDF8]/40 text-zinc-100'
                                  : 'bg-[#07080B]/70 border-white/[0.06] text-zinc-300 hover:border-white/[0.16]',
                              ].join(' ')}
                            >
                              <Badge variant={lvl.badge}>{lvl.label}</Badge>
                            </button>
                          );
                        })}
                      </div>

                      <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] text-xs text-zinc-300 leading-relaxed">
                        <span className="font-semibold text-zinc-100">
                          {activeLevelMeta.label}:
                        </span>{' '}
                        {activeLevelMeta.description}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <span className="text-xs font-mono text-zinc-400">
                          Transition:{' '}
                          <span className="text-zinc-200">{currentApplied || 'none'}</span> &rarr;{' '}
                          <span className="text-[#38BDF8] font-semibold">{selectedLevel}</span>
                        </span>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="h-9 px-4 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-50 disabled:cursor-not-allowed text-[#04101B] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
                        >
                          <ShieldCheck className="w-4 h-4" weight="bold" />
                          <span>
                            {submitting ? 'Running Replay...' : 'Apply Patch & Run Live Replay'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {workbenchTab === 'replay' && (() => {
                  const debrief = challengeSource?.debrief;
                  const beforeExploited = displayedResult?.baseline_before
                    ? Boolean(displayedResult.baseline_before.exploited)
                    : true;
                  const afterLevel =
                    displayedResult?.dvwa_security_level ||
                    displayedResult?.security_level_applied ||
                    selectedLevel;

                  return (
                    <div className="divide-y divide-white/[0.08]">
                      {/* Live Before-vs-After DVWA Replay */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-sm font-semibold text-zinc-100">
                            Live Before-vs-After DVWA Replay
                          </h2>
                          <div className="flex items-center gap-2 flex-wrap">
                            {displayedResult && (
                              <Badge
                                variant={
                                  displayedResult.verification_mode === 'dvwa_live'
                                    ? 'teal'
                                    : 'amber'
                                }
                              >
                                {displayedResult.verification_mode === 'dvwa_live'
                                  ? `Live DVWA · HTTP ${displayedResult.dvwa_http_status ?? 200}`
                                  : 'Heuristic Fallback'}
                              </Badge>
                            )}
                            {displayedResult ? (
                              <Badge variant={displayedResult.verified ? 'green' : 'red'}>
                                {displayedResult.verified ? (
                                  <CheckCircle className="w-3 h-3" weight="bold" />
                                ) : (
                                  <ShieldWarning className="w-3 h-3" weight="bold" />
                                )}
                                {displayedResult.verified
                                  ? 'Remediation Verified'
                                  : 'Exploit Not Blocked'}
                              </Badge>
                            ) : (
                              <Badge variant="neutral">Awaiting Replay</Badge>
                            )}
                          </div>
                        </div>

                        {displayedResult ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-mono font-semibold text-zinc-200">
                                    BEFORE · DVWA low
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {displayedResult.baseline_before?.http_status !== undefined &&
                                      displayedResult.baseline_before?.http_status !== null && (
                                        <span className="text-[11px] font-mono text-zinc-400">
                                          HTTP {displayedResult.baseline_before.http_status}
                                        </span>
                                      )}
                                    <Badge variant={beforeExploited ? 'red' : 'green'}>
                                      {beforeExploited ? 'BREACHED' : 'NEUTRALIZED'}
                                    </Badge>
                                  </div>
                                </div>
                                <pre className="p-2.5 rounded bg-[#050608] border border-white/[0.06] font-mono text-xs text-zinc-300 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                  {displayedResult.baseline_before?.evidence
                                    ? String(displayedResult.baseline_before.evidence)
                                    : `Baseline vector succeeded: ${selectedChallenge.reference_payload}`}
                                </pre>
                              </div>

                              <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-mono font-semibold text-zinc-200">
                                    AFTER · DVWA {afterLevel}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {displayedResult.dvwa_http_status !== undefined &&
                                      displayedResult.dvwa_http_status !== null && (
                                        <span className="text-[11px] font-mono text-zinc-400">
                                          HTTP {displayedResult.dvwa_http_status}
                                        </span>
                                      )}
                                    <Badge variant={displayedResult.verified ? 'green' : 'red'}>
                                      {displayedResult.verified
                                        ? 'NEUTRALIZED'
                                        : 'STILL VULNERABLE'}
                                    </Badge>
                                  </div>
                                </div>
                                <pre className="p-2.5 rounded bg-[#050608] border border-white/[0.06] font-mono text-xs text-zinc-200 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                  {displayedResult.evidence
                                    ? String(displayedResult.evidence)
                                    : displayedResult.verified
                                      ? `Reference attack vector neutralized under '${afterLevel}' security (+${displayedResult.score_earned} pts).`
                                      : `Reference attack vector still succeeds under '${afterLevel}' security (+${displayedResult.score_earned} pts).`}
                                </pre>
                              </div>
                            </div>

                            {(displayedResult.patch_correct !== null &&
                              displayedResult.patch_correct !== undefined) ||
                            displayedResult.patch_feedback ? (
                              <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] space-y-1.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-zinc-200">
                                    Patch Diagnosis Verdict
                                  </span>
                                  {displayedResult.patch_correct !== null &&
                                    displayedResult.patch_correct !== undefined && (
                                      <Badge
                                        variant={displayedResult.patch_correct ? 'green' : 'amber'}
                                      >
                                        {displayedResult.patch_correct ? (
                                          <CheckCircle className="w-3 h-3" weight="bold" />
                                        ) : (
                                          <XCircle className="w-3 h-3" weight="bold" />
                                        )}
                                        {displayedResult.patch_correct
                                          ? 'Accurate Remediation'
                                          : 'Suboptimal Fix Choice'}
                                      </Badge>
                                    )}
                                </div>
                                {displayedResult.patch_feedback && (
                                  <p className="text-xs text-zinc-300 leading-relaxed">
                                    {displayedResult.patch_feedback}
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="p-5 rounded-lg bg-[#07080B]/70 border border-white/[0.06] text-center space-y-3">
                            <p className="text-xs text-zinc-300">
                              Select a secure fix and DVWA tier in Patch &amp; Harden to execute a
                              live before-vs-after exploit replay.
                            </p>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setWorkbenchTab('diagnose')}
                            >
                              Go to Patch &amp; Harden
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Side-by-Side low.php vs impossible.php Code Diff */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <GitDiff className="w-4 h-4 text-[#38BDF8]" weight="regular" />
                            <h3 className="text-sm font-semibold text-zinc-100">
                              low.php vs impossible.php Code Diff
                            </h3>
                          </div>
                          {diffUnlocked && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowCodeDiff((prev) => !prev)}
                            >
                              {showCodeDiff ? 'Hide Diff' : 'Show Diff'}
                            </Button>
                          )}
                        </div>

                        {!diffUnlocked ? (
                          <div className="p-4 rounded-lg bg-[#07080B]/70 border border-white/[0.06] flex items-center gap-3 text-xs text-zinc-300">
                            <Lock className="w-4 h-4 text-zinc-400 shrink-0" weight="regular" />
                            <span>
                              Submit a defense replay to unlock the hardened impossible.php
                              comparison.
                            </span>
                          </div>
                        ) : !showCodeDiff ? null : !challengeSource?.source_available ||
                          (!challengeSource?.vulnerable_code && !challengeSource?.hardened_code) ? (
                          <div className="p-4 rounded-lg bg-[#07080B]/70 border border-white/[0.06] text-xs text-zinc-400">
                            Source diff is not mapped for this custom target endpoint.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <SinkCodeViewer
                              code={challengeSource.vulnerable_code || ''}
                              sinkPattern={challengeSource.sink_pattern}
                              title="low.php (vulnerable)"
                              maxHeightClass="max-h-60"
                              emptyMessage="Not available"
                              highlightTone="rose"
                            />
                            <SinkCodeViewer
                              code={challengeSource.hardened_code || ''}
                              sinkPattern={null}
                              title="impossible.php (hardened)"
                              maxHeightClass="max-h-60"
                              emptyMessage="Not available"
                              highlightTone="amber"
                            />
                          </div>
                        )}
                      </div>

                      {/* OWASP Debrief & Next Mission CTA */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-zinc-100">
                              OWASP Remediation Debrief
                            </h3>
                            {challengeSource?.owasp_category && (
                              <Badge variant="teal">{challengeSource.owasp_category}</Badge>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleSelectNextPending}
                            className="h-8 px-3 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#04101B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
                          >
                            <span>Next Mission</span>
                            <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-2.5 rounded bg-[#07080B]/70 border border-white/[0.06] space-y-1">
                            <div className="font-semibold text-zinc-200">Root Cause</div>
                            <p className="text-zinc-300 leading-relaxed">
                              {debrief?.root_cause ||
                                `Unvalidated input reaches a ${selectedChallenge.vulnerability_type} execution sink.`}
                            </p>
                          </div>
                          <div className="p-2.5 rounded bg-[#07080B]/70 border border-white/[0.06] space-y-1">
                            <div className="font-semibold text-zinc-200">Impact</div>
                            <p className="text-zinc-300 leading-relaxed">
                              {debrief?.impact ||
                                `Exploitation of ${selectedChallenge.title} threatens data confidentiality and application integrity.`}
                            </p>
                          </div>
                          <div className="p-2.5 rounded bg-[#07080B]/70 border border-white/[0.06] space-y-1">
                            <div className="font-semibold text-zinc-200">Prevention</div>
                            <p className="text-zinc-300 leading-relaxed">
                              {debrief?.prevention || guidance.join(' ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {workbenchTab === 'history' && (
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-zinc-100">
                        Audit History
                      </h2>
                      <span className="text-xs font-mono tabular-nums text-zinc-400">
                        {selectedChallengeDefenses.length} total
                      </span>
                    </div>

                    {selectedChallengeDefenses.length === 0 ? (
                      <div className="p-6 rounded-lg bg-[#07080B]/70 border border-white/[0.06] text-center">
                        <p className="text-xs text-zinc-400">
                          No hardening submissions recorded for this module yet.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.06] rounded-lg bg-[#07080B]/70 border border-white/[0.06] max-h-[520px] overflow-y-auto">
                        {selectedChallengeDefenses.map((item) => (
                          <div
                            key={item.defense_id}
                            className="px-3.5 py-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono tabular-nums text-zinc-400">
                                #{item.defense_id}
                              </span>
                              <Badge variant={getLevelBadgeVariant(item.security_level_applied)}>
                                {item.security_level_applied}
                              </Badge>
                              <Badge variant={item.verified ? 'green' : 'amber'}>
                                {item.verified ? 'Verified' : 'Unverified'}
                              </Badge>
                              {item.verification_mode && (
                                <Badge
                                  variant={
                                    item.verification_mode === 'dvwa_live' ? 'teal' : 'amber'
                                  }
                                >
                                  {item.verification_mode === 'dvwa_live'
                                    ? 'Live DVWA'
                                    : 'Heuristic'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                              <span className="text-[#38BDF8]">+{item.score_earned} pts</span>
                              <span className="text-zinc-400 hidden sm:inline">
                                {formatUtcTimestamp(item.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </SpotlightSurface>
            </div>
          </div>
        )}

        {/* All Labs Catalog Drawer */}
        <SlideOverInspector
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          title="All Defensive Labs"
          subtitle={`${stats.verified} of ${stats.assigned} verified · ${stats.totalScore} total pts`}
          badge={<Badge variant="teal">{filteredChallenges.length} shown</Badge>}
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              {hasActiveTargetFilters ? (
                <Button variant="ghost" size="sm" onClick={resetTargetFilters}>
                  Reset Filters
                </Button>
              ) : (
                <span className="text-xs text-zinc-400 font-mono">
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
                aria-label="Filter by remediation status"
                className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#07080B] border border-white/[0.08]"
              >
                {HARDENING_STATUS_FILTERS.map((opt) => {
                  const active = statusFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatusFilter(opt.id)}
                      className={[
                        'flex-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                        active ? 'bg-[#38BDF8]/15 text-[#38BDF8]' : 'text-zinc-400 hover:text-zinc-200',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredChallenges.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#07080B]/70 border border-white/[0.06] text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  No assigned challenges match your current filter selection.
                </p>
                {hasActiveTargetFilters && (
                  <Button variant="secondary" size="sm" onClick={resetTargetFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                {filteredChallenges.map((ch) => {
                  const summary = defenseSummaryByChallenge.get(ch.challenge_id);
                  const currentLevel = summary?.latest?.security_level_applied || null;
                  const isSelected = selectedChallengeId === ch.challenge_id;
                  return (
                    <button
                      key={ch.challenge_id}
                      type="button"
                      onClick={() => {
                        selectChallenge(ch, { scrollToWorkbench: false });
                        setCatalogOpen(false);
                      }}
                      className={[
                        'w-full text-left px-3.5 py-3 flex items-start justify-between gap-3 transition-colors',
                        isSelected ? 'bg-[#38BDF8]/10' : 'hover:bg-white/[0.03]',
                      ].join(' ')}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-100">{ch.title}</span>
                          <Badge variant={getDifficultyVariant(ch.difficulty)}>
                            {ch.difficulty}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {ch.vulnerability_type} ·{' '}
                          <span className="font-mono text-zinc-300">{ch.dvwa_page_ref}</span>
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
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">My Defenses</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {defenses.length} submissions · {stats.verifiedSubmissions} verified ·{' '}
              {stats.unverifiedSubmissions} unverified · {stats.totalScore} total pts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="group"
              aria-label="Filter defenses by verification status"
              className="inline-flex items-center p-1 rounded-lg bg-[#0D0F14] border border-white/[0.08]"
            >
              {DEFENSE_VERIFIED_FILTERS.map((opt) => {
                const active = defenseVerifiedFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDefenseVerifiedFilter(opt.id)}
                    className={[
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                      active ? 'bg-[#38BDF8]/15 text-[#38BDF8]' : 'text-zinc-400 hover:text-zinc-200',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="w-40">
              <Select
                aria-label="Filter defenses by security level"
                value={defenseLevelFilter}
                onChange={(e) => setDefenseLevelFilter(e.target.value)}
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
            description="Raise a challenge's DVWA security level in Hardening Deck to verify remediation."
            action={
              <Button variant="primary" size="sm" onClick={() => setActiveTab('challenges')}>
                Open Hardening Deck
              </Button>
            }
          />
        ) : (
          <SpotlightSurface accent="sky">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs font-medium text-zinc-400">
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Challenge</th>
                    <th className="py-3 px-3">Security Level</th>
                    <th className="py-3 px-3">Verification</th>
                    <th className="py-3 px-3 text-right">Score</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-xs">
                  {filteredDefenses.map((item) => {
                    const targetChallenge = challenges.find(
                      (ch) => ch.challenge_id === item.challenge_id
                    );
                    return (
                      <tr
                        key={item.defense_id}
                        onClick={() => setInspectedDefense(item)}
                        className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3 px-3 font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                          #{item.defense_id}
                        </td>
                        <td className="py-3 px-3 font-medium text-zinc-100 whitespace-nowrap">
                          {item.challenge_title || `Challenge #${item.challenge_id}`}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant={getLevelBadgeVariant(item.security_level_applied)}>
                            {item.security_level_applied}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant={item.verified ? 'green' : 'amber'}>
                            {item.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-right text-zinc-100 whitespace-nowrap">
                          +{item.score_earned}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                          {formatUtcTimestamp(item.timestamp)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
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
                                  selectChallenge(targetChallenge, { scrollToWorkbench: true });
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
          </SpotlightSurface>
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
                  <button
                    type="button"
                    onClick={() => {
                      setInspectedDefense(null);
                      selectChallenge(inspectedTarget, { scrollToWorkbench: true });
                    }}
                    className="h-8 px-3 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#04101B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open in Hardening Deck</span>
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                  </button>
                )}
              </>
            )
          }
        >
          {inspectedDefense && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                  <div className="text-zinc-400">Applied Security</div>
                  <div className="mt-1.5">
                    <Badge variant={getLevelBadgeVariant(inspectedDefense.security_level_applied)}>
                      {inspectedDefense.security_level_applied}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                  <div className="text-zinc-400">Score Earned</div>
                  <div className="text-base font-mono font-semibold text-[#38BDF8] mt-1">
                    +{inspectedDefense.score_earned} pts
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Submitted</span>
                  <span className="font-mono text-zinc-200">
                    {formatUtcTimestamp(inspectedDefense.timestamp)}
                  </span>
                </div>
                {inspectedTarget && (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Vulnerability Class</span>
                      <span className="font-medium text-zinc-100">
                        {inspectedTarget.vulnerability_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">DVWA Target</span>
                      <CopyChip
                        value={formatDvwaUrl(inspectedTarget.dvwa_page_ref)}
                        label={inspectedTarget.dvwa_page_ref}
                      />
                    </div>
                  </>
                )}
              </div>

              {inspectedTarget && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-200">Replayed Attack Vector</span>
                    <CopyChip value={inspectedTarget.reference_payload} label="Copy vector" />
                  </div>
                  <pre className="p-3 rounded-lg bg-[#07080B]/80 border border-white/[0.06] font-mono text-xs text-zinc-100 whitespace-pre-wrap break-all">
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

  return (
    <CommandDeckShell
      user={user}
      roleTheme="defender"
      roleLabel="BLUE TEAM DEFENSE"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={searchPlaceholder}
      commandGroups={commandGroups}
      headerActions={
        typeof onOpenOverview === 'function' ? (
          <button
            type="button"
            onClick={onOpenOverview}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8]"
          >
            <Cube className="w-3.5 h-3.5 text-[#38BDF8]" weight="regular" />
            <span className="hidden lg:inline">3D Overview</span>
          </button>
        ) : null
      }
      onSignOut={onSignOut}
    >
      {activeTab === 'challenges' && renderHardeningDeckTab()}
      {activeTab === 'defenses' && renderDefensesTab()}
      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}
      {activeTab === 'settings' && <SettingsView user={user} onAccountDeleted={onSignOut} />}
      <TactileToast toasts={toasts} onDismiss={dismissToast} />
    </CommandDeckShell>
  );
}
