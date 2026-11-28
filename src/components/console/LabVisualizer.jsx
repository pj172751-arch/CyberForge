import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  Check,
  Code,
  Compass,
  Copy,
  Crosshair,
  Globe,
  Lightning,
  ShieldCheck,
  TerminalWindow,
  Trophy,
} from '@phosphor-icons/react';
import { Button } from '../ui/primitives';
import { AnimatedTicker } from '../ui/spells';

const RANK_TIERS = [
  { name: 'Apprentice', min: 0 },
  { name: 'Analyst', min: 200 },
  { name: 'Operator', min: 500 },
  { name: 'Specialist', min: 1000 },
  { name: 'Architect', min: 1500 },
];

function getOperatorRank(score) {
  const safeScore = Math.max(0, Number(score) || 0);
  let currentIdx = 0;
  for (let i = 0; i < RANK_TIERS.length; i += 1) {
    if (safeScore >= RANK_TIERS[i].min) {
      currentIdx = i;
    }
  }
  const current = RANK_TIERS[currentIdx];
  const next = RANK_TIERS[currentIdx + 1] || null;
  if (!next) {
    return {
      rank: current.name,
      nextRank: null,
      pct: 100,
      remaining: 0,
    };
  }
  const span = Math.max(1, next.min - current.min);
  const pct = Math.min(100, Math.max(0, Math.round(((safeScore - current.min) / span) * 100)));
  return {
    rank: current.name,
    nextRank: next.name,
    pct,
    remaining: Math.max(0, next.min - safeScore),
  };
}

function matchesSinkPattern(line, sinkPattern) {
  if (!sinkPattern || !line) return false;
  const raw = String(sinkPattern).trim();
  if (!raw) return false;
  try {
    return new RegExp(raw, 'i').test(line);
  } catch {
    return line.toLowerCase().includes(raw.toLowerCase());
  }
}

function DarkroomCopyButton({ value, label = 'Copy source' }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    const text = String(value ?? '');
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failures
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono font-medium text-[#ECEFF4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ECEFF4]"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#34D399]" weight="bold" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-[#C8CFD8]" weight="regular" />
      )}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

