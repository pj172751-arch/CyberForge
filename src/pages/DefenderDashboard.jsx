import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { soundEngine } from '../utils/audio';
import CodeDiffViewer from '../components/ui/CodeDiffViewer';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Lock, 
  Clock, 
  Award, 
  Terminal, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Code2,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getSecurityLevelBadge, getDifficultyPoints } from '../data/mockData';

export default function DefenderDashboard() {
  const { challenges, defenses, attempts, currentUser, updateDefenseAndVerify } = useApp();
  const [verifyingId, setVerifyingId] = useState(null);
  const [selectedLevels, setSelectedLevels] = useState({});
  const [expandedDiffId, setExpandedDiffId] = useState(null);

  const myDefenses = defenses.filter(d => d.defender_id === (currentUser?.defender_id || 301));
  const verifiedDefensesCount = myDefenses.filter(d => d.verified).length;
  const totalDefenseScore = myDefenses.reduce((acc, d) => acc + (d.score_earned || 0), 0);

  const getDefenseForChallenge = (challengeId) => {
    return defenses.find(d => d.challenge_id === challengeId);
  };

  const getLastAttackForChallenge = (challengeId) => {
    const chAttempts = attempts.filter(a => a.challenge_id === challengeId);
    if (chAttempts.length === 0) return 'No attacks logged';
    return chAttempts[0].timestamp;
  };

  const handleLevelChange = (challengeId, level) => {
    soundEngine.playKeyClick();
    setSelectedLevels(prev => ({ ...prev, [challengeId]: level }));
  };

  const handleVerify = (challengeId) => {
    soundEngine.playLaunch();
    setVerifyingId(challengeId);
    const existing = getDefenseForChallenge(challengeId);
    const targetLevel = selectedLevels[challengeId] || existing?.security_level_applied || 'High';

    setTimeout(() => {
      const def = updateDefenseAndVerify(challengeId, targetLevel);
      setVerifyingId(null);
      if (def.verified) {
        soundEngine.playSuccess();
      } else {
        soundEngine.playFailure();
      }
    }, 700);
  };

  const toggleDiff = (challengeId) => {
    soundEngine.playBlip();
    setExpandedDiffId(prev => prev === challengeId ? null : challengeId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-accent bg-cyan-dim px-2 py-0.5 rounded-sharp border border-cyan-accent/20 uppercase font-semibold">
              DEFENDER SUBSYSTEM
            </span>
            <span className="text-xs font-mono text-zinc-500">
              OPERATOR ID: #{currentUser?.defender_id || '301'}
            </span>
          </div>
          <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
            Target Challenges & Security Defenses
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Harden DVWA service levels and verify mitigations via automated replay of `challenges.reference_payload`.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8081/security.php"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-panel hover:bg-bg-subtle border border-hairline hover:border-border-subtle rounded-panel text-xs font-mono text-zinc-300 transition-colors"
          >
            <span>DVWA Security Config</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-accent" />
          </a>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Defense Score</span>
            <Award className="w-3.5 h-3.5 text-cyan-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {totalDefenseScore} <span className="text-xs font-normal text-zinc-500">PTS</span>
          </div>
          <div className="text-[10px] font-mono text-status-green mt-1">
            Earned via verified mitigations
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Verified Mitigations</span>
            <ShieldCheck className="w-3.5 h-3.5 text-status-green" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {verifiedDefensesCount} / {challenges.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Replay payload blocked
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Hardening Ratio</span>
            <Shield className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {Math.round((verifiedDefensesCount / challenges.length) * 100)}%
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Stored in `defenses` table
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Replay Engine</span>
            <Lock className="w-3.5 h-3.5 text-cyan-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            Active Check
          </div>
          <div className="text-[10px] font-mono text-cyan-accent mt-1">
            Tests `reference_payload`
          </div>
        </div>
      </div>

      {/* Security Defenses List (Feed-stream Layout with Source Code Diff Expanders) */}
      <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-panelAlt/90 border-b border-hairline text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
          <div className="col-span-1">Status</div>
          <div className="col-span-4">Challenge & Category</div>
          <div className="col-span-2">Last Attack</div>
          <div className="col-span-3">Security Level Applied</div>
          <div className="col-span-2 text-right">Verification Action</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-hairline">
          {challenges.map(ch => {
            const defense = getDefenseForChallenge(ch.challenge_id);
            const isVerified = defense?.verified;
            const currentLevel = selectedLevels[ch.challenge_id] || defense?.security_level_applied || 'Low';
            const lastAttack = getLastAttackForChallenge(ch.challenge_id);
            const isVerifying = verifyingId === ch.challenge_id;
            const isDiffExpanded = expandedDiffId === ch.challenge_id;

            return (
              <div key={ch.challenge_id} className="divide-y divide-hairline/60">
                <div className="grid grid-cols-12 px-4 py-3 items-center hover:bg-bg-subtle/40 transition-colors">
                  {/* Status Column */}
                  <div className="col-span-1">
                    {defense ? (
                      isVerified ? (
                        <span 
                          className="p-1 rounded-sharp bg-status-greenDim border border-status-green/30 text-status-green inline-block"
                          title="Mitigation Verified"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                      ) : (
                        <span 
                          className="p-1 rounded-sharp bg-status-redDim border border-status-red/30 text-status-red inline-block"
                          title="Vulnerable / Failed Replay"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </span>
                      )
                    ) : (
                      <span 
                        className="p-1 rounded-sharp bg-bg-main border border-hairline text-zinc-500 inline-block"
                        title="No Defense Applied"
                      >
                        <Shield className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  {/* Challenge & Category */}
                  <div className="col-span-4 pr-2">
                    <div className="font-mono text-xs font-bold text-zinc-100 flex items-center gap-2">
                      <span>{ch.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleDiff(ch.challenge_id)}
                        className="text-[10px] text-zinc-500 hover:text-cyan-accent flex items-center gap-0.5"
                        title="View PHP Source Code Diff"
                      >
                        <Code2 className="w-3 h-3" />
                        <span>{isDiffExpanded ? 'Hide Code' : 'Diff Code'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-zinc-500 truncate">
                      {ch.vulnerability_type} • {ch.dvwa_page_ref}
                    </div>
                  </div>

                  {/* Last Attack Timestamp */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                      <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        {lastAttack.includes(' ') ? lastAttack.split(' ')[1] : lastAttack}
                      </span>
                    </div>
                  </div>

                  {/* Security Level Selector */}
                  <div className="col-span-3 flex items-center gap-2">
                    <select
                      value={currentLevel}
                      onChange={(e) => handleLevelChange(ch.challenge_id, e.target.value)}
                      className="bg-bg-main border border-hairline focus:border-cyan-accent text-zinc-200 text-xs font-mono rounded-sharp px-2 py-1 focus:outline-none"
                    >
                      <option value="Low">Low (Default Vulnerable)</option>
                      <option value="Medium">Medium (Sanitized)</option>
                      <option value="High">High (Strict Filter)</option>
                      <option value="Impossible">Impossible (Hardened)</option>
                    </select>

                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getSecurityLevelBadge(currentLevel)}`}>
                      {currentLevel}
                    </span>
                  </div>

                  {/* Verification CTA */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => handleVerify(ch.challenge_id)}
                      disabled={isVerifying}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-main hover:bg-cyan-accent hover:text-bg-main border border-hairline hover:border-cyan-accent text-zinc-300 font-mono text-xs rounded-sharp transition-all disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-cyan-accent" />
                          <span>Replaying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>{isVerified ? 'Re-Verify' : 'Verify Fix'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Source Code Diff Drawer */}
                {isDiffExpanded && (
                  <div className="p-4 bg-black/40 border-t border-hairline animate-in fade-in duration-150">
                    <CodeDiffViewer challengeId={ch.challenge_id} currentLevel={currentLevel} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
