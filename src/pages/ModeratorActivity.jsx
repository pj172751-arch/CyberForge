import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { soundEngine } from '../utils/audio';
import SocCharts from '../components/ui/SocCharts';
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
  XCircle,
  Download,
  Code,
  X,
  Play,
  Pause
} from 'lucide-react';

export default function ModeratorActivity() {
  const { attempts, defenses, alerts, challenges, attackers, defenders } = useApp();
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [inspectRecord, setInspectRecord] = useState(null);

  // Assemble unified activity stream
  const attackEvents = attempts.map(a => {
    const ch = challenges.find(c => c.challenge_id === a.challenge_id);
    const actor = attackers.find(atk => atk.attacker_id === a.attacker_id);
    return {
      id: `att_${a.attempt_id}`,
      type: 'ATTACK_ATTEMPT',
      sourceTable: 'attempts',
      rawRecord: a,
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
      rawRecord: d,
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
      rawRecord: al,
      actorName: 'SYSTEM_IDS',
      actorRole: 'Detection Engine',
      challengeTitle: ch?.title || `Challenge #${al.challenge_id}`,
      detail: `[${al.alert_type}] ${al.message}`,
      status: 'FLAGGED',
      timestamp: al.timestamp,
      score: 0
    };
  });

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

  const handleFilterChange = (type) => {
    soundEngine.playBlip();
    if (type === 'SECURITY_ALERT') {
      soundEngine.playAlarm();
    }
    setFilterType(type);
  };

  const exportLogsAsJson = () => {
    soundEngine.playKeyClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cyberforge_soc_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

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
              SOC OPERATIONS // TELEMETRY HUB
            </span>
          </div>
          <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
            Activity & Security Alerts
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Unified telemetry stream aggregated from `attempts`, `defenses`, and `alerts` database tables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Live Stream */}
          <button
            onClick={() => {
              soundEngine.playBlip();
              setIsLivePaused(prev => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-panel text-xs font-mono border transition-colors ${
              isLivePaused
                ? 'border-status-amber text-status-amber bg-status-amberDim'
                : 'border-hairline text-zinc-300 bg-bg-panel hover:bg-bg-subtle'
            }`}
          >
            {isLivePaused ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-status-green animate-pulse" />}
            <span>{isLivePaused ? 'STREAM PAUSED' : 'LIVE INGESTION'}</span>
          </button>

          {/* Export telemetry */}
          <button
            onClick={exportLogsAsJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-panel hover:bg-bg-subtle border border-hairline hover:border-cyan-accent text-zinc-300 font-mono text-xs rounded-panel transition-colors"
            title="Export event logs to JSON for diploma submission report"
          >
            <Download className="w-3.5 h-3.5 text-cyan-accent" />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* SOC Vector & Telemetry Charts */}
      <SocCharts
        attempts={attempts}
        defenses={defenses}
        alerts={alerts}
        challenges={challenges}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-panel p-2 rounded-panel border border-hairline">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-mono text-zinc-500 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'ATTACK_ATTEMPT', label: 'Attacks' },
            { id: 'DEFENSE_APPLIED', label: 'Defenses' },
            { id: 'SECURITY_ALERT', label: 'Alerts' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => handleFilterChange(f.id)}
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
          placeholder="Filter records, actors, payloads..."
          className="bg-bg-main border border-hairline px-3 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 rounded-sharp focus:outline-none focus:border-cyan-accent w-full sm:w-60"
        />
      </div>

      {/* Feed-Stream Table with Raw Record Inspector */}
      <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-panelAlt/90 border-b border-hairline text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
          <div className="col-span-1">Vector</div>
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Operator / Source</div>
          <div className="col-span-3">Target Challenge</div>
          <div className="col-span-3">Detail / Payload</div>
          <div className="col-span-1 text-right">Inspect</div>
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
                  className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-bg-subtle/50 transition-colors text-xs font-mono group"
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

                  {/* Inspect CTA */}
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => {
                        soundEngine.playBlip();
                        setInspectRecord(ev);
                      }}
                      className="p-1 text-zinc-500 hover:text-cyan-accent hover:bg-bg-main rounded border border-transparent hover:border-hairline transition-colors"
                      title="Inspect Raw Database Record"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Raw Record Inspector Modal */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-bg-panel border border-border-subtle rounded-panel shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between bg-bg-panelAlt">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-accent" />
                <h3 className="text-xs font-bold font-mono text-zinc-100">
                  Raw Record Inspector: Table `{inspectRecord.sourceTable}`
                </h3>
              </div>
              <button 
                onClick={() => setInspectRecord(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 font-mono text-xs">
              <div className="text-[11px] text-zinc-400">
                Backed directly by the locked relational database schema:
              </div>
              <pre className="p-3 bg-black/90 border border-hairline rounded text-[11px] text-cyan-accent overflow-x-auto leading-relaxed">
                {JSON.stringify(inspectRecord.rawRecord, null, 2)}
              </pre>
            </div>

            <div className="px-4 py-2 border-t border-hairline bg-bg-main flex justify-end">
              <button
                onClick={() => setInspectRecord(null)}
                className="px-3 py-1 bg-cyan-accent text-bg-main font-mono font-bold text-xs rounded"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
