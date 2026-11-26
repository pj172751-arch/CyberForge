import React from 'react';
import {
  ArrowRight,
  ArrowsClockwise,
  Check,
  Code,
  Crosshair,
  Lightning,
  ShieldCheck,
  TerminalWindow,
  Trophy,
} from '@phosphor-icons/react';
import { Badge, Button } from '../ui/primitives';
import { AnimatedTicker, CopyChip, SpotlightSurface } from '../ui/spells';

const RANK_TIERS = [
  { name: 'Apprentice', min: 0 },
  { name: 'Analyst', min: 200 },
  { name: 'Operator', min: 500 },
  { name: 'Specialist', min: 1000 },
  { name: 'Architect', min: 1500 },
];

const DEFENDER_TIER_META = [
  { key: 'none', label: 'None', dotClass: 'bg-zinc-500' },
  { key: 'low', label: 'Low', dotClass: 'bg-[#EF4444]' },
  { key: 'medium', label: 'Medium', dotClass: 'bg-[#F59E0B]' },
  { key: 'high', label: 'High', dotClass: 'bg-[#00E5CC]' },
  { key: 'impossible', label: 'Impossible', dotClass: 'bg-[#10B981]' },
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

export function MissionRibbon({
  role = 'attacker',
  challenges = [],
  selectedId,
  onSelect,
  summaryMap,
  stats,
  onOpenCatalog,
  onNextTarget,
  onRefresh,
  refreshing = false,
  extraActions = null,
}) {
  const isAttacker = role === 'attacker';
  const accent = isAttacker ? 'rose' : 'sky';
  const rankInfo = getOperatorRank(stats?.totalScore || 0);
  const completedCount = isAttacker ? stats?.solved || 0 : stats?.verified || 0;

  const tierSize = Math.max(1, Math.ceil(challenges.length / 3));
  const tierGroups = [
    { label: 'I', offset: 0, items: challenges.slice(0, tierSize) },
    { label: 'II', offset: tierSize, items: challenges.slice(tierSize, tierSize * 2) },
    { label: 'III', offset: tierSize * 2, items: challenges.slice(tierSize * 2) },
  ].filter((group) => group.items.length > 0);

  return (
    <SpotlightSurface accent={accent} padding="px-3.5 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 12 Mission Nodes grouped into Tiers I, II, III */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {challenges.length === 0 ? (
            <span className="text-xs font-mono text-zinc-400">Syncing mission track...</span>
          ) : (
            tierGroups.map((group, groupIdx) => (
              <div
                key={group.label}
                className={[
                  'flex items-center gap-1.5',
                  groupIdx > 0 ? 'pl-2.5 border-l border-white/[0.08]' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="text-[10px] font-mono text-zinc-400 select-none pr-0.5">
                  {group.label}
                </span>
                <div className="flex items-center gap-1">
                  {group.items.map((ch, localIdx) => {
                    const globalIdx = group.offset + localIdx;
                    const summary = summaryMap?.get(ch.challenge_id);
                    const isDone = isAttacker
                      ? Boolean(summary?.solved)
                      : Boolean(summary?.verified);
                    const isTried = isAttacker
                      ? !isDone && (summary?.count || 0) > 0
                      : !isDone && Boolean(summary?.latest?.security_level_applied);
                    const isSelected = selectedId === ch.challenge_id;

                    const activeClass = isAttacker
                      ? 'ring-2 ring-[#F43F5E] bg-[#F43F5E]/20 border-[#F43F5E]/60 text-zinc-100'
                      : 'ring-2 ring-[#38BDF8] bg-[#38BDF8]/20 border-[#38BDF8]/60 text-zinc-100';

                    const stateClass = isDone
                      ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                      : isTried
                        ? 'bg-[#F59E0B]/15 border-[#F59E0B]/35 text-[#F59E0B]'
                        : 'bg-[#07080B]/80 border-white/[0.08] text-zinc-300 hover:border-white/[0.2] hover:text-zinc-100';

                    return (
                      <button
                        key={ch.challenge_id}
                        type="button"
                        onClick={() => onSelect?.(ch)}
                        aria-current={isSelected ? 'true' : undefined}
                        aria-label={`Mission ${globalIdx + 1}: ${ch.title} (${ch.difficulty})`}
                        title={`${globalIdx + 1}. ${ch.title} · ${ch.difficulty}${
                          isDone ? (isAttacker ? ' · Solved' : ' · Verified') : ''
                        }`}
                        className={[
                          'w-7 h-7 rounded-md border text-[11px] font-mono tabular-nums font-semibold flex items-center justify-center transition-colors',
                          'focus-visible:outline-none focus-visible:ring-1',
                          isAttacker
                            ? 'focus-visible:ring-[#FB7185]'
                            : 'focus-visible:ring-[#38BDF8]',
                          isSelected ? activeClass : stateClass,
                        ].join(' ')}
                      >
                        {isDone && !isSelected ? (
                          <Check className="w-3.5 h-3.5" weight="bold" />
                        ) : (
                          globalIdx + 1
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Telemetry + Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            title={
              rankInfo.nextRank
                ? `${rankInfo.remaining} pts to ${rankInfo.nextRank} (${rankInfo.pct}%)`
                : 'Highest operator rank reached'
            }
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#07080B]/80 border border-white/[0.08] text-xs"
          >
            <Trophy
              className={['w-3.5 h-3.5', isAttacker ? 'text-[#FB7185]' : 'text-[#38BDF8]'].join(
                ' '
              )}
              weight="bold"
            />
            <span className="font-medium text-zinc-200">{rankInfo.rank}</span>
            <span className="text-zinc-400">·</span>
            <AnimatedTicker
              value={stats?.totalScore || 0}
              suffix=" pts"
              className={[
                'font-semibold',
                isAttacker ? 'text-[#FB7185]' : 'text-[#38BDF8]',
              ].join(' ')}
            />
            <span className="text-zinc-400">·</span>
            <span className="font-mono tabular-nums text-zinc-200">
              {completedCount}/{challenges.length}
            </span>
          </div>

          <Button variant="secondary" size="sm" onClick={onOpenCatalog}>
            <span>All Labs</span>
          </Button>

          <button
            type="button"
            onClick={onNextTarget}
            disabled={challenges.length === 0}
            className={[
              'h-8 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-1',
              isAttacker
                ? 'bg-[#F43F5E] hover:bg-[#E11D48] text-white focus-visible:ring-[#FB7185]'
                : 'bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#04101B] focus-visible:ring-[#38BDF8]',
            ].join(' ')}
          >
            {isAttacker ? (
              <Crosshair className="w-3.5 h-3.5" weight="bold" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" weight="bold" />
            )}
            <span>Next Mission</span>
          </button>

          {extraActions}

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
      </div>

      {/* Defender Slim Inline Security-Tier Strip */}
      {!isAttacker && stats?.tierCounts && (
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Tier Posture:</span>
            {DEFENDER_TIER_META.map((tier) => (
              <span key={tier.key} className="inline-flex items-center gap-1.5">
                <span className={['w-1.5 h-1.5 rounded-full', tier.dotClass].join(' ')} />
                <span>
                  {tier.label}:{' '}
                  <span className="text-zinc-200 tabular-nums">
                    {stats.tierCounts[tier.key] || 0}
                  </span>
                </span>
              </span>
            ))}
          </div>
          <span className="tabular-nums text-zinc-300">
            {stats.pctVerified || 0}% verified
          </span>
        </div>
      )}
    </SpotlightSurface>
  );
}

export function SinkCodeViewer({
  code,
  sinkPattern,
  title = 'Vulnerable Source (low.php)',
  maxHeightClass = 'max-h-72',
  emptyMessage = 'Source preview unavailable for this target.',
  highlightTone = 'rose',
  headerExtra = null,
}) {
  const highlightBg =
    highlightTone === 'amber' ? 'bg-[#F59E0B]/15 text-zinc-100' : 'bg-[#F43F5E]/15 text-zinc-100';

  return (
    <div className="rounded-lg bg-[#07080B]/85 border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Code
            className={[
              'w-3.5 h-3.5 shrink-0',
              highlightTone === 'amber' ? 'text-[#38BDF8]' : 'text-[#FB7185]',
            ].join(' ')}
            weight="regular"
          />
          <span className="text-xs font-semibold text-zinc-200 truncate">{title}</span>
          {sinkPattern && (
            <Badge variant={highlightTone === 'amber' ? 'amber' : 'red'}>
              Sink: {sinkPattern}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerExtra}
          {code && <CopyChip value={code} label="Copy source" />}
        </div>
      </div>

      {!code ? (
        <div className="p-4 text-xs text-zinc-400">{emptyMessage}</div>
      ) : (
        <div className={[maxHeightClass, 'overflow-auto font-mono text-xs'].join(' ')}>
          {String(code)
            .split('\n')
            .map((line, idx) => {
              const isSink = matchesSinkPattern(line, sinkPattern);
              return (
                <div
                  key={`${idx + 1}-${line.slice(0, 12)}`}
                  className={[
                    'flex items-start px-3 py-0.5 leading-5',
                    isSink ? highlightBg : 'text-zinc-300',
                  ].join(' ')}
                >
                  <span className="w-8 shrink-0 pr-3 text-right select-none tabular-nums text-zinc-400">
                    {idx + 1}
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
  return 'default';
}

function getBreakoutBadge(mod, payload) {
  const p = String(payload || '');
  if (!p.trim()) return { label: 'Awaiting Input', variant: 'neutral' };
  const lower = p.toLowerCase();

  switch (mod) {
    case 'sqli':
    case 'sqli_blind':
      if (/'|union\s+select|--|#|\/\*|\bor\b\s+1\s*=\s*1|\band\b\s+1\s*=\s*1/i.test(p)) {
        return { label: 'SQL Quote Breakout', variant: 'red' };
      }
      return { label: 'Literal ID Lookup', variant: 'neutral' };
    case 'xss_r':
    case 'xss_s':
    case 'xss_d':
      if (/<script|onerror=|onload=|onfocus=|javascript:|alert\(|<svg|<img/i.test(lower)) {
        return { label: 'DOM / Tag Breakout', variant: 'red' };
      }
      return { label: 'Plain Text Node', variant: 'neutral' };
    case 'exec':
      if (/[;|&`]|\$\(|>\s*\//.test(p)) {
        return { label: 'Shell Command Chain', variant: 'red' };
      }
      return { label: 'Single Ping Host', variant: 'neutral' };
    case 'fi':
      if (/\.\.\/|\.\.\\|\/etc\/|php:\/\/|http:\/\//i.test(p)) {
        return { label: 'Path Traversal Escape', variant: 'red' };
      }
      return { label: 'Local Template Ref', variant: 'neutral' };
    case 'upload':
      if (/\.php|\.phtml|\.phar|%00/i.test(lower)) {
        return { label: 'Executable Extension', variant: 'red' };
      }
      return { label: 'Standard Asset Name', variant: 'neutral' };
    case 'csrf':
      if (/password_new=|change=change|action=|vulnerabilities\/csrf/i.test(lower)) {
        return { label: 'Forged State Request', variant: 'red' };
      }
      return { label: 'Draft Request', variant: 'neutral' };
    case 'brute':
      if (/password=|login=|admin|'\s*or/i.test(lower)) {
        return { label: 'Credential Spray', variant: 'red' };
      }
      return { label: 'Single Auth Probe', variant: 'neutral' };
    case 'weak_id':
      if (/dvwasession|cookie:|^[0-9]+$/i.test(p.trim())) {
        return { label: 'Predictable Session ID', variant: 'red' };
      }
      return { label: 'Opaque Token Probe', variant: 'neutral' };
    case 'csp':
      if (/http|script|callback=|jsonp|unsafe|eval|nonce/i.test(lower)) {
        return { label: 'Allowlist / Script Bypass', variant: 'red' };
      }
      return { label: 'Policy Probe', variant: 'neutral' };
    default:
      return { label: 'Active Vector', variant: 'amber' };
  }
}

function renderAttackContext(mod, payloadText) {
  const hasInput = Boolean(payloadText);
  const shown = hasInput ? payloadText : '<payload>';
  const injected = (
    <span
      className={
        hasInput
          ? 'text-[#FB7185] bg-[#F43F5E]/15 px-1 rounded font-semibold'
          : 'text-zinc-400 italic'
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
            <span className="text-zinc-300">
              SELECT first_name, last_name FROM users WHERE user_id = &apos;
            </span>
            {injected}
            <span className="text-zinc-300">&apos;;</span>
          </>
        ),
      };
    case 'sqli_blind':
      return {
        sinkLabel: 'Blind SQL Boolean Branch ($id)',
        line: (
          <>
            <span className="text-zinc-300">
              SELECT first_name, last_name FROM users WHERE user_id = &apos;
            </span>
            {injected}
            <span className="text-zinc-300">&apos;; // exists vs missing</span>
          </>
        ),
      };
    case 'xss_r':
      return {
        sinkLabel: 'Reflected HTML Sink ($_GET["name"])',
        line: (
          <>
            <span className="text-zinc-300">&lt;pre&gt;Hello </span>
            {injected}
            <span className="text-zinc-300">&lt;/pre&gt;</span>
          </>
        ),
      };
    case 'xss_s':
      return {
        sinkLabel: 'Stored Guestbook DOM Sink ($mtxMessage)',
        line: (
          <>
            <span className="text-zinc-300">&lt;div id=&quot;guestbook_comments&quot;&gt;</span>
            {injected}
            <span className="text-zinc-300">&lt;/div&gt;</span>
          </>
        ),
      };
    case 'xss_d':
      return {
        sinkLabel: 'DOM Sink (document.write / ?default=)',
        line: (
          <>
            <span className="text-zinc-300">document.write(&quot;&lt;option value=&apos;&quot; + </span>
            {injected}
            <span className="text-zinc-300"> + &quot;&apos;&gt;&quot;);</span>
          </>
        ),
      };
    case 'exec':
      return {
        sinkLabel: 'OS Shell Sink (shell_exec)',
        line: (
          <>
            <span className="text-zinc-300">sh -c &quot;ping -c 4 </span>
            {injected}
            <span className="text-zinc-300">&quot;</span>
          </>
        ),
      };
    case 'fi':
      return {
        sinkLabel: 'PHP File Include Sink (include($file))',
        line: (
          <>
            <span className="text-zinc-300">include(&apos;</span>
            {injected}
            <span className="text-zinc-300">&apos;);</span>
          </>
        ),
      };
    case 'upload':
      return {
        sinkLabel: 'Upload Path & MIME Check ($_FILES)',
        line: (
          <>
            <span className="text-zinc-300">move_uploaded_file($tmp, &quot;hackable/uploads/&quot; . </span>
            {injected}
            <span className="text-zinc-300">);</span>
          </>
        ),
      };
    case 'csrf':
      return {
        sinkLabel: 'State-Changing GET Handler',
        line: (
          <>
            <span className="text-zinc-300">GET /vulnerabilities/csrf/?</span>
            {injected}
          </>
        ),
      };
    case 'brute':
      return {
        sinkLabel: 'Authentication Handler (users table)',
        line: (
          <>
            <span className="text-zinc-300">SELECT * FROM users WHERE user = &apos;</span>
            {injected}
            <span className="text-zinc-300">&apos; AND password = md5($pass);</span>
          </>
        ),
      };
    case 'weak_id':
      return {
        sinkLabel: 'HTTP Cookie Session Tracker',
        line: (
          <>
            <span className="text-zinc-300">Cookie: </span>
            {injected}
            <span className="text-zinc-300">; security=low</span>
          </>
        ),
      };
    case 'csp':
      return {
        sinkLabel: 'CSP Header & Script Tag Sink',
        line: (
          <>
            <span className="text-zinc-300">
              Content-Security-Policy: script-src &apos;self&apos; ... | &lt;script src=&quot;
            </span>
            {injected}
            <span className="text-zinc-300">&quot;&gt;&lt;/script&gt;</span>
          </>
        ),
      };
    default:
      return {
        sinkLabel: 'Target Execution Sink',
        line: (
          <>
            <span className="text-zinc-300">dispatch(</span>
            {injected}
            <span className="text-zinc-300">);</span>
          </>
        ),
      };
  }
}

const DEFEND_TIER_PREVIEW = {
  low: {
    badge: 'red',
    label: 'Low · Direct Pass-Through',
    effect: 'Input reaches the execution sink without escaping, parameterization, or token checks.',
  },
  medium: {
    badge: 'amber',
    label: 'Medium · Blocklist / Partial Filter',
    effect: 'Applies targeted string filtering or basic escaping; edge encodings may still probe through.',
  },
  high: {
    badge: 'teal',
    label: 'High · Strict Validation Boundary',
    effect: 'Enforces strict type/format checks, tighter allowlists, and session token verification.',
  },
  impossible: {
    badge: 'green',
    label: 'Impossible · Parameterized & Hardened',
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
}) {
  const mod = resolveModuleKey(moduleKey, pageRef, vulnerabilityType);

  if (mode === 'defend') {
    const tierCfg = DEFEND_TIER_PREVIEW[securityLevel] || DEFEND_TIER_PREVIEW.low;
    return (
      <div className="rounded-lg bg-[#07080B]/85 border border-white/[0.06] p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" weight="regular" />
            <h3 className="text-xs font-semibold text-zinc-200">Live Remediation Pipeline</h3>
          </div>
          <Badge variant={tierCfg.badge}>{tierCfg.label}</Badge>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded bg-[#050608] border border-white/[0.06] space-y-1">
            <div className="text-[11px] font-mono text-zinc-400">Replayed Probe Vector</div>
            <div className="font-mono text-zinc-200 break-all">
              {referencePayload || 'No reference vector defined'}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 px-1">
            <ArrowRight className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" weight="bold" />
            <span>
              Selected Fix:{' '}
              <span className="text-zinc-200">
                {selectedPatchLabel || 'Choose an option in Step 1'}
              </span>
            </span>
          </div>

          {selectedPatchSnippet && (
            <pre className="p-2.5 rounded bg-[#050608] border border-white/[0.06] font-mono text-[11px] text-[#38BDF8] whitespace-pre-wrap break-all">
              {selectedPatchSnippet}
            </pre>
          )}

          <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed">
            {tierCfg.effect}
          </div>
        </div>
      </div>
    );
  }

  const breakout = getBreakoutBadge(mod, payload);
  const ctx = renderAttackContext(mod, payload);

  return (
    <div className="rounded-lg bg-[#07080B]/85 border border-white/[0.06] p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightning className="w-4 h-4 text-[#FB7185]" weight="bold" />
          <h3 className="text-xs font-semibold text-zinc-200">Live Execution Sink Preview</h3>
        </div>
        <Badge variant={breakout.variant}>{breakout.label}</Badge>
      </div>

      <div className="p-2.5 rounded bg-[#050608] border border-white/[0.06] space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <TerminalWindow className="w-3.5 h-3.5 text-[#FB7185]" weight="regular" />
            {ctx.sinkLabel}
          </span>
          <span>{mod}</span>
        </div>
        <pre className="font-mono text-xs whitespace-pre-wrap break-all leading-relaxed">
          {ctx.line}
        </pre>
      </div>
    </div>
  );
}
