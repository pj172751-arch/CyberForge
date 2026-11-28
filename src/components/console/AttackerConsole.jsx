import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  Compass,
  Crosshair,
  Cube,
  Eraser,
  Gear,
  Globe,
  Lightbulb,
  Lightning,
  PaperPlaneTilt,
  Target,
  TerminalWindow,
  Trophy,
  User,
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
  Textarea,
} from '../ui/primitives';
import {
  CopyChip,
  PacketBeam,
  PaginationBar,
  SlideOverInspector,
  TactileToast,
  VerdictStamp,
} from '../ui/spells';
import CommandDeckShell from './CommandDeckShell';
import { ProfileView, SettingsView } from './AccountViews';
import {
  HttpWireInspector,
  LiveSinkVisualizer,
  MissionRibbon,
  SinkCodeViewer,
} from './LabVisualizer';
import LearningPathMap from './LearningPathMap';

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

const ATTACKER_STAGES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

const SOURCE_TIERS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
  { id: 'impossible', label: 'Impossible' },
];

const PAGE_SIZE = 8;

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
  const list = [
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
  ];
  const tier3Text = byTier.get(3)?.text || challenge?.reference_payload || '';
  if (tier3Text) {
    list.push({
      tier: 3,
      label: byTier.get(3)?.label || 'Full Vector',
      text: tier3Text,
    });
  }
  return list;
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