export function MissionRibbon({
  role = 'attacker',
  challenges = [],
  selectedId,
  onSelect,
  summaryMap,
  stats,
  onOpenCatalog,
  onOpenTour,
  onNextTarget,
  onRefresh,
  refreshing = false,
  extraActions = null,
}) {
  const isAttacker = role === 'attacker';
  const rankInfo = getOperatorRank(stats?.totalScore || 0);
  const completedCount = isAttacker ? stats?.solved || 0 : stats?.verified || 0;

  return (
    <section
      aria-label="Target selector and operator rank"
      className="min-h-[52px] shrink-0 rounded-lg bg-[#FAF8F3] border border-[#111317]/15 px-3.5 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5"
    >
      {/* 01..14 Compact Target Selector Nodes */}
      <div className="flex items-center gap-1 overflow-x-auto cf-no-scrollbar min-w-0 py-0.5">
        {challenges.length === 0 ? (
          <span className="text-xs font-mono text-[#4B5260]">Syncing targets...</span>
        ) : (
          challenges.map((ch, idx) => {
            const summary = summaryMap?.get(ch.challenge_id);
            const isDone = isAttacker ? Boolean(summary?.solved) : Boolean(summary?.verified);
            const isTried = isAttacker
              ? !isDone && (summary?.count || 0) > 0
              : !isDone && Boolean(summary?.latest?.security_level_applied);
            const isSelected = selectedId === ch.challenge_id;
            const nodeNum = String(idx + 1).padStart(2, '0');

            const nodeClass = isSelected
              ? isAttacker
                ? 'bg-[#C81E1E] border-[#C81E1E] text-[#FAF8F3] ring-2 ring-[#C81E1E]/30'
                : 'bg-[#1D4ED8] border-[#1D4ED8] text-[#FAF8F3] ring-2 ring-[#1D4ED8]/30'
              : isDone
                ? 'bg-[#047857]/12 border-[#047857]/45 text-[#047857] hover:bg-[#047857]/20'
                : isTried
                  ? 'bg-[#B45309]/12 border-[#B45309]/45 text-[#92400E] hover:bg-[#B45309]/20'
                  : 'bg-[#EAE4D7]/70 border-[#111317]/20 text-[#111317] hover:bg-[#EAE4D7]';

            return (
              <button
                key={ch.challenge_id}
                type="button"
                onClick={() => onSelect?.(ch)}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={`Target ${nodeNum}: ${ch.title} (${ch.difficulty})`}
                title={`${nodeNum}. ${ch.title} · ${ch.difficulty}${
                  isDone ? (isAttacker ? ' · Solved' : ' · Verified') : ''
                }`}
                className={[
                  'h-8 min-w-[32px] px-1.5 rounded border font-mono text-xs font-bold tabular-nums flex items-center justify-center transition-colors shrink-0 active:scale-[0.97]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]',
                  nodeClass,
                ].join(' ')}
              >
                {isDone && !isSelected ? <Check className="w-3.5 h-3.5" weight="bold" /> : nodeNum}
              </button>
            );
          })
        )}
      </div>

      {/* Rank XP Meter + Navigation Actions */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div
          title={
            rankInfo.nextRank
              ? `${rankInfo.remaining} pts to ${rankInfo.nextRank} (${rankInfo.pct}%)`
              : 'Highest operator rank reached'
          }
          className="inline-flex items-center gap-2.5 px-3 py-1 rounded bg-[#EAE4D7]/65 border border-[#111317]/15"
        >
          <Trophy
            className={['w-4 h-4 shrink-0', isAttacker ? 'text-[#C81E1E]' : 'text-[#1D4ED8]'].join(
              ' '
            )}
            weight="bold"
          />
          <span className="text-[13px] font-bold text-[#111317]">{rankInfo.rank}</span>
          <span
            className={[
              'font-display text-2xl font-extrabold leading-none tabular-nums',
              isAttacker ? 'text-[#C81E1E]' : 'text-[#1D4ED8]',
            ].join(' ')}
          >
            <AnimatedTicker value={stats?.totalScore || 0} suffix=" XP" />
          </span>
          <div className="hidden xl:flex items-center gap-1.5">
            <div className="w-14 h-2 rounded-full bg-[#111317]/12 overflow-hidden">
              <div
                className={[
                  'h-full transition-all duration-300',
                  isAttacker ? 'bg-[#C81E1E]' : 'bg-[#1D4ED8]',
                ].join(' ')}
                style={{ width: `${rankInfo.pct}%` }}
              />
            </div>
            <span className="text-xs font-mono font-semibold tabular-nums text-[#4B5260]">
              {completedCount}/{challenges.length}
            </span>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={onOpenCatalog}>
          <span>All Labs</span>
        </Button>

        {typeof onOpenTour === 'function' && (
          <Button variant="secondary" size="sm" onClick={onOpenTour} className="hidden sm:inline-flex">
            <Compass className="w-3.5 h-3.5 text-[#4B5260]" weight="regular" />
            <span>3D Hub</span>
          </Button>
        )}

        {extraActions}

        <Button
          variant={isAttacker ? 'attacker' : 'defender'}
          size="sm"
          onClick={onNextTarget}
          disabled={challenges.length === 0}
        >
          {isAttacker ? (
            <Crosshair className="w-3.5 h-3.5" weight="bold" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" weight="bold" />
          )}
          <span>Next Target</span>
          <ArrowRight className="w-3.5 h-3.5" weight="bold" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          loading={refreshing}
          aria-label="Refresh telemetry"
        >
          <ArrowsClockwise className="w-3.5 h-3.5" weight="regular" />
        </Button>
      </div>
    </section>
  );
}

export function SinkCodeViewer({
  code,
  sinkPattern,
  title = 'Vulnerable Source (low.php)',
  emptyMessage = 'Source preview unavailable for this target.',
  highlightTone = 'crimson',
  headerExtra = null,
  selectedLine = null,
  onSelectLine = null,
  vulnerableLines = [],
  className = '',
}) {
  const isInteractive = typeof onSelectLine === 'function';
  const sinkHighlight =
    highlightTone === 'amber'
      ? 'bg-[#B45309]/25 text-[#FEF3C7]'
      : 'bg-[#C81E1E]/25 text-[#FFE4E6]';

  return (
    <div
      className={[
        'cf-darkroom rounded-lg bg-[#0E1014] text-[#ECEFF4] border border-[#111317] flex flex-col overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="px-4 py-2.5 border-b border-white/[0.1] bg-[#14171D] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Code
            className={[
              'w-4 h-4 shrink-0',
              highlightTone === 'amber' ? 'text-[#60A5FA]' : 'text-[#F87171]',
            ].join(' ')}
            weight="bold"
          />
          <span className="text-[13px] font-bold text-[#ECEFF4] truncate">{title}</span>
          {sinkPattern && (
            <span className="px-2 py-0.5 rounded bg-[#C81E1E]/25 border border-[#F87171]/40 text-xs font-mono font-semibold text-[#FECACA]">
              Sink: {sinkPattern}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {headerExtra}
          {code && <DarkroomCopyButton value={code} label="Copy PHP" />}
        </div>
      </div>

      {!code ? (
        <div className="flex-1 p-5 text-[14px] text-[#C8CFD8]">{emptyMessage}</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto font-mono text-[13.5px] leading-[1.6] py-1.5">
          {String(code)
            .split('\n')
            .map((line, idx) => {
              const lineNum = idx + 1;
              const isSelected = selectedLine === lineNum;
              const isVulnLine = vulnerableLines.includes(lineNum);
              const isSink = isVulnLine || matchesSinkPattern(line, sinkPattern);
              const rowClass = isSelected
                ? 'bg-[#1D4ED8]/35 text-[#FAF8F3]'
                : isSink
                  ? sinkHighlight
                  : 'text-[#E5E9F0]';

              if (isInteractive) {
                return (
                  <button
                    key={`${lineNum}-${line.slice(0, 12)}`}
                    type="button"
                    onClick={() => onSelectLine(lineNum)}
                    aria-pressed={isSelected}
                    className={[
                      'w-full text-left flex items-start px-3.5 py-0.5 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#60A5FA]',
                      rowClass,
                    ].join(' ')}
                  >
                    <span className="w-9 shrink-0 pr-3 text-right select-none tabular-nums text-xs leading-6 text-[#8E96A4]">
                      {lineNum}
                    </span>
                    <span className="whitespace-pre">{line || ' '}</span>
                  </button>
                );
              }

              return (
                <div
                  key={`${lineNum}-${line.slice(0, 12)}`}
                  className={['flex items-start px-3.5 py-0.5', rowClass].join(' ')}
                >
                  <span className="w-9 shrink-0 pr-3 text-right select-none tabular-nums text-xs leading-6 text-[#8E96A4]">
                    {lineNum}
                  </span>
                  <span className="whitespace-pre">{line || ' '}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function resolveModuleKey(moduleKey, pageRef, vulnerabilityType) {
  if (moduleKey) return String(moduleKey).toLowerCase();
  const ref = String(pageRef || '').toLowerCase();
  if (ref.includes('sqli_blind')) return 'sqli_blind';
  if (ref.includes('sqli')) return 'sqli';
  if (ref.includes('xss_s')) return 'xss_s';
  if (ref.includes('xss_d')) return 'xss_d';
  if (ref.includes('xss_r')) return 'xss_r';
  if (ref.includes('exec')) return 'exec';
  if (ref.includes('fi')) return 'fi';
  if (ref.includes('upload')) return 'upload';
  if (ref.includes('csrf')) return 'csrf';
  if (ref.includes('brute')) return 'brute';
  if (ref.includes('weak_id')) return 'weak_id';
  if (ref.includes('csp')) return 'csp';
  if (ref.includes('captcha')) return 'captcha';
  if (ref.includes('javascript')) return 'javascript';
  const vuln = String(vulnerabilityType || '').toLowerCase();
  if (vuln.includes('blind')) return 'sqli_blind';
  if (vuln.includes('sql')) return 'sqli';
  if (vuln.includes('stored')) return 'xss_s';
  if (vuln.includes('dom')) return 'xss_d';
  if (vuln.includes('xss')) return 'xss_r';
  if (vuln.includes('command') || vuln.includes('rce')) return 'exec';
  if (vuln.includes('inclusion') || vuln.includes('lfi')) return 'fi';
  if (vuln.includes('upload')) return 'upload';
  if (vuln.includes('csrf')) return 'csrf';
  if (vuln.includes('brute')) return 'brute';
  if (vuln.includes('session') || vuln.includes('weak')) return 'weak_id';
  if (vuln.includes('csp')) return 'csp';
  if (vuln.includes('captcha') || vuln.includes('workflow')) return 'captcha';
  if (vuln.includes('javascript') || vuln.includes('client-side')) return 'javascript';
  return 'default';
}

function getBreakoutBadge(mod, payload) {
  const p = String(payload || '');
  if (!p.trim()) return { label: 'Awaiting Input', tone: 'neutral' };
  const lower = p.toLowerCase();

  switch (mod) {
    case 'sqli':
    case 'sqli_blind':
      if (/'|union\s+select|--|#|\/\*|\bor\b\s+1\s*=\s*1|\band\b\s+1\s*=\s*1/i.test(p)) {
        return { label: 'SQL Quote Breakout', tone: 'red' };
      }
      return { label: 'Literal ID Lookup', tone: 'neutral' };
    case 'xss_r':
    case 'xss_s':
    case 'xss_d':
      if (/<script|onerror=|onload=|onfocus=|javascript:|alert\(|<svg|<img/i.test(lower)) {
        return { label: 'DOM / Tag Breakout', tone: 'red' };
      }
      return { label: 'Plain Text Node', tone: 'neutral' };
    case 'exec':
      if (/[;|&`]|\$\(|>\s*\//.test(p)) {
        return { label: 'Shell Command Chain', tone: 'red' };
      }
      return { label: 'Single Ping Host', tone: 'neutral' };
    case 'fi':
      if (/\.\.\/|\.\.\\|\/etc\/|php:\/\/|file:\/\//i.test(p)) {
        return { label: 'Path Traversal Escape', tone: 'red' };
      }
      return { label: 'Local Template Ref', tone: 'neutral' };
    case 'upload':
      if (/\.php|\.phtml|\.phar|%00|gif89/i.test(lower)) {
        return { label: 'Executable Extension', tone: 'red' };
      }
      return { label: 'Standard Asset Name', tone: 'neutral' };
    case 'csrf':
      if (/password_new=|change=change|action=|vulnerabilities\/csrf/i.test(lower)) {
        return { label: 'Forged State Request', tone: 'red' };
      }
      return { label: 'Draft Request', tone: 'neutral' };
    case 'brute':
      if (/password=|login=|admin|:/i.test(lower)) {
        return { label: 'Credential Spray', tone: 'red' };
      }
      return { label: 'Single Auth Probe', tone: 'neutral' };
    case 'weak_id':
      if (/dvwasession|cookie:|^[0-9]+$/i.test(p.trim())) {
        return { label: 'Predictable Session ID', tone: 'red' };
      }
      return { label: 'Opaque Token Probe', tone: 'neutral' };
    case 'csp':
      if (/http|script|callback=|jsonp|unsafe|eval|nonce/i.test(lower)) {
        return { label: 'Allowlist / Script Bypass', tone: 'red' };
      }
      return { label: 'Policy Probe', tone: 'neutral' };
    case 'captcha':
      if (/step=2|passed_captcha|hidd3n_valu3|recaptcha/i.test(lower)) {
        return { label: 'Workflow / Header Bypass', tone: 'red' };
      }
      return { label: 'Step 1 Draft', tone: 'neutral' };
    case 'javascript':
      if (/phrase=success|token=/i.test(lower)) {
        return { label: 'Client Token Forge', tone: 'red' };
      }
      return { label: 'Phrase Probe', tone: 'neutral' };
    default:
      return { label: 'Active Vector', tone: 'amber' };
  }
}

function renderAttackContext(mod, payloadText) {
  const hasInput = Boolean(payloadText);
  const shown = hasInput ? payloadText : '<payload>';
  const injected = (
    <span
      className={
        hasInput
          ? 'text-[#FCA5A5] bg-[#C81E1E]/35 px-1.5 py-0.5 rounded font-semibold'
          : 'text-[#8E96A4] italic'
      }
    >
      {shown}
    </span>
  );

  switch (mod) {
    case 'sqli':
      return {
        sinkLabel: 'MariaDB SQL Query ($id)',
        line: (
          <>
            <span className="text-[#E5E9F0]">
              SELECT first_name, last_name FROM users WHERE user_id = &apos;
            </span>
            {injected}
            <span className="text-[#E5E9F0]">&apos;;</span>
          </>
        ),
      };
    case 'sqli_blind':
      return {
        sinkLabel: 'Blind SQL Boolean Branch ($id)',
        line: (
          <>
            <span className="text-[#E5E9F0]">
              SELECT first_name, last_name FROM users WHERE user_id = &apos;
            </span>
            {injected}
            <span className="text-[#E5E9F0]">&apos;; // exists vs missing</span>
          </>
        ),
      };
    case 'xss_r':
      return {
        sinkLabel: 'Reflected HTML Sink ($_GET["name"])',
        line: (
          <>
            <span className="text-[#E5E9F0]">&lt;pre&gt;Hello </span>
            {injected}
            <span className="text-[#E5E9F0]">&lt;/pre&gt;</span>
          </>
        ),
      };
    case 'xss_s':
      return {
        sinkLabel: 'Stored Guestbook DOM Sink ($mtxMessage)',
        line: (
          <>
            <span className="text-[#E5E9F0]">&lt;div id=&quot;guestbook_comments&quot;&gt;</span>
            {injected}
            <span className="text-[#E5E9F0]">&lt;/div&gt;</span>
          </>
        ),
      };
    case 'xss_d':
      return {
        sinkLabel: 'DOM Sink (document.write / ?default=)',
        line: (
          <>
            <span className="text-[#E5E9F0]">document.write(&quot;&lt;option value=&apos;&quot; + </span>
            {injected}
            <span className="text-[#E5E9F0]"> + &quot;&apos;&gt;&quot;);</span>
          </>
        ),
      };
    case 'exec':
      return {
        sinkLabel: 'OS Shell Sink (shell_exec)',
        line: (
          <>
            <span className="text-[#E5E9F0]">sh -c &quot;ping -c 4 </span>
            {injected}
            <span className="text-[#E5E9F0]">&quot;</span>
          </>
        ),
      };
    case 'fi':
      return {
        sinkLabel: 'PHP File Include Sink (include($file))',
        line: (
          <>
            <span className="text-[#E5E9F0]">include(&apos;</span>
            {injected}
            <span className="text-[#E5E9F0]">&apos;);</span>
          </>
        ),
      };
    case 'upload':
      return {
        sinkLabel: 'Upload Path & MIME Check ($_FILES)',
        line: (
          <>
            <span className="text-[#E5E9F0]">move_uploaded_file($tmp, &quot;hackable/uploads/&quot; . </span>
            {injected}
            <span className="text-[#E5E9F0]">);</span>
          </>
        ),
      };
    case 'csrf':
      return {
        sinkLabel: 'State-Changing GET Handler',
        line: (
          <>
            <span className="text-[#E5E9F0]">GET /vulnerabilities/csrf/?</span>
            {injected}
          </>
        ),
      };
    case 'brute':
      return {
        sinkLabel: 'Authentication Handler (users table)',
        line: (
          <>
            <span className="text-[#E5E9F0]">SELECT * FROM users WHERE user = &apos;</span>
            {injected}
            <span className="text-[#E5E9F0]">&apos; AND password = md5($pass);</span>
          </>
        ),
      };
    case 'weak_id':
      return {
        sinkLabel: 'HTTP Cookie Session Tracker',
        line: (
          <>
            <span className="text-[#E5E9F0]">Cookie: </span>
            {injected}
            <span className="text-[#E5E9F0]">; security=low</span>
          </>
        ),
      };
    case 'csp':
      return {
        sinkLabel: 'CSP Header & Script Tag Sink',
        line: (
          <>
            <span className="text-[#E5E9F0]">
              Content-Security-Policy: script-src &apos;self&apos; ... | &lt;script src=&quot;
            </span>
            {injected}
            <span className="text-[#E5E9F0]">&quot;&gt;&lt;/script&gt;</span>
          </>
        ),
      };
    case 'captcha':
      return {
        sinkLabel: '2-Step CAPTCHA Gate ($_POST["step"])',
        line: (
          <>
            <span className="text-[#E5E9F0]">POST /vulnerabilities/captcha/ :: </span>
            {injected}
          </>
        ),
      };
    case 'javascript':
      return {
        sinkLabel: 'Client-Side Token Validator ($_POST["token"])',
        line: (
          <>
            <span className="text-[#E5E9F0]">validateToken(</span>
            {injected}
            <span className="text-[#E5E9F0]">);</span>
          </>
        ),
      };
    default:
      return {
        sinkLabel: 'Target Execution Sink',
        line: (
          <>
            <span className="text-[#E5E9F0]">dispatch(</span>
            {injected}
            <span className="text-[#E5E9F0]">);</span>
          </>
        ),
      };
  }
}

const DEFEND_TIER_PREVIEW = {
  low: {
    label: 'Low · Direct Pass-Through',
    pillClass: 'bg-[#C81E1E]/25 border-[#F87171]/40 text-[#FECACA]',
    effect: 'Input reaches the execution sink without escaping, parameterization, or token checks.',
  },
  medium: {
    label: 'Medium · Blocklist / Partial Filter',
    pillClass: 'bg-[#B45309]/25 border-[#FBBF24]/40 text-[#FDE68A]',
    effect: 'Applies targeted string filtering or basic escaping; edge encodings may still probe through.',
  },
  high: {
    label: 'High · Strict Validation Boundary',
    pillClass: 'bg-[#1D4ED8]/25 border-[#60A5FA]/40 text-[#BFDBFE]',
    effect: 'Enforces strict type/format checks, tighter allowlists, and session token verification.',
  },
  impossible: {
    label: 'Impossible · Parameterized & Hardened',
    pillClass: 'bg-[#047857]/25 border-[#34D399]/40 text-[#A7F3D0]',
    effect: 'Separates code from data via prepared APIs, context-aware encoding, and strict allowlists.',
  },
};

export function LiveSinkVisualizer({
  mode = 'attack',
  moduleKey,
  pageRef,
  vulnerabilityType,
  payload = '',
  referencePayload = '',
  selectedPatchLabel = '',
  selectedPatchSnippet = '',
  securityLevel = 'low',
  stageGuide = null,
}) {
  const mod = resolveModuleKey(moduleKey, pageRef, vulnerabilityType);

  if (mode === 'defend') {
    const tierCfg = DEFEND_TIER_PREVIEW[securityLevel] || DEFEND_TIER_PREVIEW.low;
    return (
      <div className="cf-darkroom rounded-lg bg-[#14171D] border border-white/[0.1] p-4 space-y-3 text-[#ECEFF4]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#60A5FA]" weight="bold" />
            <h3 className="text-[14px] font-bold text-[#ECEFF4]">Live Remediation Pipeline</h3>
          </div>
          <span
            className={['px-2.5 py-0.5 rounded border text-xs font-mono font-semibold', tierCfg.pillClass].join(
              ' '
            )}
          >
            {tierCfg.label}
          </span>
        </div>

        <div className="space-y-2.5 text-[13.5px]">
          <div className="p-3 rounded bg-[#0E1014] border border-white/[0.08] space-y-1">
            <div className="text-xs font-mono text-[#9CA3AF]">Replayed Probe Vector</div>
            <div className="font-mono text-[13.5px] text-[#ECEFF4] break-all">
              {referencePayload || 'No reference vector defined'}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#C8CFD8] px-1">
            <ArrowRight className="w-4 h-4 text-[#60A5FA] shrink-0" weight="bold" />
            <span>
              Selected Fix:{' '}
              <span className="text-[#FAF8F3] font-semibold">
                {selectedPatchLabel || 'Choose an option in Patch Audit Quiz'}
              </span>
            </span>
          </div>

          {selectedPatchSnippet && (
            <pre className="p-3 rounded bg-[#0E1014] border border-white/[0.08] font-mono text-[13px] text-[#93C5FD] whitespace-pre-wrap break-all">
              {selectedPatchSnippet}
            </pre>
          )}

          <div className="p-3 rounded bg-white/[0.04] border border-white/[0.08] text-[14px] text-[#E5E9F0] leading-relaxed">
            {tierCfg.effect}
          </div>
        </div>
      </div>
    );
  }

  const breakout = getBreakoutBadge(mod, payload);
  const ctx = renderAttackContext(mod, payload);
  const badgeClass =
    breakout.tone === 'red'
      ? 'bg-[#C81E1E]/25 border-[#F87171]/40 text-[#FECACA]'
      : breakout.tone === 'amber'
        ? 'bg-[#B45309]/25 border-[#FBBF24]/40 text-[#FDE68A]'
        : 'bg-white/[0.08] border-white/[0.14] text-[#D1D5DB]';

  return (
    <div className="cf-darkroom rounded-lg bg-[#14171D] border border-white/[0.1] p-4 space-y-3 text-[#ECEFF4]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightning className="w-4 h-4 text-[#F87171]" weight="bold" />
          <h3 className="text-[14px] font-bold text-[#ECEFF4]">Live Execution Sink Preview</h3>
        </div>
        <span
          className={['px-2.5 py-0.5 rounded border text-xs font-mono font-semibold', badgeClass].join(
            ' '
          )}
        >
          {breakout.label}
        </span>
      </div>

      <div className="p-3.5 rounded bg-[#0E1014] border border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-mono text-[#9CA3AF]">
          <span className="inline-flex items-center gap-1.5 text-[#C8CFD8]">
            <TerminalWindow className="w-3.5 h-3.5 text-[#F87171]" weight="regular" />
            {ctx.sinkLabel}
          </span>
          <span>module: {mod}</span>
        </div>
        <pre className="font-mono text-[13.5px] whitespace-pre-wrap break-all leading-relaxed">
          {ctx.line}
        </pre>
      </div>

      {stageGuide && (
        <div className="p-3 rounded bg-white/[0.04] border border-white/[0.08] space-y-1 text-[13.5px]">
          <div className="font-mono text-xs font-semibold text-[#FCD34D]">{stageGuide.label}</div>
          <div className="text-[#E5E9F0] leading-relaxed">{stageGuide.objective}</div>
        </div>
      )}
    </div>
  );
}

export function HttpWireInspector({ wireTrace, role = 'attacker' }) {
  const isAttacker = role === 'attacker';

  if (!wireTrace) {
    return (
      <div className="cf-darkroom h-full p-5 flex items-center justify-center bg-[#0E1014] text-[#ECEFF4]">
        <div className="max-w-md w-full p-5 rounded-lg bg-[#14171D] border border-white/[0.1] space-y-2">
          <div className="flex items-center gap-2 font-bold text-[15px] text-[#ECEFF4]">
            <Globe
              className={['w-4 h-4', isAttacker ? 'text-[#F87171]' : 'text-[#60A5FA]'].join(' ')}
              weight="bold"
            />
            <span>Live HTTP Wire Inspector</span>
          </div>
          <p className="text-[14px] text-[#C8CFD8] leading-relaxed">
            {isAttacker
              ? 'Submit an exploit payload in Execute to inspect live DVWA request headers, cookies, HTTP status codes, and response body snippets.'
              : 'Run a live replay in Remediate to inspect the HTTP wire request, DVWA security cookies, and blocked/breached response telemetry.'}
          </p>
        </div>
      </div>
    );
  }

  const reqHeaders = Object.entries(wireTrace.request_headers || {});
  const respHeaders = Object.entries(wireTrace.response_headers || {});
  const setCookies = Array.isArray(wireTrace.set_cookies) ? wireTrace.set_cookies : [];
  const statusOk = (wireTrace.response_status || 200) < 400;

  return (
    <div className="cf-darkroom h-full flex flex-col bg-[#0E1014] text-[#ECEFF4] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/[0.1] bg-[#14171D] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Globe
            className={['w-4 h-4', isAttacker ? 'text-[#F87171]' : 'text-[#60A5FA]'].join(' ')}
            weight="bold"
          />
          <h3 className="text-[14px] font-bold text-[#ECEFF4]">HTTP Wire Trace</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              'px-2.5 py-0.5 rounded border text-xs font-mono font-semibold',
              statusOk
                ? 'bg-[#047857]/25 border-[#34D399]/40 text-[#A7F3D0]'
                : 'bg-[#C81E1E]/25 border-[#F87171]/40 text-[#FECACA]',
            ].join(' ')}
          >
            HTTP {wireTrace.response_status || 200}
          </span>
          {wireTrace.latency_ms !== undefined && (
            <span className="px-2.5 py-0.5 rounded border border-white/[0.14] bg-white/[0.06] text-xs font-mono text-[#E5E9F0]">
              {wireTrace.latency_ms} ms
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 font-mono text-[13.5px]">
        <div className="p-3.5 rounded-lg bg-[#14171D] border border-white/[0.1] space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
            Outbound Request Wire
          </div>
          <div className="p-2.5 rounded bg-[#0B0D11] border border-white/[0.08] text-[#ECEFF4] break-all">
            <span className="text-[#FCD34D] font-bold">{wireTrace.request_method || 'GET'}</span>{' '}
            {wireTrace.request_url}
          </div>
          {reqHeaders.length > 0 && (
            <div className="space-y-1 text-[13px] text-[#D1D5DB]">
              {reqHeaders.map(([k, v]) => (
                <div key={k} className="break-all">
                  <span className="text-[#9CA3AF]">{k}:</span> {v}
                </div>
              ))}
            </div>
          )}
          {wireTrace.request_body_preview && (
            <pre className="p-2.5 rounded bg-[#0B0D11] border border-[#F87171]/25 text-[13px] text-[#FECACA] whitespace-pre-wrap break-all">
              {wireTrace.request_body_preview}
            </pre>
          )}
        </div>

        <div className="p-3.5 rounded-lg bg-[#14171D] border border-white/[0.1] space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
            Inbound Response Wire
          </div>
          {respHeaders.length > 0 && (
            <div className="space-y-1 text-[13px] text-[#D1D5DB]">
              {respHeaders.map(([k, v]) => (
                <div key={k} className="break-all">
                  <span className="text-[#9CA3AF]">{k}:</span> {v}
                </div>
              ))}
            </div>
          )}
          {setCookies.length > 0 && (
            <div className="space-y-1 text-[13px] text-[#34D399]">
              {setCookies.map((sc, i) => (
                <div key={i} className="break-all">
                  <span className="text-[#9CA3AF]">set-cookie:</span> {sc}
                </div>
              ))}
            </div>
          )}
          {wireTrace.body_snippet && (
            <pre className="p-2.5 rounded bg-[#0B0D11] border border-white/[0.08] text-[13px] text-[#ECEFF4] whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
              {wireTrace.body_snippet}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
