import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  Crosshair,
  Eraser,
  Eye,
  EyeSlash,
  Gear,
  PaperPlaneTilt,
  Target,
  TerminalWindow,
  Trophy,
  User,
  XCircle,
} from '@phosphor-icons/react';
import { apiFetch } from '../../utils/api';
import ConsoleShell from './ConsoleShell';
import { ProfileView, SettingsView } from './AccountViews';
import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  Select,
  SkeletonRows,
  StatTile,
  Textarea,
} from '../ui/primitives';

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

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export default function AttackerConsole({ user, onSignOut, onOpenOverview }) {
  const [activeTab, setActiveTab] = useState('challenges');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [attemptStatusFilter, setAttemptStatusFilter] = useState('all');

  const attackerId = user?.id;

  const [challenges, setChallenges] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(attackerId));
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [payloadText, setPayloadText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [showHint, setShowHint] = useState(false);

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
          setChallenges(Array.isArray(challengeList) ? challengeList : []);
          setAttempts(Array.isArray(attemptList) ? attemptList : []);
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

  const loadData = useCallback(async () => {
    if (!attackerId) return;
    setRefreshing(true);
    setLoadError('');
    try {
      const [challengeList, attemptList] = await Promise.all([
        apiFetch('/api/challenges'),
        apiFetch(`/api/attempts?attacker_id=${encodeURIComponent(attackerId)}`),
      ]);
      setChallenges(Array.isArray(challengeList) ? challengeList : []);
      setAttempts(Array.isArray(attemptList) ? attemptList : []);
    } catch (err) {
      setLoadError(err.message || 'Unable to load challenges and attempt telemetry.');
    } finally {
      setRefreshing(false);
    }
  }, [attackerId]);

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
        if (summary.solved) {
          solvedCount += 1;
        }
      }
    }
    const totalScore = attempts.reduce((sum, item) => sum + (Number(item.score_earned) || 0), 0);
    return {
      available: challenges.length,
      attempted: attemptedCount,
      solved: solvedCount,
      totalScore,
    };
  }, [challenges, attempts, attemptSummaryByChallenge]);

  const categories = useMemo(() => {
    const unique = new Set(
      challenges.map((ch) => (ch.vulnerability_type || '').trim()).filter(Boolean)
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return challenges.filter((ch) => {
      if (categoryFilter !== 'all' && (ch.vulnerability_type || '').trim() !== categoryFilter) {
        return false;
      }
      if (
        difficultyFilter !== 'all' &&
        (ch.difficulty || '').trim().toLowerCase() !== difficultyFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (ch.title || '').toLowerCase().includes(q) ||
        (ch.vulnerability_type || '').toLowerCase().includes(q) ||
        (ch.difficulty || '').toLowerCase().includes(q) ||
        (ch.dvwa_page_ref || '').toLowerCase().includes(q)
      );
    });
  }, [challenges, categoryFilter, difficultyFilter, searchQuery]);

  const filteredAttempts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attempts.filter((item) => {
      if (attemptStatusFilter !== 'all' && item.status !== attemptStatusFilter) {
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
  }, [attempts, attemptStatusFilter, searchQuery]);

  const selectedChallenge = useMemo(
    () => challenges.find((ch) => ch.challenge_id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );

  function openChallengeWorkspace(challenge) {
    setActiveTab('challenges');
    setSelectedChallengeId(challenge.challenge_id);
    setPayloadText('');
    setSubmitError('');
    setLastResult(null);
    setShowHint(false);
  }

  function handleBackToChallenges() {
    setSelectedChallengeId(null);
    setSubmitError('');
    setLastResult(null);
    setShowHint(false);
  }

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    if (nextTab === 'challenges') {
      setSelectedChallengeId(null);
    }
  }

  async function handleSubmitPayload(event) {
    if (event) event.preventDefault();
    if (!selectedChallenge || !attackerId || submitting) return;

    const trimmed = payloadText.trim();
    if (!trimmed) {
      setSubmitError('Enter an exploit payload before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await apiFetch('/api/attempts', {
        method: 'POST',
        body: {
          attacker_id: attackerId,
          challenge_id: selectedChallenge.challenge_id,
          payload_used: payloadText,
        },
      });
      setLastResult(response);
      setAttempts((prev) => [response, ...prev]);
    } catch (err) {
      setSubmitError(err.message || 'Payload evaluation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const navItems = [
    { id: 'challenges', label: 'Challenges', icon: Crosshair, badge: challenges.length },
    { id: 'attempts', label: 'My Attempts', icon: ClockCounterClockwise, badge: attempts.length },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Gear },
  ];

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
      detail: 'Verified exploit vectors',
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

  const searchPlaceholder =
    activeTab === 'attempts'
      ? 'Search attempts by challenge or payload...'
      : 'Search challenges by title, category, or endpoint...';

  function renderWorkspace() {
    if (!selectedChallenge) return null;
    const summary = attemptSummaryByChallenge.get(selectedChallenge.challenge_id) || {
      count: 0,
      solved: false,
      latest: null,
    };
    const points = getPointsForDifficulty(selectedChallenge.difficulty);
    const targetUrl = formatDvwaUrl(selectedChallenge.dvwa_page_ref);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#232326]">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleBackToChallenges}>
              <ArrowLeft className="w-4 h-4" weight="bold" />
              <span>&larr; Back to Challenges</span>
            </Button>
            <div className="h-4 w-px bg-[#232326] hidden sm:block" />
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight truncate">
              {selectedChallenge.title}
            </h1>
            <Badge variant={getDifficultyVariant(selectedChallenge.difficulty)}>
              {selectedChallenge.difficulty}
            </Badge>
            {summary.solved && (
              <Badge variant="green">
                <CheckCircle className="w-3 h-3" weight="bold" />
                Solved
              </Badge>
            )}
          </div>

          <div className="text-xs font-mono tabular-nums text-zinc-400 shrink-0">
            Reward: <span className="text-[#00E5CC] font-semibold">{points} pts</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Payload Editor + Server Response */}
          <div className="lg:col-span-7 space-y-4">
            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TerminalWindow className="w-4 h-4 text-[#00E5CC]" weight="regular" />
                  <h2 className="text-sm font-semibold text-zinc-100">Payload Editor</h2>
                </div>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 bg-[#0A0A0B] border border-[#232326] rounded-[4px]">
                  Ctrl+Enter
                </kbd>
              </div>

              <form onSubmit={handleSubmitPayload} className="p-4 space-y-3">
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
                  id="cf-payload-editor"
                  rows={7}
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitPayload();
                    }
                  }}
                  placeholder={`Enter ${selectedChallenge.vulnerability_type} exploit payload for ${selectedChallenge.dvwa_page_ref}...`}
                  disabled={submitting}
                  className="font-mono text-xs leading-relaxed"
                />

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-zinc-500 font-mono tabular-nums">
                    {payloadText.length} chars
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setPayloadText('');
                        setSubmitError('');
                      }}
                      disabled={submitting || !payloadText}
                    >
                      <Eraser className="w-3.5 h-3.5" weight="regular" />
                      <span>Clear</span>
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={submitting}
                      disabled={!payloadText.trim()}
                    >
                      <PaperPlaneTilt className="w-3.5 h-3.5" weight="bold" />
                      <span>Submit Payload</span>
                    </Button>
                  </div>
                </div>
              </form>
            </section>

            {/* Server Response Console */}
            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326] flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Server Response</h2>
                {lastResult ? (
                  <Badge variant={lastResult.status === 'success' ? 'green' : 'red'}>
                    {lastResult.status === 'success' ? (
                      <CheckCircle className="w-3 h-3" weight="bold" />
                    ) : (
                      <XCircle className="w-3 h-3" weight="bold" />
                    )}
                    {lastResult.status === 'success' ? 'Exploit Verified' : 'Payload Rejected'}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Awaiting Execution</Badge>
                )}
              </div>

              <div className="p-4">
                {lastResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326]">
                        <div className="text-[11px] text-zinc-500">Status</div>
                        <div
                          className={[
                            'text-sm font-mono font-semibold mt-1 uppercase',
                            lastResult.status === 'success'
                              ? 'text-[#10B981]'
                              : 'text-[#EF4444]',
                          ].join(' ')}
                        >
                          {lastResult.status}
                        </div>
                      </div>
                      <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326]">
                        <div className="text-[11px] text-zinc-500">Score Earned</div>
                        <div className="text-sm font-mono font-semibold tabular-nums text-[#00E5CC] mt-1">
                          +{lastResult.score_earned} pts
                        </div>
                      </div>
                      <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326]">
                        <div className="text-[11px] text-zinc-500">Attempt ID</div>
                        <div className="text-sm font-mono tabular-nums text-zinc-200 mt-1">
                          #{lastResult.attempt_id}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326] font-mono text-xs space-y-1.5">
                      <div className="text-zinc-400">
                        <span className="text-zinc-500">target:</span> {targetUrl}
                      </div>
                      <div className="text-zinc-400 break-all">
                        <span className="text-zinc-500">payload:</span>{' '}
                        <span className="text-zinc-200">{lastResult.payload_used}</span>
                      </div>
                      <div className="text-zinc-400">
                        <span className="text-zinc-500">timestamp:</span>{' '}
                        {formatTimestamp(lastResult.timestamp)}
                      </div>
                      <div
                        className={
                          lastResult.status === 'success'
                            ? 'text-[#10B981] pt-1'
                            : 'text-[#F59E0B] pt-1'
                        }
                      >
                        {lastResult.status === 'success'
                          ? `> Exploitation confirmed on ${selectedChallenge.title}. Alert logged to moderator telemetry.`
                          : `> Vector did not satisfy ${selectedChallenge.vulnerability_type} verification criteria. Adjust payload and retry.`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-[4px] bg-[#0A0A0B] border border-[#232326] font-mono text-xs text-zinc-400">
                    Ready to evaluate payload against{' '}
                    <span className="text-zinc-200">{targetUrl}</span>. Submit a payload above
                    or press Ctrl+Enter.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Challenge Info + Objective + Reference Vector */}
          <div className="lg:col-span-5 space-y-4">
            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326]">
                <h2 className="text-sm font-semibold text-zinc-100">Challenge Info</h2>
              </div>
              <dl className="divide-y divide-[#232326] text-xs">
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <dt className="text-zinc-400 shrink-0">Target URL</dt>
                  <dd className="text-right min-w-0">
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[#00E5CC] hover:underline break-all"
                    >
                      <span>{targetUrl}</span>
                      <ArrowSquareOut className="w-3.5 h-3.5 shrink-0" weight="regular" />
                    </a>
                  </dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">Difficulty</dt>
                  <dd>
                    <Badge variant={getDifficultyVariant(selectedChallenge.difficulty)}>
                      {selectedChallenge.difficulty}
                    </Badge>
                  </dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">Category</dt>
                  <dd className="font-medium text-zinc-100">
                    {selectedChallenge.vulnerability_type}
                  </dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">Points</dt>
                  <dd className="font-mono tabular-nums text-zinc-100">{points} pts</dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">Attempts</dt>
                  <dd className="font-mono tabular-nums text-zinc-100">{summary.count}</dd>
                </div>
              </dl>
            </section>

            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326]">
                <h2 className="text-sm font-semibold text-zinc-100">Objective</h2>
              </div>
              <div className="p-4 text-xs text-zinc-300 leading-relaxed space-y-2">
                <p>
                  Probe the DVWA endpoint at{' '}
                  <code className="font-mono text-zinc-100 bg-[#0A0A0B] px-1.5 py-0.5 rounded-[4px] border border-[#232326]">
                    {selectedChallenge.dvwa_page_ref}
                  </code>{' '}
                  and craft a working{' '}
                  <span className="text-zinc-100 font-medium">
                    {selectedChallenge.vulnerability_type}
                  </span>{' '}
                  exploit vector.
                </p>
                <p className="text-zinc-400">
                  Submit your payload in the editor to trigger verification against the challenge
                  rule set and earn {points} points upon success.
                </p>
              </div>
            </section>

            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326] flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Reference Vector</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHint((prev) => !prev)}
                >
                  {showHint ? (
                    <>
                      <EyeSlash className="w-3.5 h-3.5" weight="regular" />
                      <span>Hide Hint</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" weight="regular" />
                      <span>Reveal Hint</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4">
                {showHint ? (
                  <div className="space-y-3">
                    <pre className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326] font-mono text-xs text-[#00E5CC] whitespace-pre-wrap break-all">
                      {selectedChallenge.reference_payload}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPayloadText(selectedChallenge.reference_payload)}
                    >
                      Use in Payload Editor
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Reference payload hidden. Reveal the hint if you need an example vector for
                    this vulnerability class.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  function renderChallengesTab() {
    if (selectedChallenge) {
      return renderWorkspace();
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Offensive Challenges
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Select a DVWA target module to craft and verify exploit payloads.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            loading={refreshing}
          >
            <ArrowsClockwise className="w-3.5 h-3.5" weight="regular" />
            <span>Refresh</span>
          </Button>
        </div>

        {loadError && (
          <AlertBanner variant="error" message={loadError} onDismiss={() => setLoadError('')} />
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            label="Available"
            value={stats.available}
            detail={`${categories.length} categories`}
            icon={Target}
            loading={loading}
          />
          <StatTile
            label="Attempted"
            value={stats.attempted}
            detail={`${attempts.length} total submissions`}
            icon={TerminalWindow}
            accent="amber"
            loading={loading}
          />
          <StatTile
            label="Solved"
            value={stats.solved}
            detail="Verified compromises"
            icon={CheckCircle}
            accent="green"
            loading={loading}
          />
          <StatTile
            label="Total Score"
            value={stats.totalScore}
            detail="Easy 50 · Med 100 · Hard 250"
            icon={Trophy}
            accent="teal"
            loading={loading}
          />
        </div>

        {/* Filters */}
        <div className="bg-[#141416] border border-[#232326] rounded-[6px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[380px]">
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

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-zinc-400">
            <span className="font-mono tabular-nums">
              {filteredChallenges.length} of {challenges.length} challenges
            </span>
            {(categoryFilter !== 'all' || difficultyFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter('all');
                  setDifficultyFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={6} columns={5} />
        ) : filteredChallenges.length === 0 ? (
          <EmptyState
            icon={Crosshair}
            title="No matching challenges"
            description="No DVWA challenges match your current category, difficulty, or search filter."
            action={
              (categoryFilter !== 'all' || difficultyFilter !== 'all' || searchQuery) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter('all');
                    setDifficultyFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="bg-[#141416] border border-[#232326] rounded-[6px] divide-y divide-[#232326] overflow-hidden">
            {filteredChallenges.map((ch) => {
              const summary = attemptSummaryByChallenge.get(ch.challenge_id);
              const points = getPointsForDifficulty(ch.difficulty);
              return (
                <div
                  key={ch.challenge_id}
                  className="px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#1B1B1E]/60 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-zinc-100">{ch.title}</span>
                      <Badge variant="neutral">{ch.vulnerability_type}</Badge>
                      <Badge variant={getDifficultyVariant(ch.difficulty)}>{ch.difficulty}</Badge>
                    </div>
                    <div className="text-xs font-mono text-zinc-500 truncate">
                      {formatDvwaUrl(ch.dvwa_page_ref)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono tabular-nums text-zinc-300">
                        {points} pts
                      </span>
                      {summary?.solved ? (
                        <Badge variant="green">
                          <CheckCircle className="w-3 h-3" weight="bold" />
                          Solved
                        </Badge>
                      ) : summary?.count > 0 ? (
                        <Badge variant="amber">{summary.count} attempts</Badge>
                      ) : (
                        <Badge variant="neutral">Unsolved</Badge>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openChallengeWorkspace(ch)}
                    >
                      <span>Attempt</span>
                      <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderAttemptsTab() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">My Attempts</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Full chronological log of exploit payloads you have submitted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              aria-label="Filter attempts by status"
              value={attemptStatusFilter}
              onChange={(e) => setAttemptStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </Select>
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
            description="Launch a payload from the Challenges view to log your offensive verification history."
            action={
              <Button variant="primary" size="sm" onClick={() => handleTabChange('challenges')}>
                Browse Challenges
              </Button>
            }
          />
        ) : (
          <div className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#232326] text-[11px] font-medium text-zinc-400">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Challenge</th>
                  <th className="py-3 px-4">Payload Used</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232326] text-xs">
                {filteredAttempts.map((item) => {
                  const targetChallenge = challenges.find(
                    (ch) => ch.challenge_id === item.challenge_id
                  );
                  return (
                    <tr key={item.attempt_id} className="hover:bg-[#1B1B1E]/60 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-zinc-400">
                        #{item.attempt_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-100 whitespace-nowrap">
                        {item.challenge_title || `Challenge #${item.challenge_id}`}
                      </td>
                      <td
                        className="py-3 px-4 font-mono text-zinc-300 max-w-xs truncate"
                        title={item.payload_used}
                      >
                        {item.payload_used}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={item.status === 'success' ? 'green' : 'red'}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100">
                        +{item.score_earned}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                        {formatTimestamp(item.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {targetChallenge && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openChallengeWorkspace(targetChallenge)}
                          >
                            <span>Retry</span>
                            <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                          </Button>
                        )}
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

  return (
    <ConsoleShell
      user={user}
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={searchPlaceholder}
      onSignOut={onSignOut}
      onOpenOverview={onOpenOverview}
    >
      {activeTab === 'challenges' && renderChallengesTab()}
      {activeTab === 'attempts' && renderAttemptsTab()}
      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}
      {activeTab === 'settings' && <SettingsView user={user} onAccountDeleted={onSignOut} />}
    </ConsoleShell>
  );
}