export default function AttackerConsole({
  user,
  onSignOut,
  onOpenOverview,
  initialChallengeId = null,
  onConsumeInitialChallenge,
}) {
  const attackerId = user?.id;

  const [activeTab, setActiveTab] = useState('paths');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attemptStatusFilter, setAttemptStatusFilter] = useState('all');
  const [attemptChallengeFilter, setAttemptChallengeFilter] = useState('all');
  const [attemptsPage, setAttemptsPage] = useState(1);

  const [tracks, setTracks] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(attackerId));
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [targetStage, setTargetStage] = useState('low');
  const [leftSubTab, setLeftSubTab] = useState('execute');
  const [rightSubTab, setRightSubTab] = useState('source');
  const [sourceTier, setSourceTier] = useState('low');
  const [auditedLine, setAuditedLine] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [sourceState, setSourceState] = useState({ challengeId: null, data: null });
  const [payloadText, setPayloadText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [unlockedHintTier, setUnlockedHintTier] = useState(0);
  const [inspectedAttempt, setInspectedAttempt] = useState(null);
  const [toasts, setToasts] = useState([]);

  const payloadInputRef = useRef(null);
  const [focusEditorNonce, setFocusEditorNonce] = useState(0);

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
        const [challengeList, attemptList, trackList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/attempts?attacker_id=${encodeURIComponent(attackerId)}`),
          apiFetch('/api/tracks').catch(() => []),
        ]);
        if (!cancelled) {
          const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
          const nextAttempts = Array.isArray(attemptList) ? attemptList : [];
          setTracks(Array.isArray(trackList) ? trackList : []);
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
        const [challengeList, attemptList, trackList] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch(`/api/attempts?attacker_id=${encodeURIComponent(attackerId)}`),
          apiFetch('/api/tracks').catch(() => []),
        ]);
        const nextChallenges = Array.isArray(challengeList) ? challengeList : [];
        const nextAttempts = Array.isArray(attemptList) ? attemptList : [];
        setTracks(Array.isArray(trackList) ? trackList : []);
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

  const selectChallenge = useCallback((challenge, { initialPayload = '', focusEditor = false } = {}) => {
    if (!challenge) return;
    setActiveTab('labs');
    setLeftSubTab('execute');
    setRightSubTab('source');
    setSelectedChallengeId(challenge.challenge_id);
    setTargetStage('low');
    setSourceTier('low');
    setAuditedLine(null);
    setPayloadText(initialPayload);
    setSubmitError('');
    setLastResult(null);
    setLastLatencyMs(null);
    setUnlockedHintTier(0);
    if (focusEditor) {
      setFocusEditorNonce((n) => n + 1);
    }
  }, []);

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
        selectChallenge(matched, { focusEditor: true });
      }
      onConsumeInitialChallenge?.();
    });
    return () => {
      cancelled = true;
    };
  }, [loading, initialChallengeId, challenges, selectChallenge, onConsumeInitialChallenge]);

  const attemptSummaryByChallenge = useMemo(() => {
    const map = new Map();
    for (const attempt of attempts) {
      const prev = map.get(attempt.challenge_id) || {
        count: 0,
        solved: false,
        solvedTiers: new Set(),
        bestScore: 0,
        latest: null,
      };
      const isSuccess = attempt.status === 'success';
      const nextTiers = new Set(prev.solvedTiers);
      if (isSuccess) {
        nextTiers.add(
          (attempt.target_security_level || attempt.dvwa_security_level || 'low').toLowerCase()
        );
      }
      map.set(attempt.challenge_id, {
        count: prev.count + 1,
        solved: prev.solved || isSuccess,
        solvedTiers: nextTiers,
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

  const totalAttemptPages = Math.max(1, Math.ceil(filteredAttempts.length / PAGE_SIZE));
  const safeAttemptPage = Math.min(Math.max(1, attemptsPage), totalAttemptPages);
  const pagedAttempts = useMemo(() => {
    const start = (safeAttemptPage - 1) * PAGE_SIZE;
    return filteredAttempts.slice(start, start + PAGE_SIZE);
  }, [filteredAttempts, safeAttemptPage]);

  const selectedChallenge = useMemo(
    () => challenges.find((ch) => ch.challenge_id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );

  const selectedChallengeAttempts = useMemo(() => {
    if (!selectedChallenge) return [];
    return attempts.filter((item) => item.challenge_id === selectedChallenge.challenge_id);
  }, [attempts, selectedChallenge]);

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
          target_security_level: targetStage,
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
          `${selectedChallenge.title} cleared at ${targetStage.toUpperCase()} tier.`
        );
      } else {
        pushToast(
          'error',
          'Payload rejected',
          `Vector did not compromise ${selectedChallenge.title} at ${targetStage.toUpperCase()}.`
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
        id: 'paths',
        label: 'Tracks',
        icon: Compass,
        badge: `${stats.solved}/${stats.available}`,
      },
      {
        id: 'labs',
        label: 'Lab Studio',
        icon: Crosshair,
        badge: `${stats.solved}/${stats.available}`,
      },
      {
        id: 'attempts',
        label: 'Attempts',
        icon: ClockCounterClockwise,
        badge: attempts.length,
      },
      { id: 'settings', label: 'Settings', icon: Gear },
    ],
    [stats.solved, stats.available, attempts.length]
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
        id: 'action-next-unsolved',
        label: 'Engage Next Unsolved Target',
        hint: 'Open payload studio on next uncompromised module',
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
              label: 'Open 3D Range Hub',
              hint: 'Launch visual 3D curriculum hub',
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
      detail: 'Cumulative XP earned',
      icon: Trophy,
      accent: 'red',
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

  function handleTierChange(nextTier) {
    setTargetStage(nextTier);
    if (challengeSource?.sources_by_tier?.[nextTier] || nextTier === 'low') {
      setSourceTier(nextTier);
      setAuditedLine(null);
    }
  }

  function renderLabStudioTab() {
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
    const showDebrief =
      displayedResult?.status === 'success' || Boolean(activeSummary?.solved);
    const debrief = challengeSource?.debrief;
    const vulnerableLines = Array.isArray(challengeSource?.vulnerable_lines)
      ? challengeSource.vulnerable_lines
      : [];

    const nextEscalationStage =
      targetStage === 'low' ? 'medium' : targetStage === 'medium' ? 'high' : null;

    const activePhpCode = challengeSource?.source_available
      ? challengeSource?.sources_by_tier?.[sourceTier] ||
        (sourceTier === 'low' ? challengeSource?.vulnerable_code : '') ||
        (sourceTier === 'impossible' ? challengeSource?.hardened_code : '')
      : '';

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
          role="attacker"
          challenges={challenges}
          selectedId={selectedChallengeId}
          onSelect={(ch) => selectChallenge(ch, { focusEditor: false })}
          summaryMap={attemptSummaryByChallenge}
          stats={stats}
          onOpenCatalog={() => setCatalogOpen(true)}
          onOpenTour={onOpenOverview}
          onNextTarget={handleSelectNextUnsolved}
          onRefresh={() => loadData()}
          refreshing={refreshing}
        />

        {loading ? (
          <SkeletonRows rows={6} columns={4} />
        ) : !selectedChallenge ? (
          <EmptyState
            icon={Crosshair}
            title="Select a DVWA target"
            description="Pick an offensive module from the target ribbon or All Labs drawer to inspect PHP source and craft an exploit."
          />
        ) : (
          <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 50%: Warm Archival Drafting Deck */}
            <section className="lg:col-span-6 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg flex flex-col lg:min-h-0 overflow-hidden">
              {/* Target Header + Tier Switcher */}
              <div className="px-5 py-2.5 border-b border-[#111317]/15 shrink-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-[22px] sm:text-[24px] font-bold text-[#111317] leading-tight">
                        {selectedChallenge.title}
                      </h1>
                      <Badge variant={getDifficultyVariant(selectedChallenge.difficulty)}>
                        {selectedChallenge.difficulty}
                      </Badge>
                      {activeSummary?.solved && (
                        <Badge variant="green">
                          <CheckCircle className="w-3.5 h-3.5" weight="bold" />
                          SOLVED
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[13.5px] text-[#4B5260]">
                      <span>{selectedChallenge.vulnerability_type}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-[#C81E1E]">
                        +{activePoints} XP
                      </span>
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
                      <ArrowSquareOut className="w-3.5 h-3.5 text-[#C81E1E]" weight="bold" />
                    </a>
                  </div>
                </div>

                {/* Tier Switcher: Low | Medium | High */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div
                    role="group"
                    aria-label="Target DVWA security tier"
                    className="inline-flex items-center p-0.5 rounded-md bg-[#EAE4D7] border border-[#111317]/15"
                  >
                    {ATTACKER_STAGES.map((st) => {
                      const active = targetStage === st.id;
                      const tierDone = activeSummary?.solvedTiers?.has(st.id);
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleTierChange(st.id)}
                          className={[
                            'px-3 py-1 rounded text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]',
                            active
                              ? 'bg-[#C81E1E] text-[#FAF8F3]'
                              : 'text-[#1C1F26] hover:bg-[#FAF8F3]/70',
                          ].join(' ')}
                        >
                          {tierDone && (
                            <CheckCircle
                              className={[
                                'w-3.5 h-3.5',
                                active ? 'text-[#FAF8F3]' : 'text-[#047857]',
                              ].join(' ')}
                              weight="fill"
                            />
                          )}
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-xs font-mono text-[#4B5260] tabular-nums">
                    {activeSummary?.count || 0} attempts · {stats.successRate}% hit rate
                  </span>
                </div>
              </div>

              {/* 3 Clean Sub-Tabs: Execute | Hints & Intel | Debrief */}
              <div
                role="tablist"
                aria-label="Exploit studio sections"
                className="px-5 border-b border-[#111317]/15 bg-[#EAE4D7]/35 flex items-center gap-2 shrink-0"
              >
                {[
                  { id: 'execute', label: 'Execute', icon: TerminalWindow },
                  { id: 'hints', label: 'Hints & Intel', icon: Lightbulb },
                  {
                    id: 'debrief',
                    label: 'Debrief',
                    icon: CheckCircle,
                    badge: showDebrief ? 'Unlocked' : null,
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
                          ? 'border-[#C81E1E] text-[#111317]'
                          : 'border-transparent text-[#4B5260] hover:text-[#111317]',
                      ].join(' ')}
                    >
                      <TabIcon className="w-4 h-4" weight={active ? 'fill' : 'regular'} />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#047857]/12 border border-[#047857]/35 text-xs font-mono font-semibold text-[#047857] leading-none">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sub-Tab Content */}
              <div className="flex-1 lg:min-h-0 overflow-y-auto p-4">
                {leftSubTab === 'execute' && (
                  <div className="flex flex-col gap-2.5">
                    <form onSubmit={handleSubmitPayload} className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="cf-payload-editor"
                          className="text-[15px] font-bold text-[#111317]"
                        >
                          Exploit Payload ({targetStage.toUpperCase()} Tier)
                        </label>
                        <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#4B5260]">
                          <span>
                            {payloadText.length} chars · {utf8ByteLength(payloadText)} B
                          </span>
                          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono text-[#111317] bg-[#EAE4D7] border border-[#111317]/20 rounded">
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

                      <Textarea
                        ref={payloadInputRef}
                        id="cf-payload-editor"
                        rows={2}
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
                        className="min-h-[68px] font-mono text-[14px] leading-relaxed bg-white border-[#111317]/25 focus:border-[#C81E1E] focus:ring-[#C81E1E]"
                      />

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
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
                            <Eraser className="w-4 h-4" weight="regular" />
                            <span>Clear</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLeftSubTab('hints')}
                          >
                            <Lightbulb className="w-4 h-4 text-[#B45309]" weight="regular" />
                            <span>Hints</span>
                          </Button>
                        </div>

                        <Button
                          type="submit"
                          variant="attacker"
                          size="md"
                          loading={submitting}
                          disabled={!payloadText.trim()}
                        >
                          <PaperPlaneTilt className="w-4 h-4" weight="bold" />
                          <span>{submitting ? 'Executing...' : 'Submit Payload'}</span>
                        </Button>
                      </div>
                    </form>

                    <PacketBeam
                      active={submitting}
                      accent="crimson"
                      fromLabel={`Vector (${targetStage})`}
                      toLabel={selectedChallenge.dvwa_page_ref || 'DVWA :8081'}
                      statusText={
                        submitting
                          ? 'DISPATCHING...'
                          : displayedResult
                            ? `HTTP ${displayedResult.dvwa_http_status ?? 200} · ${lastLatencyMs ?? '--'}ms`
                            : 'READY'
                      }
                    />

                    {/* Verdict Stamp + Momentum CTA + Live Evidence */}
                    {displayedResult ? (
                      <div className="p-3 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <VerdictStamp
                            status={displayedResult.status === 'success' ? 'exploit' : 'failed'}
                            label={
                              displayedResult.status === 'success'
                                ? 'EXPLOIT VERIFIED'
                                : 'PAYLOAD REJECTED'
                            }
                            sublabel={
                              displayedResult.status === 'success'
                                ? `+${displayedResult.score_earned} PTS · #${displayedResult.attempt_id}`
                                : `STAGE ${targetStage.toUpperCase()} · #${displayedResult.attempt_id}`
                            }
                          />

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                displayedResult.verification_mode === 'dvwa_live' ? 'cobalt' : 'amber'
                              }
                            >
                              {displayedResult.verification_mode === 'dvwa_live'
                                ? `Live DVWA · HTTP ${displayedResult.dvwa_http_status ?? 200}`
                                : 'Heuristic'}
                            </Badge>

                            {displayedResult.status === 'success' && nextEscalationStage ? (
                              <Button
                                type="button"
                                variant="attacker"
                                size="sm"
                                onClick={() => {
                                  handleTierChange(nextEscalationStage);
                                  setFocusEditorNonce((n) => n + 1);
                                }}
                              >
                                <span>
                                  Escalate to{' '}
                                  {nextEscalationStage.charAt(0).toUpperCase() +
                                    nextEscalationStage.slice(1)}
                                </span>
                                <ArrowRight className="w-4 h-4" weight="bold" />
                              </Button>
                            ) : displayedResult.status === 'success' ? (
                              <Button
                                type="button"
                                variant="attacker"
                                size="sm"
                                onClick={handleSelectNextUnsolved}
                              >
                                <span>Next Target</span>
                                <ArrowRight className="w-4 h-4" weight="bold" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="attacker"
                                  size="sm"
                                  onClick={() => {
                                    setUnlockedHintTier((prev) => Math.max(prev, 1));
                                    setLeftSubTab('hints');
                                  }}
                                >
                                  <Lightbulb className="w-4 h-4" weight="bold" />
                                  <span>Open Hint 1</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setRightSubTab('wire')}
                                >
                                  <Globe className="w-4 h-4" weight="regular" />
                                  <span>Inspect Wire</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="cf-darkroom rounded-md bg-[#0E1014] border border-[#111317] p-2.5 font-mono text-[13.5px] text-[#ECEFF4] max-h-20 overflow-y-auto whitespace-pre-wrap break-words">
                          {displayedResult.evidence
                            ? String(displayedResult.evidence)
                            : displayedResult.status === 'success'
                              ? `Exploitation confirmed on ${selectedChallenge.title} at ${targetStage.toUpperCase()} tier.`
                              : `Payload blocked at ${targetStage.toUpperCase()} tier on ${selectedChallenge.title}. Inspect ${targetStage}.php in the right terminal to spot the filter, or click Open Hint 1.`}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-1.5">
                        <div className="text-[15px] font-bold text-[#111317]">
                          Target Ready: {selectedChallenge.title}
                        </div>
                        <p className="text-[14px] text-[#4B5260] leading-relaxed">
                          Inspect the active <span className="font-mono text-[#111317]">{sourceTier}.php</span>{' '}
                          sink on the right terminal, craft a payload above, and fire with{' '}
                          <span className="font-mono text-[#111317]">Ctrl+Enter</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {leftSubTab === 'hints' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-bold text-[#111317]">
                          Progressive Hints &amp; Stage Intel
                        </h2>
                        <p className="text-[14px] text-[#4B5260]">
                          Unlock conceptual clues step by step without spoiling your exploit flow.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setLeftSubTab('execute');
                          setFocusEditorNonce((n) => n + 1);
                        }}
                      >
                        <span>Back to Execute</span>
                      </Button>
                    </div>

                    {challengeSource?.stage_guides?.[targetStage] && (
                      <div className="p-4 rounded-lg bg-[#EAE4D7]/60 border border-[#111317]/15 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] font-bold text-[#111317]">
                            Active Stage: {targetStage.toUpperCase()}
                          </span>
                          <Badge variant="amber">
                            {challengeSource.stage_guides[targetStage].label}
                          </Badge>
                        </div>
                        <p className="text-[14px] text-[#1C1F26] leading-relaxed">
                          {challengeSource.stage_guides[targetStage].objective}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {progressiveHints.map((hint) => {
                        const isUnlocked = unlockedHintTier >= hint.tier;
                        const isNext = unlockedHintTier + 1 === hint.tier;
                        const canReveal = isUnlocked || isNext;

                        return (
                          <div
                            key={hint.tier}
                            className="p-4 rounded-lg bg-[#EAE4D7]/45 border border-[#111317]/15 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[15px] font-bold text-[#111317]">
                                Hint {hint.tier} · {hint.label}
                              </span>
                              {!isUnlocked ? (
                                <Button
                                  type="button"
                                  variant={canReveal ? 'secondary' : 'ghost'}
                                  size="sm"
                                  disabled={!canReveal}
                                  onClick={() =>
                                    setUnlockedHintTier((prev) => Math.max(prev, hint.tier))
                                  }
                                >
                                  <span>{canReveal ? 'Reveal Hint' : 'Unlock Previous First'}</span>
                                </Button>
                              ) : (
                                <Badge variant="green">Unlocked</Badge>
                              )}
                            </div>

                            {isUnlocked && (
                              hint.tier === 3 ? (
                                <div className="space-y-2">
                                  <pre className="cf-darkroom p-3 rounded bg-[#0E1014] border border-[#111317] font-mono text-[13.5px] text-[#FCA5A5] whitespace-pre-wrap break-all">
                                    {hint.text}
                                  </pre>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setPayloadText(hint.text);
                                      setLeftSubTab('execute');
                                      setFocusEditorNonce((n) => n + 1);
                                    }}
                                  >
                                    Load into Execute
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-[15px] text-[#1C1F26] leading-relaxed">
                                  {hint.text}
                                </p>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {leftSubTab === 'debrief' && (
                  <div className="space-y-4">
                    {showDebrief ? (
                      <div className="p-4 rounded-lg bg-[#047857]/[0.07] border border-[#047857]/30 space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <VerdictStamp
                            status="exploit"
                            label="BREACH CONFIRMED"
                            sublabel={challengeSource?.owasp_category || 'OWASP DEBRIEF'}
                          />
                          <Button
                            type="button"
                            variant="attacker"
                            size="sm"
                            onClick={handleSelectNextUnsolved}
                          >
                            <span>Next Target</span>
                            <ArrowRight className="w-4 h-4" weight="bold" />
                          </Button>
                        </div>

                        <div className="space-y-2.5 text-[14px]">
                          <div className="p-3 rounded bg-[#FAF8F3] border border-[#111317]/15">
                            <div className="font-bold text-[#111317] mb-0.5">Root Cause</div>
                            <p className="text-[#1C1F26] leading-relaxed">
                              {debrief?.root_cause ||
                                `Untrusted input reaches a sensitive ${selectedChallenge.vulnerability_type} sink without validation or encoding.`}
                            </p>
                          </div>
                          <div className="p-3 rounded bg-[#FAF8F3] border border-[#111317]/15">
                            <div className="font-bold text-[#111317] mb-0.5">Impact</div>
                            <p className="text-[#1C1F26] leading-relaxed">
                              {debrief?.impact ||
                                `Attackers can exploit ${selectedChallenge.title} to compromise confidentiality, integrity, or session security.`}
                            </p>
                          </div>
                          <div className="p-3 rounded bg-[#FAF8F3] border border-[#111317]/15">
                            <div className="font-bold text-[#111317] mb-0.5">Prevention</div>
                            <p className="text-[#1C1F26] leading-relaxed">
                              {debrief?.prevention ||
                                'Enforce strict server-side input validation, parameterized APIs, and context-aware output encoding.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-2">
                        <h2 className="text-base font-bold text-[#111317]">
                          OWASP Mastery Debrief Locked
                        </h2>
                        <p className="text-[14px] text-[#4B5260] leading-relaxed">
                          Verify a successful exploit in the Execute tab to unlock the complete Root
                          Cause, Impact, and Prevention breakdown for {selectedChallenge.title}.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[15px] font-bold text-[#111317]">
                          Recent Target Attempts
                        </h3>
                        <span className="text-xs font-mono text-[#4B5260] tabular-nums">
                          {selectedChallengeAttempts.length} recorded
                        </span>
                      </div>
                      {selectedChallengeAttempts.length === 0 ? (
                        <div className="p-4 rounded-lg bg-[#EAE4D7]/40 border border-[#111317]/15 text-[14px] text-[#4B5260]">
                          No attempts submitted for this module yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#111317]/12 rounded-lg border border-[#111317]/15 bg-[#FAF8F3]">
                          {selectedChallengeAttempts.slice(0, 4).map((item) => (
                            <div
                              key={item.attempt_id}
                              className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={item.status === 'success' ? 'green' : 'red'}>
                                    {item.status}
                                  </Badge>
                                  <span className="font-mono text-xs font-semibold text-[#111317]">
                                    +{item.score_earned} pts
                                  </span>
                                  <span className="font-mono text-xs text-[#4B5260]">
                                    {formatUtcTimestamp(item.timestamp)}
                                  </span>
                                </div>
                                <div className="font-mono text-[13px] text-[#1C1F26] truncate">
                                  {item.payload_used}
                                </div>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setPayloadText(item.payload_used);
                                  setLeftSubTab('execute');
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
                  </div>
                )}
              </div>
            </section>

            {/* Right 50%: Recessed Darkroom Terminal */}
            <section className="lg:col-span-6 cf-darkroom rounded-lg bg-[#0E1014] text-[#ECEFF4] border border-[#111317] flex flex-col lg:min-h-0 overflow-hidden">
              <div className="px-4 py-2 border-b border-white/[0.1] bg-[#14171D] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div
                  role="tablist"
                  aria-label="Darkroom telemetry tabs"
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
                            ? 'bg-[#C81E1E] text-[#FAF8F3]'
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
                            setAuditedLine(null);
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
                            ? `DVWA Handler (${sourceTier}.php · ${challengeSource.module_key})`
                            : `DVWA Handler (${sourceTier}.php)`
                        }
                        emptyMessage={`No DVWA ${sourceTier}.php source mapped for this target.`}
                        highlightTone={sourceTier === 'impossible' ? 'amber' : 'crimson'}
                        selectedLine={auditedLine}
                        onSelectLine={setAuditedLine}
                        vulnerableLines={sourceTier === 'low' ? vulnerableLines : []}
                        className="flex-1 min-h-0 border-0 rounded-none"
                      />
                      {sourceTier === 'low' && auditedLine !== null && (
                        <div className="px-4 py-2 border-t border-white/[0.1] bg-[#14171D] flex items-center justify-between gap-2 text-xs font-mono shrink-0">
                          <span
                            className={
                              vulnerableLines.includes(auditedLine)
                                ? 'text-[#FCA5A5]'
                                : 'text-[#C8CFD8]'
                            }
                          >
                            {vulnerableLines.includes(auditedLine)
                              ? `Line ${auditedLine}: Active vulnerable sink handling untrusted input.`
                              : `Line ${auditedLine}: Context/scaffolding line — trace tainted variable into sink.`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAuditedLine(null)}
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
                  <HttpWireInspector wireTrace={displayedResult?.wire_trace} role="attacker" />
                )}

                {rightSubTab === 'sink' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    <LiveSinkVisualizer
                      mode="attack"
                      moduleKey={challengeSource?.module_key}
                      pageRef={selectedChallenge.dvwa_page_ref}
                      vulnerabilityType={selectedChallenge.vulnerability_type}
                      payload={payloadText}
                      stageGuide={challengeSource?.stage_guides?.[targetStage] || null}
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
          title="All Offensive Labs"
          subtitle={`${stats.solved} of ${stats.available} targets compromised · ${stats.totalScore} XP`}
          badge={<Badge variant="red">{filteredChallenges.length} shown</Badge>}
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              {hasActiveTargetFilters ? (
                <Button variant="ghost" size="sm" onClick={resetTargetFilters}>
                  Reset Filters
                </Button>
              ) : (
                <span className="text-xs text-[#4B5260] font-mono">
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
                className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#EAE4D7] border border-[#111317]/15"
              >
                {TARGET_STATUS_FILTERS.map((opt) => {
                  const active = statusFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatusFilter(opt.id)}
                      className={[
                        'flex-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                        active
                          ? 'bg-[#C81E1E] text-[#FAF8F3]'
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
                  No DVWA targets match your active filter criteria.
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
                        isSelected ? 'bg-[#C81E1E]/10' : 'hover:bg-[#EAE4D7]/50',
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
                        <span className="text-xs font-mono font-semibold tabular-nums text-[#111317]">
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
      <div className="lg:h-full lg:min-h-0 flex flex-col gap-3">
        <div className="shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#111317] tracking-tight">Attempt Telemetry</h1>
            <p className="text-[14px] text-[#4B5260] mt-0.5">
              {attempts.length} submissions · {stats.successSubmissions} verified ·{' '}
              {stats.rejectedSubmissions} rejected · {stats.totalScore} XP
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAttemptsPage(1);
                }}
                placeholder="Filter payload or challenge..."
                aria-label="Filter attempt history"
              />
            </div>

            <div
              role="group"
              aria-label="Filter attempts by status"
              className="inline-flex items-center p-1 rounded-md bg-[#EAE4D7] border border-[#111317]/15"
            >
              {ATTEMPT_STATUS_FILTERS.map((opt) => {
                const active = attemptStatusFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAttemptStatusFilter(opt.id);
                      setAttemptsPage(1);
                    }}
                    className={[
                      'px-2.5 py-1 rounded text-xs font-semibold transition-colors',
                      active
                        ? 'bg-[#C81E1E] text-[#FAF8F3]'
                        : 'text-[#4B5260] hover:text-[#111317]',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="w-44">
              <Select
                aria-label="Filter attempts by challenge"
                value={attemptChallengeFilter}
                onChange={(e) => {
                  setAttemptChallengeFilter(e.target.value);
                  setAttemptsPage(1);
                }}
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
            description="Launch a payload from the Lab Studio to log your offensive verification history."
            action={
              <Button variant="attacker" size="sm" onClick={() => setActiveTab('labs')}>
                Open Lab Studio
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
                      <th className="py-3 px-4">Payload Used</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Score</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111317]/10 text-[14px]">
                    {pagedAttempts.map((item) => {
                      const targetChallenge = challenges.find(
                        (ch) => ch.challenge_id === item.challenge_id
                      );
                      return (
                        <tr
                          key={item.attempt_id}
                          onClick={() => setInspectedAttempt(item)}
                          className="cursor-pointer hover:bg-[#EAE4D7]/45 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono tabular-nums text-[#4B5260] whitespace-nowrap">
                            #{item.attempt_id}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#111317] whitespace-nowrap">
                            {item.challenge_title || `Challenge #${item.challenge_id}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="max-w-[220px] xl:max-w-[280px]">
                              <CopyChip value={item.payload_used} label={item.payload_used} />
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant={item.status === 'success' ? 'green' : 'red'}>
                              {item.status}
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
            </div>

            <PaginationBar
              page={safeAttemptPage}
              totalPages={totalAttemptPages}
              totalItems={filteredAttempts.length}
              pageSize={PAGE_SIZE}
              onPageChange={setAttemptsPage}
              itemLabel="attempts"
            />
          </div>
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
                  <Button
                    type="button"
                    variant="attacker"
                    size="sm"
                    onClick={() => {
                      const payload = inspectedAttempt.payload_used;
                      setInspectedAttempt(null);
                      selectChallenge(inspectedTarget, {
                        initialPayload: payload,
                        focusEditor: true,
                      });
                    }}
                  >
                    <span>Open &amp; Load in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                  </Button>
                )}
              </>
            )
          }
        >
          {inspectedAttempt && (
            <div className="space-y-4 text-[14px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15">
                  <div className="text-xs font-semibold text-[#4B5260]">Score Earned</div>
                  <div className="font-display text-2xl font-extrabold text-[#C81E1E] mt-1">
                    +{inspectedAttempt.score_earned} pts
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15">
                  <div className="text-xs font-semibold text-[#4B5260]">Submitted</div>
                  <div className="text-xs font-mono text-[#111317] mt-1.5">
                    {formatUtcTimestamp(inspectedAttempt.timestamp)}
                  </div>
                </div>
              </div>

              {inspectedTarget && (
                <div className="p-3.5 rounded-lg bg-[#EAE4D7]/55 border border-[#111317]/15 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#4B5260]">Vulnerability Class</span>
                    <span className="font-semibold text-[#111317]">
                      {inspectedTarget.vulnerability_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#4B5260]">Difficulty</span>
                    <Badge variant={getDifficultyVariant(inspectedTarget.difficulty)}>
                      {inspectedTarget.difficulty}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#111317]">Payload Submitted</span>
                  <CopyChip value={inspectedAttempt.payload_used} label="Copy payload" />
                </div>
                <pre className="cf-darkroom p-3.5 rounded-lg bg-[#0E1014] border border-[#111317] font-mono text-[13.5px] text-[#ECEFF4] whitespace-pre-wrap break-all">
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
      onSearchChange={
        activeTab === 'attempts'
          ? (val) => {
              setSearchQuery(val);
              setAttemptsPage(1);
            }
          : undefined
      }
      searchPlaceholder={searchPlaceholder}
      commandGroups={commandGroups}
      headerActions={
        typeof onOpenOverview === 'function' ? (
          <Button variant="secondary" size="sm" onClick={onOpenOverview}>
            <Cube className="w-4 h-4 text-[#C81E1E]" weight="regular" />
            <span className="hidden lg:inline">3D Hub</span>
          </Button>
        ) : null
      }
      onSignOut={onSignOut}
    >
      {activeTab === 'paths' && (
        <LearningPathMap
          role="attacker"
          tracks={tracks}
          challenges={challenges}
          summaryMap={attemptSummaryByChallenge}
          stats={stats}
          onSelectChallenge={(ch) => selectChallenge(ch, { focusEditor: true })}
          onContinueMission={handleSelectNextUnsolved}
          onOpenTour={onOpenOverview}
        />
      )}
      {activeTab === 'labs' && renderLabStudioTab()}
      {activeTab === 'attempts' && renderAttemptsTab()}
      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}
      {activeTab === 'settings' && <SettingsView user={user} onAccountDeleted={onSignOut} />}
      <TactileToast toasts={toasts} onDismiss={dismissToast} />
    </CommandDeckShell>
  );
}
