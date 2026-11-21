import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, Crosshair } from 'lucide-react';

export default function SocCharts({ attempts, defenses, alerts, challenges }) {
  // Compute distribution of vulnerabilities
  const vectorCounts = challenges.reduce((acc, ch) => {
    acc[ch.vulnerability_type] = (acc[ch.vulnerability_type] || 0) + 1;
    return acc;
  }, {});

  const totalChallenges = challenges.length || 1;
  const verifiedCount = defenses.filter(d => d.verified).length;
  const successAttempts = attempts.filter(a => a.status === 'SUCCESS').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
      {/* 1. Attack Vector Threat Distribution */}
      <div className="bg-bg-panel border border-hairline p-4 rounded-panel space-y-3">
        <div className="flex items-center justify-between text-zinc-300 pb-2 border-b border-hairline">
          <span className="flex items-center gap-1.5 font-bold">
            <Crosshair className="w-3.5 h-3.5 text-cyan-accent" />
            <span>CVE Target Categories</span>
          </span>
          <span className="text-[10px] text-zinc-500">{challenges.length} Vectors</span>
        </div>

        <div className="space-y-2 pt-1">
          {Object.entries(vectorCounts).slice(0, 4).map(([category, count]) => {
            const pct = Math.round((count / totalChallenges) * 100);
            return (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span className="truncate max-w-[170px]">{category}</span>
                  <span className="text-zinc-500">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-bg-main rounded-full overflow-hidden border border-hairline">
                  <div
                    className="h-full bg-cyan-accent/80 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Platform Attack vs Defense Ratio */}
      <div className="bg-bg-panel border border-hairline p-4 rounded-panel space-y-3">
        <div className="flex items-center justify-between text-zinc-300 pb-2 border-b border-hairline">
          <span className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-status-green" />
            <span>Mitigation Hardening Ratio</span>
          </span>
          <span className="text-[10px] text-status-green font-bold">
            {verifiedCount}/{totalChallenges} Hardened
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-2">
          {/* Circular SVG Gauge */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#222226"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#10B981"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * (verifiedCount / totalChallenges))}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-bold text-zinc-100 font-mono">
                {Math.round((verifiedCount / totalChallenges) * 100)}%
              </span>
              <span className="text-[9px] text-zinc-500">DEFENDED</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-zinc-400 mt-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-green" /> Verified Fixes
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600" /> Pending Replay
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live 24h Activity Timeline Sparkline */}
      <div className="bg-bg-panel border border-hairline p-4 rounded-panel space-y-3">
        <div className="flex items-center justify-between text-zinc-300 pb-2 border-b border-hairline">
          <span className="flex items-center gap-1.5 font-bold">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Event Ingestion Pulse</span>
          </span>
          <span className="text-[10px] text-zinc-500">{attempts.length + defenses.length + alerts.length} Records</span>
        </div>

        {/* SVG Sparkline Graph */}
        <div className="pt-2">
          <svg className="w-full h-20 overflow-visible" viewBox="0 0 300 80">
            <defs>
              <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5CC" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00E5CC" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M0,60 L30,45 L60,55 L90,30 L120,40 L150,15 L180,35 L210,25 L240,48 L270,20 L300,10"
              fill="none"
              stroke="#00E5CC"
              strokeWidth="2.5"
            />
            <path
              d="M0,60 L30,45 L60,55 L90,30 L120,40 L150,15 L180,35 L210,25 L240,48 L270,20 L300,10 L300,80 L0,80 Z"
              fill="url(#cyberGradient)"
            />
            {/* Blips */}
            <circle cx="150" cy="15" r="3.5" fill="#00E5CC" className="animate-ping" />
            <circle cx="300" cy="10" r="3.5" fill="#00E5CC" />
          </svg>

          <div className="flex justify-between text-[10px] text-zinc-500 pt-2 border-t border-hairline mt-1">
            <span>T-24H</span>
            <span className="text-cyan-accent font-semibold">PEAK: 142 OPS/HR</span>
            <span>CURRENT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
