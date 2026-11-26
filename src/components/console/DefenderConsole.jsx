import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  ArrowSquareOut,
  CheckCircle,
  ClockCounterClockwise,
  Gear,
  LockKey,
  ShieldCheck,
  ShieldWarning,
  Trophy,
  User,
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
} from '../ui/primitives';

const SECURITY_LEVELS = [
  {
    value: 'low',
    label: 'Low',
    badge: 'red',
    points: 25,
    description: 'Vulnerable baseline configuration. Exploitation vectors remain unmitigated.',
  },
  {
    value: 'medium',
    label: 'Medium',
    badge: 'amber',
    points: 25,
    description: 'Partial filtering applied. Determined attack vectors can still bypass controls.',
  },
  {
    value: 'high',
    label: 'High',
    badge: 'teal',
    points: 150,
    description: 'Strict input validation and hardened defense rules. Passes replay verification.',
  },
  {
    value: 'impossible',
    label: 'Impossible',
    badge: 'green',
    points: 150,
    description: 'Reference-grade parameterized remediation. Fully blocks the attack payload.',
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

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export default function DefenderConsole({ user, onSignOut, onOpenOverview }) {
  const [activeTab, setActiveTab] = useState('challenges');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [defenseVerifiedFilter, setDefenseVerifiedFilter] = useState('all');

  const defenderId = user?.id;

  const [challenges, setChallenges] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(defenderId));
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('high');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [lastResult, setLastResult] = useState(null);

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
          setChallenges(Array.isArray(challengeList) ? challengeList : []);
          setDefenses(Array.isArray(defenseList) ? defenseList : []);
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

  const loadData = useCallback(async () => {
    if (!defenderId) return;
    setRefreshing(true);
    setLoadError('');
    try {
      const [challengeList, defenseList] = await Promise.all([
        apiFetch('/api/challenges'),
        apiFetch(`/api/defenses?defender_id=${encodeURIComponent(defenderId)}`),
      ]);
      setChallenges(Array.isArray(challengeList) ? challengeList : []);
      setDefenses(Array.isArray(defenseList) ? defenseList : []);
    } catch (err) {
      setLoadError(err.message || 'Unable to load assigned challenges and defenses.');
    } finally {
      setRefreshing(false);
    }
  }, [defenderId]);

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
          latest: prev.latest, // defenses are newest-first
        });
      }
    }
    return map;
  }, [defenses]);

  const stats = useMemo(() => {
    let verifiedCount = 0;
    for (const ch of challenges) {
      const summary = defenseSummaryByChallenge.get(ch.challenge_id);
      if (summary?.verified) {
        verifiedCount += 1;
      }
    }
    const pendingCount = Math.max(0, challenges.length - verifiedCount);
    const totalScore = defenses.reduce((sum, item) => sum + (Number(item.score_earned) || 0), 0);
    return {
      assigned: challenges.length,
      verified: verifiedCount,
      pending: pendingCount,
      totalScore,
    };
  }, [challenges, defenses, defenseSummaryByChallenge]);

  const categories = useMemo(() => {
    const unique = new Set(
      challenges.map((ch) => (ch.vulnerability_type || '').trim()).filter(Boolean)
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
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
      if (!q) return true;
      return (
        (ch.title || '').toLowerCase().includes(q) ||
        (ch.vulnerability_type || '').toLowerCase().includes(q) ||
        (ch.difficulty || '').toLowerCase().includes(q) ||
        (ch.dvwa_page_ref || '').toLowerCase().includes(q) ||
        currentLevel.includes(q)
      );
    });
  }, [challenges, categoryFilter, levelFilter, searchQuery, defenseSummaryByChallenge]);

  const filteredDefenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return defenses.filter((item) => {
      if (defenseVerifiedFilter === 'verified' && !item.verified) return false;
      if (defenseVerifiedFilter === 'unverified' && item.verified) return false;
      if (!q) return true;
      return (
        (item.challenge_title || '').toLowerCase().includes(q) ||
        (item.security_level_applied || '').toLowerCase().includes(q) ||
        String(item.defense_id).includes(q)
      );
    });
  }, [defenses, defenseVerifiedFilter, searchQuery]);

  const selectedChallenge = useMemo(
    () => challenges.find((ch) => ch.challenge_id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );

  function openRemediationWorkspace(challenge) {
    const summary = defenseSummaryByChallenge.get(challenge.challenge_id);
    const current = summary?.latest?.security_level_applied;
    setActiveTab('challenges');
    setSelectedChallengeId(challenge.challenge_id);
    setSelectedLevel(current && current !== 'low' ? current : 'high');
    setSubmitError('');
    setLastResult(null);
  }

  function handleBackToChallenges() {
    setSelectedChallengeId(null);
    setSubmitError('');
    setLastResult(null);
  }

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    if (nextTab === 'challenges') {
      setSelectedChallengeId(null);
    }
  }

  async function handleSubmitDefense(event) {
    if (event) event.preventDefault();
    if (!selectedChallenge || !defenderId || submitting) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await apiFetch('/api/defenses', {
        method: 'POST',
        body: {
          defender_id: defenderId,
          challenge_id: selectedChallenge.challenge_id,
          security_level_applied: selectedLevel,
        },
      });
      setLastResult(response);
      setDefenses((prev) => [response, ...prev]);
    } catch (err) {
      setSubmitError(err.message || 'Failed to apply defense configuration.');
    } finally {
      setSubmitting(false);
    }
  }

  const navItems = [
    { id: 'challenges', label: 'Assigned Challenges', icon: ShieldCheck, badge: challenges.length },
    { id: 'defenses', label: 'My Defenses', icon: ClockCounterClockwise, badge: defenses.length },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Gear },
  ];

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
      detail: 'Hardened & replay-passed',
      icon: CheckCircle,
      accent: 'green',
    },
    {
      label: 'Pending',
      value: stats.pending,
      detail: 'Awaiting remediation',
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

  const searchPlaceholder =
    activeTab === 'defenses'
      ? 'Search defenses by challenge or security level...'
      : 'Search assigned challenges by title, category, or endpoint...';

  function renderWorkspace() {
    if (!selectedChallenge) return null;
    const summary = defenseSummaryByChallenge.get(selectedChallenge.challenge_id);
    const currentApplied = summary?.latest?.security_level_applied || null;
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
            {summary?.verified ? (
              <Badge variant="green">
                <CheckCircle className="w-3 h-3" weight="bold" />
                Verified
              </Badge>
            ) : currentApplied ? (
              <Badge variant={getLevelBadgeVariant(currentApplied)}>
                Applied: {currentApplied}
              </Badge>
            ) : (
              <Badge variant="neutral">Pending</Badge>
            )}
          </div>

          <div className="text-xs font-mono tabular-nums text-zinc-400 shrink-0">
            Verified Reward: <span className="text-[#00E5CC] font-semibold">150 pts</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Security Level Selector + Verification Outcome */}
          <div className="lg:col-span-7 space-y-4">
            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LockKey className="w-4 h-4 text-[#00E5CC]" weight="regular" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    DVWA Security Level Control
                  </h2>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  Current: {currentApplied || 'none'}
                </span>
              </div>

              <form onSubmit={handleSubmitDefense} className="p-4 space-y-4">
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
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
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
                          'text-left p-3.5 rounded-[6px] border transition-colors duration-150',
                          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
                          isSelected
                            ? 'bg-[#1B1B1E] border-[#00E5CC]'
                            : 'bg-[#0A0A0B] border-[#232326] hover:border-[#3A3A40]',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={lvl.badge}>{lvl.label}</Badge>
                          <span className="text-xs font-mono tabular-nums text-zinc-400">
                            {lvl.points} pts
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                          {lvl.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#232326]">
                  <span className="text-xs text-zinc-400">
                    Levels <span className="font-mono text-zinc-200">high</span> and{' '}
                    <span className="font-mono text-zinc-200">impossible</span> block the replay
                    vector.
                  </span>
                  <Button type="submit" variant="primary" size="md" loading={submitting}>
                    <ShieldCheck className="w-4 h-4" weight="bold" />
                    <span>Apply &amp; Verify Defense</span>
                  </Button>
                </div>
              </form>
            </section>

            {/* Verification Outcome */}
            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326] flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">Verification Outcome</h2>
                {lastResult ? (
                  <Badge variant={lastResult.verified ? 'green' : 'amber'}>
                    {lastResult.verified ? (
                      <CheckCircle className="w-3 h-3" weight="bold" />
                    ) : (
                      <ShieldWarning className="w-3 h-3" weight="bold" />
                    )}
                    {lastResult.verified ? 'Remediation Verified' : 'Exploit Not Blocked'}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Awaiting Verification</Badge>
                )}
              </div>

              <div className="p-4">
                {lastResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326]">
                        <div className="text-[11px] text-zinc-500">Security Applied</div>
                        <div className="text-sm font-mono font-semibold text-zinc-100 mt-1 uppercase">
                          {lastResult.security_level_applied}
                        </div>
                      </div>
                      <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326]">
                        <div className="text-[11px] text-zinc-500">Score Earned</div>
                        <div className="text-sm font-mono font-semibold tabular-nums text-[#00E5CC] mt-1">
                          +{lastResult.score_earned} pts
                        </div>
                      </div>
                      <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326]">
                        <div className="text-[11px] text-zinc-500">Defense ID</div>
                        <div className="text-sm font-mono tabular-nums text-zinc-200 mt-1">
                          #{lastResult.defense_id}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326] font-mono text-xs space-y-1.5">
                      <div className="text-zinc-400">
                        <span className="text-zinc-500">target:</span> {targetUrl}
                      </div>
                      <div className="text-zinc-400">
                        <span className="text-zinc-500">timestamp:</span>{' '}
                        {formatTimestamp(lastResult.timestamp)}
                      </div>
                      <div
                        className={
                          lastResult.verified ? 'text-[#10B981] pt-1' : 'text-[#F59E0B] pt-1'
                        }
                      >
                        {lastResult.verified
                          ? `> Replay of reference vector blocked under '${lastResult.security_level_applied}' security. Defense verified and alert logged.`
                          : `> Reference vector still bypasses '${lastResult.security_level_applied}' security. Raise security to 'high' or 'impossible' to certify remediation.`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-[4px] bg-[#0A0A0B] border border-[#232326] font-mono text-xs text-zinc-400">
                    Select a DVWA security level above and apply it to replay the reference attack
                    vector against <span className="text-zinc-200">{targetUrl}</span>.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Target Info + Replay Vector */}
          <div className="lg:col-span-5 space-y-4">
            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326]">
                <h2 className="text-sm font-semibold text-zinc-100">Challenge &amp; Target Info</h2>
              </div>
              <dl className="divide-y divide-[#232326] text-xs">
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <dt className="text-zinc-400 shrink-0">Target Page</dt>
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
                  <dt className="text-zinc-400">Vulnerability</dt>
                  <dd className="font-medium text-zinc-100">
                    {selectedChallenge.vulnerability_type}
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
                  <dt className="text-zinc-400">Applied Security</dt>
                  <dd>
                    {currentApplied ? (
                      <Badge variant={getLevelBadgeVariant(currentApplied)}>{currentApplied}</Badge>
                    ) : (
                      <span className="text-zinc-500 font-mono">Not applied</span>
                    )}
                  </dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">Defense Submissions</dt>
                  <dd className="font-mono tabular-nums text-zinc-100">{summary?.count || 0}</dd>
                </div>
              </dl>
            </section>

            <section className="bg-[#141416] border border-[#232326] rounded-[6px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#232326]">
                <h2 className="text-sm font-semibold text-zinc-100">Reference Attack Replay</h2>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <p className="text-zinc-400 leading-relaxed">
                  When you apply a security level, CyberForge replays the reference vector below
                  against{' '}
                  <span className="text-zinc-200 font-medium">{selectedChallenge.title}</span> to
                  confirm whether the vulnerability is blocked:
                </p>
                <pre className="p-3 rounded-[4px] bg-[#0A0A0B] border border-[#232326] font-mono text-xs text-zinc-200 whitespace-pre-wrap break-all">
                  {selectedChallenge.reference_payload}
                </pre>
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
              Assigned Challenges
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Harden DVWA security levels and verify remediation against replay attack vectors.
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
            label="Assigned"
            value={stats.assigned}
            detail={`${categories.length} categories`}
            icon={ShieldCheck}
            loading={loading}
          />
          <StatTile
            label="Verified"
            value={stats.verified}
            detail="Replay tests blocked"
            icon={CheckCircle}
            accent="green"
            loading={loading}
          />
          <StatTile
            label="Pending"
            value={stats.pending}
            detail="Need high/impossible level"
            icon={ShieldWarning}
            accent="amber"
            loading={loading}
          />
          <StatTile
            label="Total Score"
            value={stats.totalScore}
            detail={`${defenses.length} defense submissions`}
            icon={Trophy}
            accent="teal"
            loading={loading}
          />
        </div>

        {/* Filters */}
        <div className="bg-[#141416] border border-[#232326] rounded-[6px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[400px]">
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
              <option value="all">All Security Levels</option>
              <option value="none">Not Applied</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="impossible">Impossible</option>
            </Select>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-zinc-400">
            <span className="font-mono tabular-nums">
              {filteredChallenges.length} of {challenges.length} challenges
            </span>
            {(categoryFilter !== 'all' || levelFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter('all');
                  setLevelFilter('all');
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
            icon={ShieldCheck}
            title="No matching challenges"
            description="No assigned challenges match your current category, security level, or search filter."
            action={
              (categoryFilter !== 'all' || levelFilter !== 'all' || searchQuery) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter('all');
                    setLevelFilter('all');
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
              const summary = defenseSummaryByChallenge.get(ch.challenge_id);
              const currentLevel = summary?.latest?.security_level_applied || null;
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
                    <div className="flex items-center gap-2">
                      {currentLevel ? (
                        <Badge variant={getLevelBadgeVariant(currentLevel)}>
                          Level: {currentLevel}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Level: none</Badge>
                      )}
                      {summary?.verified ? (
                        <Badge variant="green">
                          <CheckCircle className="w-3 h-3" weight="bold" />
                          Verified
                        </Badge>
                      ) : currentLevel ? (
                        <Badge variant="amber">Unverified</Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openRemediationWorkspace(ch)}
                    >
                      <span>Raise Security</span>
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

  function renderDefensesTab() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">My Defenses</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Audit trail of security level remediations and replay verification results.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              aria-label="Filter defenses by verification status"
              value={defenseVerifiedFilter}
              onChange={(e) => setDefenseVerifiedFilter(e.target.value)}
              className="w-44"
            >
              <option value="all">All Submissions</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
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
        ) : filteredDefenses.length === 0 ? (
          <EmptyState
            icon={ClockCounterClockwise}
            title="No defenses submitted yet"
            description="Raise a challenge's DVWA security level in Assigned Challenges to verify remediation."
            action={
              <Button variant="primary" size="sm" onClick={() => handleTabChange('challenges')}>
                View Assigned Challenges
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
                  <th className="py-3 px-4">Security Level</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232326] text-xs">
                {filteredDefenses.map((item) => {
                  const targetChallenge = challenges.find(
                    (ch) => ch.challenge_id === item.challenge_id
                  );
                  return (
                    <tr key={item.defense_id} className="hover:bg-[#1B1B1E]/60 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-zinc-400">
                        #{item.defense_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-100 whitespace-nowrap">
                        {item.challenge_title || `Challenge #${item.challenge_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getLevelBadgeVariant(item.security_level_applied)}>
                          {item.security_level_applied}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={item.verified ? 'green' : 'amber'}>
                          {item.verified ? 'Verified' : 'Unverified'}
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
                            onClick={() => openRemediationWorkspace(targetChallenge)}
                          >
                            <span>Configure</span>
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
      {activeTab === 'defenses' && renderDefensesTab()}
      {activeTab === 'profile' && <ProfileView user={user} stats={profileStats} />}
      {activeTab === 'settings' && <SettingsView user={user} onAccountDeleted={onSignOut} />}
    </ConsoleShell>
  );
}
