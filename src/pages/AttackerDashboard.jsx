import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Crosshair, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Trophy, 
  Flame, 
  Filter,
  ExternalLink
} from 'lucide-react';
import { getDifficultyBadgeColor, getDifficultyPoints } from '../data/mockData';

export default function AttackerDashboard({ onSelectChallenge }) {
  const { challenges, attempts, currentUser } = useApp();
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which challenges have been successfully solved by this attacker
  const myAttempts = attempts.filter(a => a.attacker_id === (currentUser?.attacker_id || 201));
  const solvedChallengeIds = new Set(
    myAttempts.filter(a => a.status === 'SUCCESS').map(a => a.challenge_id)
  );

  const totalScore = myAttempts
    .filter(a => a.status === 'SUCCESS')
    .reduce((sum, a) => sum + (a.score_earned || 0), 0);

  // Filter challenges
  const filteredChallenges = challenges.filter(ch => {
    const matchesDifficulty = filterDifficulty === 'ALL' || ch.difficulty.toUpperCase() === filterDifficulty;
    const matchesSearch = ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.vulnerability_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-accent bg-cyan-dim px-2 py-0.5 rounded-sharp border border-cyan-accent/20 uppercase font-semibold">
              ATTACKER SUBSYSTEM
            </span>
            <span className="text-xs font-mono text-zinc-500">
              OPERATOR ID: #{currentUser?.attacker_id || '201'}
            </span>
          </div>
          <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
            Active Challenges Feed
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Exploit vulnerabilities against target DVWA service endpoints. Scores logged in `attempts` table.
          </p>
        </div>

        {/* Quick DVWA direct link */}
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8081"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-panel hover:bg-bg-subtle border border-hairline hover:border-border-subtle rounded-panel text-xs font-mono text-zinc-300 transition-colors"
          >
            <span>Target DVWA :8081</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-accent" />
          </a>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Score Points</span>
            <Trophy className="w-3.5 h-3.5 text-cyan-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {totalScore} <span className="text-xs font-normal text-zinc-500">PTS</span>
          </div>
          <div className="text-[10px] font-mono text-status-green mt-1">
            Rank #1 on local leaderboard
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Breached</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-status-green" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {solvedChallengeIds.size} / {challenges.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            {Math.round((solvedChallengeIds.size / challenges.length) * 100)}% completion rate
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Attempts Logged</span>
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {myAttempts.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Stored in `attempts` table
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Exploit Streak</span>
            <Flame className="w-3.5 h-3.5 text-status-red" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {solvedChallengeIds.size} <span className="text-xs font-normal text-zinc-500">ACTIVE</span>
          </div>
          <div className="text-[10px] font-mono text-cyan-accent mt-1">
            Verified via replay engine
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-panel p-2 rounded-panel border border-hairline">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-mono text-zinc-500 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Tier:
          </span>
          {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'IMPOSSIBLE'].map(diff => (
            <button
              key={diff}
              onClick={() => setFilterDifficulty(diff)}
              className={`px-2.5 py-1 text-xs font-mono rounded-sharp transition-all ${
                filterDifficulty === diff
                  ? 'bg-bg-main border border-cyan-accent text-cyan-accent font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by challenge or CVE..."
          className="bg-bg-main border border-hairline px-3 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 rounded-sharp focus:outline-none focus:border-cyan-accent w-full sm:w-60"
        />
      </div>

      {/* Log Feed-Stream Rows (Design System Section 7) */}
      <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-panelAlt/80 border-b border-hairline text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
          <div className="col-span-1">Status</div>
          <div className="col-span-4 sm:col-span-5">Challenge Name & Target</div>
          <div className="col-span-3 sm:col-span-2">Category</div>
          <div className="col-span-2 text-center">Difficulty</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-hairline">
          {filteredChallenges.map(ch => {
            const isSolved = solvedChallengeIds.has(ch.challenge_id);
            const points = getDifficultyPoints(ch.difficulty);

            return (
              <div
                key={ch.challenge_id}
                className="grid grid-cols-12 px-4 py-3 items-center hover:bg-bg-subtle/50 transition-colors group"
              >
                {/* Status Column */}
                <div className="col-span-1 flex items-center">
                  {isSolved ? (
                    <span 
                      className="p-1 rounded-sharp bg-status-greenDim border border-status-green/30 text-status-green"
                      title="Breached & Solved"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span 
                      className="p-1 rounded-sharp bg-bg-main border border-hairline text-zinc-500 group-hover:text-cyan-accent group-hover:border-cyan-accent/30 transition-colors"
                      title="Unsolved"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Challenge Title & Endpoint */}
                <div className="col-span-4 sm:col-span-5 pr-2">
                  <div className="font-mono text-xs font-bold text-zinc-100 group-hover:text-cyan-accent transition-colors">
                    {ch.title}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500 truncate">
                    {ch.dvwa_page_ref}
                  </div>
                </div>

                {/* Vulnerability Category */}
                <div className="col-span-3 sm:col-span-2">
                  <span className="font-mono text-[11px] text-zinc-400 truncate block">
                    {ch.vulnerability_type}
                  </span>
                </div>

                {/* Difficulty & Points */}
                <div className="col-span-2 flex flex-col items-center justify-center">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sharp border ${getDifficultyBadgeColor(ch.difficulty)}`}>
                    {ch.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 mt-0.5">
                    +{points} pts
                  </span>
                </div>

                {/* Action CTA Button */}
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => onSelectChallenge(ch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-main hover:bg-cyan-accent hover:text-bg-main border border-hairline hover:border-cyan-accent text-zinc-300 font-mono text-xs rounded-sharp transition-all group-hover:border-cyan-accent/50"
                  >
                    <span>{isSolved ? 'Replay' : 'Attempt'}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
