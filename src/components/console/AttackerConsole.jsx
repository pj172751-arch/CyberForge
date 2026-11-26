import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  Crosshair,
  Cube,
  Eraser,
  Gear,
  Lightbulb,
  PaperPlaneTilt,
  Target,
  TerminalWindow,
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
  Textarea,
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

const DIFFICULTY_POINTS = {
  easy: 50,
  medium: 100,
  hard: 250,
};

const DIFFICULTY_VARIANT = {
  easy: 'green',
  medium: 'amber',
  hard: 'red',
};

const TARGET_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unsolved', label: 'Unsolved' },
  { id: 'attempted', label: 'Attempted' },
  { id: 'solved', label: 'Solved' },
];

const ATTEMPT_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Verified' },
  { id: 'failed', label: 'Rejected' },
];

function getPointsForDifficulty(difficulty) {
  return DIFFICULTY_POINTS[(difficulty || '').trim().toLowerCase()] ?? 100;
}

function getDifficultyVariant(difficulty) {
  return DIFFICULTY_VARIANT[(difficulty || '').trim().toLowerCase()] || 'neutral';
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

function utf8ByteLength(str) {
  return new TextEncoder().encode(str || '').length;
}

function normalizeProgressiveHints(sourceHints, challenge) {
  const byTier = new Map();
  if (Array.isArray(sourceHints)) {
    for (const item of sourceHints) {
      if (item && Number.isFinite(Number(item.tier))) {
        byTier.set(Number(item.tier), item);
      }
    }
  }
  const vuln = challenge?.vulnerability_type || 'target';
  const ref = challenge?.dvwa_page_ref || 'endpoint';
  return [
    {
      tier: 1,
      label: byTier.get(1)?.label || 'Concept',
      text:
        byTier.get(1)?.text ||
        `Trace how user-supplied input flows into the ${vuln} handler at ${ref} without sufficient sanitization.`,
    },
    {
      tier: 2,
      label: byTier.get(2)?.label || 'Syntax Clue',
      text:
        byTier.get(2)?.text ||
        `Test boundary characters or protocol syntax specific to ${vuln} against ${ref}.`,
    },
    {
      tier: 3,
      label: byTier.get(3)?.label || 'Full Vector',
      text: byTier.get(3)?.text || challenge?.reference_payload || '',
    },
  ];
}

let nextAttackerToastId = 0;

function findInitialTargetId(challengeList, attemptList) {
  if (!Array.isArray(challengeList) || challengeList.length === 0) return null;
  const solvedIds = new Set(
    (attemptList || []).filter((a) => a.status === 'success').map((a) => a.challenge_id)
  );
  const firstUnsolved = challengeList.find((ch) => !solvedIds.has(ch.challenge_id));
  return (firstUnsolved || challengeList[0]).challenge_id;
}

export default function AttackerConsole({ user, onSignOut, onOpenOverview }) {
  const attackerId = user?.id;

  const [activeTab, setActiveTab] = useState('challenges');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attemptStatusFilter, setAttemptStatusFilter] = useState('all');
  const [attemptChallengeFilter, setAttemptChallengeFilter] = useState('all');

  const [challenges, setChallenges] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(attackerId));
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [workbenchTab, setWorkbenchTab] = useState('console');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [sourceState, setSourceState] = useState({ challengeId: null, data: null });
  const [payloadText, setPayloadText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [unlockedHintTier, setUnlockedHintTier] = useState(0);
  const [viewingHintTier, setViewingHintTier] = useState(0);
  const [inspectedAttempt, setInspectedAttempt] = useState(null);
  const [toasts, setToasts] = useState([]);

  const payloadInputRef = useRef(null);
  const workbenchRef = useRef(null);
  const [focusWorkbenchNonce, setFocusWorkbenchNonce] = useState(0);
  const [focusEditorNonce, setFocusEditorNonce] = useState(0);

  useEffect(() => {
    if (!focusWorkbenchNonce) return undefined;
    const timer = window.setTimeout(() => {
      workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      payloadInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [focusWorkbenchNonce]);

  useEffect(() => {
    if (!focusEditorNonce) return undefined;
    const timer = window.setTimeout(() => {
      payloadInputRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [focusEditorNonce]);

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
    nextAttackerToastId += 1;
    const id = `att-toast-${nextAttackerToastId}`;
    setToasts((prev) => [...prev, { id, variant, title, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!attackerId) return undefined;
    let cancelled = false;

    async function fetchInitial() {
      try {
        const [challengeList, attemptList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/attempts?attacker_id=${encodeURIComponent(attackerId)}`),
        ]);
        if (!cancelled) {
          const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
          const nextAttempts = Array.isArray(attemptList) ? attemptList : [];
          setChallenges(nextChallenges);
          setAttempts(nextAttempts);
          setSelectedChallengeId((prev) => prev ?? findInitialTargetId(nextChallenges, nextAttempts));
          setLoadError('');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Unable to load challenges and attempt telemetry.');
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
  }, [attackerId]);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!attackerId) return;
      setRefreshing(true);
      setLoadError('');
      try {
        const [challengeList, attemptList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/attempts?attacker_id=${encodeURIComponent(attackerId)}`),
        ]);
        const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
        const nextAttempts = Array.isArray(attemptList) ? attemptList : [];
        setChallenges(nextChallenges);
        setAttempts(nextAttempts);
        setSelectedChallengeId((prev) => {
          if (prev && nextChallenges.some((ch) => ch.challenge_id === prev)) return prev;
          return findInitialTargetId(nextChallenges, nextAttempts);
        });
        if (!silent) {
          pushToast('info', 'Telemetry synced', 'Loaded latest DVWA challenges and attempt log.');
        }
      } catch (err) {
        setLoadError(err.message || 'Unable to load challenges and attempt telemetry.');
      } finally {
        setRefreshing(false);
      }
    },
    [attackerId, pushToast]
  );

  const attemptSummaryByChallenge = useMemo(() => {
    const map = new Map();
    for (const attempt of attempts) {
      const prev = map.get(attempt.challenge_id) || {
        count: 0,
        solved: false,
        bestScore: 0,
        latest: null,
      };
      const isSuccess = attempt.status === 'success';
      map.set(attempt.challenge_id, {
        count: prev.count + 1,
        solved: prev.solved || isSuccess,
        bestScore: Math.max(prev.bestScore, Number(attempt.score_earned) || 0),
        latest: prev.latest || attempt,
      });
    }
    return map;
  }, [attempts]);

  const stats = useMemo(() => {
    let attemptedCount = 0;
    let solvedCount = 0;
    for (const ch of challenges) {
      const summary = attemptSummaryByChallenge.get(ch.challenge_id);
      if (summary && summary.count > 0) {
        attemptedCount += 1;
        if (summary.solved) solvedCount += 1;
      }
    }
    const successSubmissions = attempts.filter((item) => item.status === 'success').length;
    const totalScore = attempts.reduce((sum, item) => sum + (Number(item.score_earned) || 0), 0);
    const successRate = attempts.length > 0 ? Math.round((successSubmissions / attempts.length) * 100) : 0;
    const pctSolved = challenges.length > 0 ? Math.round((solvedCount / challenges.length) * 100) : 0;
    return {
      available: challenges.length,
      attempted: attemptedCount,
      solved: solvedCount,
      totalScore,
      successSubmissions,
      rejectedSubmissions: Math.max(0, attempts.length - successSubmissions),
      successRate,
      pctSolved,
    };
  }, [challenges, attempts, attemptSummaryByChallenge]);

  const categoryBreakdown = useMemo(() => {
    const counts = new Map();
    for (const ch of challenges) {
      const cat = (ch.vulnerability_type || 'Uncategorized').trim();
      const entry = counts.get(cat) || { category: cat, total: 0, solved: 0 };
      entry.total += 1;
      if (attemptSummaryByChallenge.get(ch.challenge_id)?.solved) {
        entry.solved += 1;
      }
      counts.set(cat, entry);
    }
    return Array.from(counts.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [challenges, attemptSummaryByChallenge]);

  const categories = useMemo(
    () => categoryBreakdown.map((item) => item.category),
    [categoryBreakdown]
  );

  const filteredChallenges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return challenges.filter((ch) => {
      const summary = attemptSummaryByChallenge.get(ch.challenge_id);
      if (categoryFilter !== 'all' && (ch.vulnerability_type || '').trim() !== categoryFilter) {
        return false;
      }
      if (
        difficultyFilter !== 'all' &&
        (ch.difficulty || '').trim().toLowerCase() !== difficultyFilter
      ) {
        return false;
      }
      if (statusFilter === 'solved' && !summary?.solved) return false;
      if (statusFilter === 'attempted' && (!summary || summary.count === 0)) return false;
      if (statusFilter === 'unsolved' && summary?.solved) return false;
      if (!q) return true;
      return (
        (ch.title || '').toLowerCase().includes(q) ||
        (ch.vulnerability_type || '').toLowerCase().includes(q) ||
        (ch.difficulty || '').toLowerCase().includes(q) ||
        (ch.dvwa_page_ref || '').toLowerCase().includes(q)
      );
    });
  }, [challenges, categoryFilter, difficultyFilter, statusFilter, searchQuery, attemptSummaryByChallenge]);

  const filteredAttempts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attempts.filter((item) => {
      if (attemptStatusFilter !== 'all' && item.status !== attemptStatusFilter) {
        return false;
      }
      if (
        attemptChallengeFilter !== 'all' &&
        String(item.challenge_id) !== String(attemptChallengeFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (item.challenge_title || '').toLowerCase().includes(q) ||
        (item.payload_used || '').toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q) ||
        String(item.attempt_id).includes(q)
      );
    });
  }, [attempts, attemptStatusFilter, attemptChallengeFilter, searchQuery]);

  const selectedChallenge = useMemo(
    () => challenges.find((ch) => ch.challenge_id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );

  const selectedChallengeAttempts = useMemo(() => {
    if (!selectedChallenge) return [];
    return attempts.filter((item) => item.challenge_id === selectedChallenge.challenge_id);
  }, [attempts, selectedChallenge]);

  const selectChallenge = useCallback((challenge, { initialPayload = '', focusEditor = false } = {}) => {
    if (!challenge) return;
    setActiveTab('challenges');
    setWorkbenchTab('console');
    setSelectedChallengeId(challenge.challenge_id);
    setPayloadText(initialPayload);
    setSubmitError('');
    setLastResult(null);
    setLastLatencyMs(null);
    setUnlockedHintTier(0);
    setViewingHintTier(0);
    if (focusEditor) {
      setFocusWorkbenchNonce((n) => n + 1);
    }
  }, []);

  const handleSelectNextUnsolved = useCallback(() => {
    if (challenges.length === 0) return;
    const unsolved = challenges.find((ch) => !attemptSummaryByChallenge.get(ch.challenge_id)?.solved);
    if (unsolved) {
      selectChallenge(unsolved, { focusEditor: true });
      return;
    }
    const hardTarget =
      challenges.find((ch) => (ch.difficulty || '').toLowerCase() === 'hard') || challenges[0];
    selectChallenge(hardTarget, { focusEditor: true });
  }, [challenges, attemptSummaryByChallenge, selectChallenge]);

  function resetTargetFilters() {
    setCategoryFilter('all');
    setDifficultyFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  }

  async function handleSubmitPayload(event) {
    if (event) event.preventDefault();
    if (!selectedChallenge || !attackerId || submitting) return;

    if (!payloadText.trim()) {
      setSubmitError('Enter an exploit payload before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const response = await apiFetch('/api/attempts', {
        method: 'POST',
        body: {
          attacker_id: attackerId,
          challenge_id: selectedChallenge.challenge_id,
          payload_used: payloadText,
        },
      });
      const elapsedMs = Math.max(
        1,
        Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
      );
      setLastLatencyMs(elapsedMs);
      setLastResult(response);
      setAttempts((prev) => [response, ...prev]);
      if (response.status === 'success') {
        pushToast(
          'success',
          `Exploit verified (+${response.score_earned} pts)`,
          `${selectedChallenge.title} recorded in telemetry.`
        );
      } else {
        pushToast(
          'error',
          'Payload rejected',
          `Vector did not match ${selectedChallenge.vulnerability_type} criteria.`
        );
      }
    } catch (err) {
      setSubmitError(err.message || 'Payload evaluation failed.');
      pushToast('error', 'Evaluation failed', err.message || 'Could not submit payload.');
    } finally {
      setSubmitting(false);
    }
  }

  const navItems = useMemo(
    () => [
      {
        id: 'challenges',
        label: 'Workbench',
        icon: Crosshair,
        badge: `${stats.solved}/${stats.available}`,
      },
      {
        id: 'attempts',
        label: 'Attempts',
        icon: ClockCounterClockwise,
        badge: attempts.length,
      },
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [stats.solved, stats.available, attempts.length]
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
        id: 'action-next-unsolved',
        label: 'Launch Next Unsolved Target',
        hint: 'Focus payload composer on next uncompromised module',
        icon: Target,
        onSelect: handleSelectNextUnsolved,
      },
      {
        id: 'action-refresh',
        label: 'Refresh Range Telemetry',
        hint: 'Reload challenges and attempt history from PostgreSQL',
        icon: ArrowsClockwise,
        onSelect: () => loadData(),
      },
      ...(typeof onOpenOverview === 'function'
        ? [
            {
              id: 'action-overview',
              label: 'Open 3D Overview',
              hint: 'Launch particle tactical mission briefing',
              icon: Cube,
              onSelect: onOpenOverview,
            },
          ]
        : []),
    ];

    const targetItems = challenges.map((ch) => ({
      id: `target-${ch.challenge_id}`,
      label: ch.title,
      hint: `${ch.vulnerability_type} · ${ch.difficulty} · ${getPointsForDifficulty(ch.difficulty)} pts`,
      icon: TerminalWindow,
      onSelect: () => selectChallenge(ch, { focusEditor: true }),
    }));

    return [
      { heading: 'Console Views', items: viewItems },
      { heading: 'Quick Actions', items: actionItems },
      { heading: 'DVWA Targets', items: targetItems },
    ];
  }, [navItems, challenges, handleSelectNextUnsolved, loadData, onOpenOverview, selectChallenge]);

  const profileStats = [
    {
      label: 'Available',
      value: stats.available,
      detail: `${categories.length} attack categories`,
      icon: Target,
    },
    {
      label: 'Attempted',
      value: stats.attempted,
      detail: `${attempts.length} total submissions`,
      icon: TerminalWindow,
      accent: 'amber',
    },
    {
      label: 'Solved',
      value: stats.solved,
      detail: `${stats.successRate}% hit rate`,
      icon: CheckCircle,
      accent: 'green',
    },
    {
      label: 'Total Score',
      value: stats.totalScore,
      detail: 'Cumulative points earned',
      icon: Trophy,
      accent: 'teal',
    },
  ];

  const hasActiveTargetFilters =
    categoryFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    statusFilter !== 'all' ||
    Boolean(searchQuery);

  const searchPlaceholder =
    activeTab === 'attempts'
      ? 'Filter attempts by challenge, payload, or status...'
      : 'Search targets by title, class, or endpoint...';

  function renderWorkbenchTab() {
    const activeSummary = selectedChallenge
      ? attemptSummaryByChallenge.get(selectedChallenge.challenge_id)
      : null;
    const activePoints = selectedChallenge
      ? getPointsForDifficulty(selectedChallenge.difficulty)
      : 0;
    const activeUrl = selectedChallenge ? formatDvwaUrl(selectedChallenge.dvwa_page_ref) : '';
    const displayedResult =
      lastResult && selectedChallenge && lastResult.challenge_id === selectedChallenge.challenge_id
        ? lastResult
        : null;
    const progressiveHints = normalizeProgressiveHints(
      challengeSource?.hints,
      selectedChallenge
    );
    const activeHintObj =
      viewingHintTier > 0
        ? progressiveHints.find((h) => h.tier === viewingHintTier) || null
        : null;
    const showDebrief =
      displayedResult?.status === 'success' || Boolean(activeSummary?.solved);
    const debrief = challengeSource?.debrief;

    return (
      <div className="space-y-4">
        {loadError && (
          <AlertBanner variant="error" message={loadError} onDismiss={() => setLoadError('')} />
        )}

        <MissionRibbon
          role="attacker"
          challenges={challenges}
          selectedId={selectedChallengeId}
          onSelect={(ch) => selectChallenge(ch, { focusEditor: false })}
          summaryMap={attemptSummaryByChallenge}
          stats={stats}
          onOpenCatalog={() => setCatalogOpen(true)}
          onNextTarget={handleSelectNextUnsolved}
          onRefresh={() => loadData()}
          refreshing={refreshing}
        />

        {/* Full-Viewport 50/50 Interactive Learning Studio */}
        {loading ? (
          <SkeletonRows rows={6} columns={4} />
        ) : !selectedChallenge ? (
          <EmptyState
            icon={Crosshair}
            title="Select a DVWA target"
            description="Pick an offensive module from the mission ribbon or All Labs drawer to inspect its sink and craft a payload."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Pane: Target Context + Live Sink Preview + low.php Source */}
            <SpotlightSurface accent="rose" padding="p-4 sm:p-5" className="lg:col-span-6 space-y-4">
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
                    {activeSummary?.solved && (
                      <Badge variant="green">
                        <CheckCircle className="w-3 h-3" weight="bold" />
                        Solved
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {selectedChallenge.vulnerability_type} · Reward:{' '}
                    <span className="font-mono tabular-nums text-[#FB7185] font-semibold">
                      {activePoints} pts
                    </span>{' '}
                    · {activeSummary?.count || 0} attempts
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
                    <span>Launch DVWA</span>
                    <ArrowSquareOut className="w-3.5 h-3.5 text-[#FB7185]" weight="regular" />
                  </a>
                </div>
              </div>

              <LiveSinkVisualizer
                mode="attack"
                moduleKey={challengeSource?.module_key}
                pageRef={selectedChallenge.dvwa_page_ref}
                vulnerabilityType={selectedChallenge.vulnerability_type}
                payload={payloadText}
              />

              {sourceLoading ? (
                <SkeletonRows rows={5} columns={2} className="border-white/[0.06] bg-[#07080B]/70" />
              ) : (
                <SinkCodeViewer
                  code={challengeSource?.source_available ? challengeSource.vulnerable_code : ''}
                  sinkPattern={challengeSource?.sink_pattern}
                  title={
                    challengeSource?.module_key
                      ? `Vulnerable Source (low.php · ${challengeSource.module_key})`
                      : 'Vulnerable Source (low.php)'
                  }
                  maxHeightClass="max-h-72"
                  emptyMessage="No DVWA source code mapped for this target endpoint."
                  highlightTone="rose"
                />
              )}
            </SpotlightSurface>

            {/* Right Pane: Sticky 2-Tab Exploit Console / Target History */}
            <div ref={workbenchRef} className="lg:col-span-6 lg:sticky lg:top-20">
              <SpotlightSurface accent="rose" className="divide-y divide-white/[0.08]">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div
                    role="tablist"
                    aria-label="Exploit studio tabs"
                    className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#07080B] border border-white/[0.08]"
                  >
                    {[
                      { id: 'console', label: 'Exploit Console', icon: TerminalWindow },
                      {
                        id: 'history',
                        label: 'Target History',
                        icon: ClockCounterClockwise,
                        count: selectedChallengeAttempts.length,
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
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F43F5E]',
                            active
                              ? 'bg-[#F43F5E]/15 text-[#FB7185]'
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
                    {stats.successRate}% hit rate
                  </span>
                </div>

                {workbenchTab === 'console' && (
                  <>
                    {/* Payload Composer */}
                    <form onSubmit={handleSubmitPayload} className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TerminalWindow className="w-4 h-4 text-[#FB7185]" weight="regular" />
                          <h2 className="text-sm font-semibold text-zinc-100">Payload Composer</h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-zinc-400">
                          <span>
                            {payloadText.length} chars · {utf8ByteLength(payloadText)} B
                          </span>
                          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-[#07080B] border border-white/[0.08] rounded">
                            Ctrl+Enter
                          </kbd>
                        </div>
                      </div>

                      {submitError && (
                        <AlertBanner
                          variant="error"
                          message={submitError}
                          onDismiss={() => setSubmitError('')}
                        />
                      )}

                      <label htmlFor="cf-payload-editor" className="sr-only">
                        Exploit payload input
                      </label>
                      <Textarea
                        ref={payloadInputRef}
                        id="cf-payload-editor"
                        rows={4}
                        value={payloadText}
                        onChange={(e) => setPayloadText(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmitPayload();
                          }
                        }}
                        placeholder={`Craft ${selectedChallenge.vulnerability_type} payload for ${selectedChallenge.dvwa_page_ref}...`}
                        disabled={submitting}
                        className="font-mono text-xs leading-relaxed bg-[#07080B]/80 border-white/[0.08] focus:border-[#F43F5E]"
                      />

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setPayloadText('');
                            setSubmitError('');
                            setFocusEditorNonce((n) => n + 1);
                          }}
                          disabled={submitting || !payloadText}
                        >
                          <Eraser className="w-3.5 h-3.5" weight="regular" />
                          <span>Clear</span>
                        </Button>

                        <button
                          type="submit"
                          disabled={submitting || !payloadText.trim()}
                          className="h-9 px-4 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FB7185]"
                        >
                          <PaperPlaneTilt className="w-4 h-4" weight="bold" />
                          <span>{submitting ? 'Evaluating...' : 'Submit Payload'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Compact Single-Tray 3-Tier Progressive Hints */}
                    <div className="p-4 sm:px-5">
                      <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-[#F59E0B] shrink-0" weight="regular" />
                            <h3 className="text-xs font-semibold text-zinc-200">
                              Progressive Hints
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {progressiveHints.map((hint) => {
                              const isUnlocked = unlockedHintTier >= hint.tier;
                              const isNext = unlockedHintTier + 1 === hint.tier;
                              const isViewing = viewingHintTier === hint.tier;
                              const canClick = isUnlocked || isNext;
                              const buttonLabel =
                                hint.tier === 3
                                  ? 'Reveal Full Vector'
                                  : `Hint ${hint.tier} · ${hint.label}`;

                              return (
                                <button
                                  key={hint.tier}
                                  type="button"
                                  disabled={!canClick}
                                  onClick={() => {
                                    if (!canClick) return;
                                    setUnlockedHintTier((prev) => Math.max(prev, hint.tier));
                                    setViewingHintTier(hint.tier);
                                  }}
                                  className={[
                                    'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F59E0B]',
                                    isViewing
                                      ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]'
                                      : canClick
                                        ? 'bg-white/[0.04] border-white/[0.08] text-zinc-200 hover:bg-white/[0.08]'
                                        : 'bg-white/[0.02] border-white/[0.04] text-zinc-400 opacity-50 cursor-not-allowed',
                                  ].join(' ')}
                                >
                                  {buttonLabel}
                                </button>
                              );
                            })}
                            {viewingHintTier > 0 && (
                              <button
                                type="button"
                                onClick={() => setViewingHintTier(0)}
                                className="px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                              >
                                Hide
                              </button>
                            )}
                          </div>
                        </div>

                        {activeHintObj && (
                          <div className="pt-2 border-t border-white/[0.06] space-y-2">
                            {activeHintObj.tier === 3 ? (
                              <>
                                <pre className="font-mono text-xs text-[#FB7185] whitespace-pre-wrap break-all">
                                  {activeHintObj.text}
                                </pre>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CopyChip value={activeHintObj.text} label="Copy vector" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPayloadText(activeHintObj.text);
                                      setFocusEditorNonce((n) => n + 1);
                                    }}
                                  >
                                    Load into Editor
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {activeHintObj.text}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live DVWA Response Terminal */}
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100">
                          Live DVWA Response Terminal
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {displayedResult && (
                            <Badge
                              variant={
                                displayedResult.verification_mode === 'dvwa_live' ? 'teal' : 'amber'
                              }
                            >
                              {displayedResult.verification_mode === 'dvwa_live'
                                ? `Live DVWA · HTTP ${displayedResult.dvwa_http_status ?? 200}`
                                : 'Heuristic Fallback'}
                            </Badge>
                          )}
                          {displayedResult && lastLatencyMs !== null && (
                            <Badge variant="neutral">{lastLatencyMs} ms</Badge>
                          )}
                          {displayedResult ? (
                            <Badge variant={displayedResult.status === 'success' ? 'green' : 'red'}>
                              {displayedResult.status === 'success' ? (
                                <CheckCircle className="w-3 h-3" weight="bold" />
                              ) : (
                                <XCircle className="w-3 h-3" weight="bold" />
                              )}
                              {displayedResult.status === 'success'
                                ? 'Exploit Verified'
                                : 'Payload Rejected'}
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Awaiting Execution</Badge>
                          )}
                        </div>
                      </div>

                      {displayedResult ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                              <div className="text-xs text-zinc-400">Status</div>
                              <div
                                className={[
                                  'text-sm font-mono font-semibold mt-1 uppercase',
                                  displayedResult.status === 'success'
                                    ? 'text-[#10B981]'
                                    : 'text-[#EF4444]',
                                ].join(' ')}
                              >
                                {displayedResult.status}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                              <div className="text-xs text-zinc-400">Score Earned</div>
                              <div className="text-sm font-mono font-semibold tabular-nums text-[#FB7185] mt-1">
                                +{displayedResult.score_earned} pts
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                              <div className="text-xs text-zinc-400">Attempt ID</div>
                              <div className="text-sm font-mono tabular-nums text-zinc-200 mt-1">
                                #{displayedResult.attempt_id}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] font-mono text-xs space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
                              <span className="truncate">target: {activeUrl}</span>
                              <span>{formatUtcTimestamp(displayedResult.timestamp)}</span>
                            </div>
                            <div className="p-2.5 rounded bg-[#050608] border border-white/[0.06] text-zinc-200 whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                              {displayedResult.evidence
                                ? String(displayedResult.evidence)
                                : displayedResult.status === 'success'
                                  ? `Exploitation confirmed on ${selectedChallenge.title}. Alert logged to moderator telemetry.`
                                  : `Vector did not satisfy ${selectedChallenge.vulnerability_type} verification criteria. Adjust payload and retry.`}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] font-mono text-xs text-zinc-400">
                          Ready to evaluate payload against{' '}
                          <span className="text-zinc-200">{activeUrl}</span>. Submit above or press
                          Ctrl+Enter.
                        </div>
                      )}
                    </div>

                    {/* Breach Confirmed + OWASP Mastery Debrief */}
                    {showDebrief && (
                      <div className="p-4 sm:p-5">
                        <div className="p-3.5 rounded-lg bg-[#07080B]/70 border border-[#10B981]/25 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CheckCircle className="w-4 h-4 text-[#10B981]" weight="bold" />
                              <h3 className="text-sm font-semibold text-zinc-100">
                                Breach Confirmed · OWASP Mastery Debrief
                              </h3>
                              {challengeSource?.owasp_category && (
                                <Badge variant="teal">{challengeSource.owasp_category}</Badge>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={handleSelectNextUnsolved}
                              className="h-8 px-3 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FB7185]"
                            >
                              <span>Next Mission</span>
                              <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1">
                              <div className="font-semibold text-zinc-200">Root Cause</div>
                              <p className="text-zinc-300 leading-relaxed">
                                {debrief?.root_cause ||
                                  `Untrusted user input reaches a sensitive ${selectedChallenge.vulnerability_type} sink without validation or encoding.`}
                              </p>
                            </div>
                            <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1">
                              <div className="font-semibold text-zinc-200">Impact</div>
                              <p className="text-zinc-300 leading-relaxed">
                                {debrief?.impact ||
                                  `Attackers can exploit ${selectedChallenge.title} to compromise confidentiality, integrity, or session security.`}
                              </p>
                            </div>
                            <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] space-y-1">
                              <div className="font-semibold text-zinc-200">Prevention</div>
                              <p className="text-zinc-300 leading-relaxed">
                                {debrief?.prevention ||
                                  'Enforce strict server-side input validation, parameterized APIs, and context-aware output encoding.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {workbenchTab === 'history' && (
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-zinc-100">
                        Target History
                      </h2>
                      <span className="text-xs font-mono tabular-nums text-zinc-400">
                        {selectedChallengeAttempts.length} total
                      </span>
                    </div>

                    {selectedChallengeAttempts.length === 0 ? (
                      <div className="p-6 rounded-lg bg-[#07080B]/70 border border-white/[0.06] text-center">
                        <p className="text-xs text-zinc-400">
                          No attempts recorded for this module yet. Switch to Exploit Console to
                          test your first vector.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.06] rounded-lg bg-[#07080B]/70 border border-white/[0.06] max-h-[520px] overflow-y-auto">
                        {selectedChallengeAttempts.map((item) => (
                          <div
                            key={item.attempt_id}
                            className="px-3.5 py-3 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono tabular-nums text-zinc-400">
                                  #{item.attempt_id}
                                </span>
                                <Badge variant={item.status === 'success' ? 'green' : 'red'}>
                                  {item.status}
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
                                <span className="font-mono tabular-nums text-[#FB7185]">
                                  +{item.score_earned} pts
                                </span>
                                <span className="font-mono tabular-nums text-zinc-400">
                                  {formatUtcTimestamp(item.timestamp)}
                                </span>
                              </div>
                              <div
                                className="font-mono text-zinc-200 break-all"
                                title={item.payload_used}
                              >
                                {item.payload_used}
                              </div>
                              {item.evidence && (
                                <div className="font-mono text-[11px] text-zinc-400 truncate">
                                  {String(item.evidence)}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setPayloadText(item.payload_used);
                                setWorkbenchTab('console');
                                setFocusEditorNonce((n) => n + 1);
                              }}
                            >
                              Load
                            </Button>
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
          title="All Offensive Labs"
          subtitle={`${stats.solved} of ${stats.available} targets compromised · ${stats.totalScore} total pts`}
          badge={<Badge variant="red">{filteredChallenges.length} shown</Badge>}
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              {hasActiveTargetFilters ? (
                <Button variant="ghost" size="sm" onClick={resetTargetFilters}>
                  Reset Filters
                </Button>
              ) : (
                <span className="text-xs text-zinc-400 font-mono">
                  {categories.length} categories
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
                  aria-label="Filter by difficulty"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy (50 pts)</option>
                  <option value="medium">Medium (100 pts)</option>
                  <option value="hard">Hard (250 pts)</option>
                </Select>
              </div>

              <div
                role="group"
                aria-label="Filter by solve status"
                className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#07080B] border border-white/[0.08]"
              >
                {TARGET_STATUS_FILTERS.map((opt) => {
                  const active = statusFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatusFilter(opt.id)}
                      className={[
                        'flex-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                        active ? 'bg-[#F43F5E]/15 text-[#FB7185]' : 'text-zinc-400 hover:text-zinc-200',
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
                  No DVWA targets match your active filter criteria.
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
                  const summary = attemptSummaryByChallenge.get(ch.challenge_id);
                  const points = getPointsForDifficulty(ch.difficulty);
                  const isSelected = selectedChallengeId === ch.challenge_id;
                  return (
                    <button
                      key={ch.challenge_id}
                      type="button"
                      onClick={() => {
                        selectChallenge(ch, { focusEditor: false });
                        setCatalogOpen(false);
                      }}
                      className={[
                        'w-full text-left px-3.5 py-3 flex items-start justify-between gap-3 transition-colors',
                        isSelected ? 'bg-[#F43F5E]/10' : 'hover:bg-white/[0.03]',
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
                        <span className="text-[11px] font-mono tabular-nums text-zinc-200">
                          {points} pts
                        </span>
                        {summary?.solved ? (
                          <Badge variant="green">Solved</Badge>
                        ) : summary?.count > 0 ? (
                          <Badge variant="amber">{summary.count} tries</Badge>
                        ) : (
                          <Badge variant="neutral">Ready</Badge>
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

  function renderAttemptsTab() {
    const inspectedTarget = inspectedAttempt
      ? challenges.find((ch) => ch.challenge_id === inspectedAttempt.challenge_id)
      : null;

    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">My Attempts</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {attempts.length} submissions · {stats.successSubmissions} verified ·{' '}
              {stats.rejectedSubmissions} rejected · {stats.totalScore} total pts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="group"
              aria-label="Filter attempts by status"
              className="inline-flex items-center p-1 rounded-lg bg-[#0D0F14] border border-white/[0.08]"
            >
              {ATTEMPT_STATUS_FILTERS.map((opt) => {
                const active = attemptStatusFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAttemptStatusFilter(opt.id)}
                    className={[
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                      active ? 'bg-[#F43F5E]/15 text-[#FB7185]' : 'text-zinc-400 hover:text-zinc-200',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="w-48">
              <Select
                aria-label="Filter attempts by challenge"
                value={attemptChallengeFilter}
                onChange={(e) => setAttemptChallengeFilter(e.target.value)}
              >
                <option value="all">All Challenges</option>
                {challenges.map((ch) => (
                  <option key={ch.challenge_id} value={String(ch.challenge_id)}>
                    {ch.title}
                  </option>
                ))}
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
        ) : filteredAttempts.length === 0 ? (
          <EmptyState
            icon={ClockCounterClockwise}
            title="No exploit attempts recorded"
            description="Launch a payload from the Workbench to log your offensive verification history."
            action={
              <Button variant="primary" size="sm" onClick={() => setActiveTab('challenges')}>
                Open Workbench
              </Button>
            }
          />
        ) : (
          <SpotlightSurface accent="rose">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs font-medium text-zinc-400">
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Challenge</th>
                    <th className="py-3 px-3">Payload Used</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Score</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-xs">
                  {filteredAttempts.map((item) => {
                    const targetChallenge = challenges.find(
                      (ch) => ch.challenge_id === item.challenge_id
                    );
                    return (
                      <tr
                        key={item.attempt_id}
                        onClick={() => setInspectedAttempt(item)}
                        className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3 px-3 font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                          #{item.attempt_id}
                        </td>
                        <td className="py-3 px-3 font-medium text-zinc-100 whitespace-nowrap">
                          {item.challenge_title || `Challenge #${item.challenge_id}`}
                        </td>
                        <td className="py-3 px-3">
                          <div className="max-w-[200px] xl:max-w-[260px]">
                            <CopyChip value={item.payload_used} label={item.payload_used} />
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant={item.status === 'success' ? 'green' : 'red'}>
                            {item.status}
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
                                setInspectedAttempt(item);
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
                                  selectChallenge(targetChallenge, {
                                    initialPayload: item.payload_used,
                                    focusEditor: true,
                                  });
                                }}
                              >
                                <span>Load</span>
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
          open={Boolean(inspectedAttempt)}
          onClose={() => setInspectedAttempt(null)}
          title={
            inspectedAttempt
              ? `Attempt #${inspectedAttempt.attempt_id} · ${
                  inspectedAttempt.challenge_title || `Challenge #${inspectedAttempt.challenge_id}`
                }`
              : ''
          }
          subtitle={inspectedTarget ? formatDvwaUrl(inspectedTarget.dvwa_page_ref) : undefined}
          badge={
            inspectedAttempt && (
              <Badge variant={inspectedAttempt.status === 'success' ? 'green' : 'red'}>
                {inspectedAttempt.status}
              </Badge>
            )
          }
          footer={
            inspectedAttempt && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setInspectedAttempt(null)}>
                  Close
                </Button>
                {inspectedTarget && (
                  <button
                    type="button"
                    onClick={() => {
                      const payload = inspectedAttempt.payload_used;
                      setInspectedAttempt(null);
                      selectChallenge(inspectedTarget, {
                        initialPayload: payload,
                        focusEditor: true,
                      });
                    }}
                    className="h-8 px-3 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open &amp; Load in Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                  </button>
                )}
              </>
            )
          }
        >
          {inspectedAttempt && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                  <div className="text-zinc-400">Score Earned</div>
                  <div className="text-base font-mono font-semibold text-[#FB7185] mt-1">
                    +{inspectedAttempt.score_earned} pts
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06]">
                  <div className="text-zinc-400">Submitted</div>
                  <div className="text-xs font-mono text-zinc-200 mt-1.5">
                    {formatUtcTimestamp(inspectedAttempt.timestamp)}
                  </div>
                </div>
              </div>

              {inspectedTarget && (
                <div className="p-3 rounded-lg bg-[#07080B]/70 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Vulnerability Class</span>
                    <span className="font-medium text-zinc-100">
                      {inspectedTarget.vulnerability_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Difficulty</span>
                    <Badge variant={getDifficultyVariant(inspectedTarget.difficulty)}>
                      {inspectedTarget.difficulty}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-200">Payload Submitted</span>
                  <CopyChip value={inspectedAttempt.payload_used} label="Copy payload" />
                </div>
                <pre className="p-3 rounded-lg bg-[#07080B]/80 border border-white/[0.06] font-mono text-xs text-zinc-100 whitespace-pre-wrap break-all">
                  {inspectedAttempt.payload_used}
                </pre>
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
      roleTheme="attacker"
      roleLabel="RED TEAM OPS"
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
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F43F5E]"
          >
            <Cube className="w-3.5 h-3.5 text-[#FB7185]" weight="regular" />
            <span className="hidden lg:inline">3D Overview</span>
          </button>
        ) : null
      }
      onSignOut={onSignOut}
    >
      {activeTab === 'challenges' && renderWorkbenchTab()}
      {activeTab === 'attempts' && renderAttemptsTab()}
      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}
      {activeTab === 'settings' && <SettingsView user={user} onAccountDeleted={onSignOut} />}
      <TactileToast toasts={toasts} onDismiss={dismissToast} />
    </CommandDeckShell>
  );
}
