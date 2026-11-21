import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Activity, 
  AlertTriangle, 
  Terminal, 
  ShieldCheck, 
  Filter, 
  Search, 
  Radio, 
  Layers, 
  Clock, 
  User,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function ModeratorActivity() {
  const { attempts, defenses, alerts, challenges, attackers, defenders } = useApp();
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Assemble unified activity stream from attempts, defenses, and alerts tables
  const attackEvents = attempts.map(a => {
    const ch = challenges.find(c => c.challenge_id === a.challenge_id);
    const actor = attackers.find(atk => atk.attacker_id === a.attacker_id);
    return {
      id: `att_${a.attempt_id}`,
      type: 'ATTACK_ATTEMPT',
      sourceTable: 'attempts',
      actorName: actor?.username || `attacker_${a.attacker_id}`,
      actorRole: 'Attacker',
      challengeTitle: ch?.title || `Challenge #${a.challenge_id}`,
      detail: a.payload_used,
      status: a.status,
      timestamp: a.timestamp,
      score: a.score_earned
    };
  });

  const defenseEvents = defenses.map(d => {
    const ch = challenges.find(c => c.challenge_id === d.challenge_id);
    const actor = defenders.find(df => df.defender_id === d.defender_id);
    return {
      id: `def_${d.defense_id}`,
      type: 'DEFENSE_APPLIED',
      sourceTable: 'defenses',
      actorName: actor?.username || `defender_${d.defender_id}`,
      actorRole: 'Defender',
      challengeTitle: ch?.title || `Challenge #${d.challenge_id}`,
      detail: `Applied Security Level: ${d.security_level_applied}`,
      status: d.verified ? 'VERIFIED' : 'FAILED',
      timestamp: d.timestamp,
      score: d.score_earned
    };
  });

  const alertEvents = alerts.map(al => {
    const ch = challenges.find(c => c.challenge_id === al.challenge_id);
    return {
      id: `alt_${al.alert_id}`,
      type: 'SECURITY_ALERT',
      sourceTable: 'alerts',
      actorName: 'SYSTEM_IDS',
      actorRole: 'Detection Engine',
      challengeTitle: ch?.title || `Challenge #${al.challenge_id}`,
      detail: `[${al.alert_type}] ${al.message}`,
      status: 'FLAGGED',
      timestamp: al.timestamp,
      score: 0
    };
  });

  // Combine and sort chronologically descending
  const allEvents = [...attackEvents, ...defenseEvents, ...alertEvents].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const filteredEvents = allEvents.filter(ev => {
    const matchesType = filterType === 'ALL' || ev.type === filterType;
    const matchesSearch = 
      ev.challengeTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-accent bg-cyan-dim px-2 py-0.5 rounded-sharp border border-cyan-accent/20 uppercase font-semibold">
              MODERATOR SUBSYSTEM
            </span>
            <span className="text-xs font-mono text-zinc-500">
              AUDIT TRAIL // REAL-TIME LOG
            </span>
          </div>
          <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
            Activity & Security Alerts
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Real-time telemetry aggregated across `attempts`, `defenses`, and `alerts` tables.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 bg-bg-panel px-3 py-1.5 rounded-panel border border-hairline">
          <Radio className="w-3.5 h-3.5 text-status-green animate-pulse" />
          <span>INGESTION: ACTIVE</span>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Total Events</span>
            <Activity className="w-3.5 h-3.5 text-cyan-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {allEvents.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Across 3 log tables
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Exploit Attempts</span>
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {attempts.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            From {attackers.length} active attackers
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Defenses Applied</span>
            <ShieldCheck className="w-3.5 h-3.5 text-status-green" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {defenses.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            From {defenders.length} active defenders
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Security Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-status-red" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {alerts.length}
          </div>
          <div className="text-[10px] font-mono text-status-red mt-1">
            Intrusion detection events
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-panel p-2 rounded-panel border border-hairline">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-mono text-zinc-500 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'ATTACK_ATTEMPT', label: 'Attacks' },
            { id: 'DEFENSE_APPLIED', label: 'Defenses' },
            { id: 'SECURITY_ALERT', label: 'Alerts' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 text-xs font-mono rounded-sharp transition-all ${
                filterType === f.id
                  ? 'bg-bg-main border border-cyan-accent text-cyan-accent font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter events, users, payloads..."
          className="bg-bg-main border border-hairline px-3 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 rounded-sharp focus:outline-none focus:border-cyan-accent w-full sm:w-60"
        />
      </div>

      {/* Feed-Stream Table */}
      <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-panelAlt/80 border-b border-hairline text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
          <div className="col-span-1">Event</div>
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Actor / Role</div>
          <div className="col-span-3">Target Challenge</div>
          <div className="col-span-3">Payload / Detail</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-hairline">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-zinc-500">
              No activity logs match the selected filter.
            </div>
          ) : (
            filteredEvents.map(ev => {
              const isAttack = ev.type === 'ATTACK_ATTEMPT';
              const isDefense = ev.type === 'DEFENSE_APPLIED';
              const isAlert = ev.type === 'SECURITY_ALERT';

              return (
                <div
                  key={ev.id}
                  className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-bg-subtle/40 transition-colors text-xs font-mono"
                >
                  {/* Event Type Icon */}
                  <div className="col-span-1">
                    {isAttack && (
                      <span className="p-1 rounded-sharp bg-amber-500/10 border border-amber-500/30 text-amber-400 inline-block" title="Attack Attempt">
                        <Terminal className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isDefense && (
                      <span className="p-1 rounded-sharp bg-status-greenDim border border-status-green/30 text-status-green inline-block" title="Defense Applied">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isAlert && (
                      <span className="p-1 rounded-sharp bg-status-redDim border border-status-red/30 text-status-red inline-block" title="Security Alert">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="col-span-2 text-zinc-400 text-[11px] truncate">
                    {ev.timestamp}
                  </div>

                  {/* Actor */}
                  <div className="col-span-2 pr-2">
                    <span className="text-zinc-200 font-semibold block truncate">
                      {ev.actorName}
                    </span>
                    <span className="text-[10px] text-zinc-500 block truncate">
                      {ev.actorRole}
                    </span>
                  </div>

                  {/* Target Challenge */}
                  <div className="col-span-3 text-zinc-300 font-medium truncate pr-2">
                    {ev.challengeTitle}
                  </div>

                  {/* Payload / Detail */}
                  <div className="col-span-3 text-zinc-400 text-[11px] font-mono truncate pr-2">
                    {ev.detail}
                  </div>

                  {/* Status Badge */}
                  <div className="col-span-1 text-right">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sharp border ${
                      ev.status === 'SUCCESS' || ev.status === 'VERIFIED'
                        ? 'border-status-green text-status-green bg-status-greenDim'
                        : ev.status === 'FLAGGED'
                        ? 'border-status-red text-status-red bg-status-redDim'
                        : 'border-zinc-700 text-zinc-400 bg-zinc-800'
                    }`}>
                      {ev.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
