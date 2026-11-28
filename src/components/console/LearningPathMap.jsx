import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Compass,
  Crosshair,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Badge, Button } from '../ui/primitives';

const DEFAULT_TRACKS = [
  {
    track_id: 'track_1_injection',
    track_order: 1,
    title: 'Track I · Injection Mastery',
    subtitle: 'Break string, blind boolean, and OS shell sinks across escaping and blacklist barriers.',
    modules: ['sqli', 'sqli_blind', 'exec'],
  },
  {
    track_id: 'track_2_client',
    track_order: 2,
    title: 'Track II · Client-Side & Browser Exploitation',
    subtitle: 'Exploit reflected, stored, DOM, CSP, and client-side JavaScript token trust flaws.',
    modules: ['xss_r', 'xss_s', 'xss_d', 'csp', 'javascript'],
  },
  {
    track_id: 'track_3_auth',
    track_order: 3,
    title: 'Track III · Auth, Session & Workflow Abuse',
    subtitle: 'Subvert weak credentials, sequential cookies, cross-site state changes, and multi-step CAPTCHAs.',
    modules: ['brute', 'weak_id', 'csrf', 'captcha'],
  },
  {
    track_id: 'track_4_server',
    track_order: 4,
    title: 'Track IV · Server & File Takeover',
    subtitle: 'Traverse server include paths and defeat MIME/magic-byte file upload restrictions.',
    modules: ['fi', 'upload'],
  },
];

function inferModuleKey(pageRef) {
  const raw = String(pageRef || '').toLowerCase();
  const match = raw.match(
    /(?:^|\/)(sqli_blind|sqli|xss_r|xss_s|xss_d|weak_id|upload|brute|csrf|exec|csp|javascript|captcha|fi)(?:\/|$|\?)/
  );
  return match ? match[1] : 'custom';
}

function getDifficultyVariant(difficulty) {
  const key = String(difficulty || '').trim().toLowerCase();
  if (key === 'easy') return 'green';
  if (key === 'medium') return 'amber';
  if (key === 'hard') return 'red';
  return 'neutral';
}

function getModuleContext(ch) {
  const mod = inferModuleKey(ch?.dvwa_page_ref);
  switch (mod) {
    case 'sqli':
      return 'Unparameterized user ID lookup interpolated into MariaDB SELECT query.';
    case 'sqli_blind':
      return 'Boolean true/false response oracle leaking database rows bit by bit.';
    case 'exec':
      return 'Host input concatenated directly into shell_exec ping invocation.';
    case 'xss_r':
      return 'Query parameter echoed unescaped inside preformatted HTML output.';
    case 'xss_s':
      return 'Persistent guestbook comment rendered raw to every visiting browser.';
    case 'xss_d':
      return 'Client-side DOM sink writing location parameters straight into options.';
    case 'csp':
      return 'Permissive script-src policy allowing JSONP or allowlisted bypass execution.';
    case 'javascript':
      return 'Client-computed MD5/ROT13 token trust enforced only in browser JS.';
    case 'brute':
      return 'Login form vulnerable to credential spraying without rate limiting.';
    case 'weak_id':
      return 'Predictable sequential or timestamp-derived dvwaSession cookie minting.';
    case 'csrf':
      return 'State-changing password update lacking unpredictable anti-CSRF tokens.';
    case 'captcha':
      return 'Two-step verification workflow trustable via hidden step parameters.';
    case 'fi':
      return 'Dynamic PHP include() trusting user-supplied relative filesystem paths.';
    case 'upload':
      return 'Multipart upload handler trusting client Content-Type or file extensions.';
    default:
      return `${ch?.vulnerability_type || 'Target'} handler ready for live DVWA verification.`;
  }
}

export default function LearningPathMap({
  role = 'attacker',
  tracks = [],
  challenges = [],
  summaryMap,
  stats,
  onSelectChallenge,
  onContinueMission,
  onOpenTour,
}) {
  const isAttacker = role === 'attacker';
  const [selectedTrackId, setSelectedTrackId] = useState(null);

  const enrichedTracks = useMemo(() => {
    const challengeByModule = new Map();
    for (const ch of challenges || []) {
      const mod = inferModuleKey(ch.dvwa_page_ref);
      challengeByModule.set(mod, ch);
    }

    const baseTracks = Array.isArray(tracks) && tracks.length > 0 ? tracks : DEFAULT_TRACKS;
    const assignedIds = new Set();
    const list = baseTracks.map((tr) => {
      const items = (tr.modules || [])
        .map((mod) => challengeByModule.get(mod))
        .filter(Boolean);
      items.forEach((ch) => assignedIds.add(ch.challenge_id));
      return { ...tr, items };
    });

    const unassigned = (challenges || []).filter((ch) => !assignedIds.has(ch.challenge_id));
    if (unassigned.length > 0) {
      list.push({
        track_id: 'track_custom',
        track_order: 99,
        title: 'Custom Range Scenarios',
        subtitle: 'Additional instructor-authored challenges configured in PostgreSQL.',
        modules: [],
        items: unassigned,
      });
    }

    return list.filter((tr) => tr.items.length > 0);
  }, [tracks, challenges]);

  const activeTrack = useMemo(() => {
    if (enrichedTracks.length === 0) return null;
    if (selectedTrackId) {
      const matched = enrichedTracks.find((tr) => tr.track_id === selectedTrackId);
      if (matched) return matched;
    }
    const firstIncomplete = enrichedTracks.find((tr) =>
      tr.items.some((ch) => {
        const sum = summaryMap?.get(ch.challenge_id);
        return isAttacker ? !sum?.solved : !sum?.verified;
      })
    );
    return firstIncomplete || enrichedTracks[0];
  }, [enrichedTracks, selectedTrackId, summaryMap, isAttacker]);

  const totalModules = challenges.length;
  const completedModules = isAttacker ? stats?.solved || 0 : stats?.verified || 0;
  const progressPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const activeTrackSolved = activeTrack
    ? activeTrack.items.filter((ch) => {
        const sum = summaryMap?.get(ch.challenge_id);
        return isAttacker ? Boolean(sum?.solved) : Boolean(sum?.verified);
      }).length
    : 0;

  return (
    <div className="lg:h-full lg:min-h-0 flex flex-col gap-3.5">
      {/* Compact Archival Header Strip */}
      <section className="shrink-0 rounded-lg bg-[#FAF8F3] border border-[#111317]/15 px-5 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#111317] leading-tight">
              OWASP Curriculum Atlas
            </h1>
            <Badge variant="ink" className="font-mono tabular-nums">
              {completedModules}/{totalModules} Modules ({progressPct}%)
            </Badge>
          </div>
          <p className="text-[14px] text-[#4B5260] text-pretty">
            {isAttacker
              ? 'Select an OWASP track to inspect vulnerable PHP handlers and escalate exploits across Low, Medium, and High defenses.'
              : 'Audit vulnerable PHP handlers by OWASP track, identify weak sinks, and verify Impossible hardening against live exploit replay.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {typeof onOpenTour === 'function' && (
            <Button type="button" variant="secondary" size="sm" onClick={onOpenTour}>
              <Compass className="w-4 h-4 text-[#4B5260]" weight="regular" />
              <span>3D Hub</span>
            </Button>
          )}
          <Button
            type="button"
            variant={isAttacker ? 'attacker' : 'defender'}
            size="sm"
            onClick={onContinueMission}
          >
            {isAttacker ? (
              <Crosshair className="w-4 h-4" weight="bold" />
            ) : (
              <ShieldCheck className="w-4 h-4" weight="bold" />
            )}
            <span>Engage Next Target</span>
            <ArrowRight className="w-4 h-4" weight="bold" />
          </Button>
        </div>
      </section>

      {/* Single-Frame Two-Column Interactive Track Atlas */}
      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Archival Foil Track Selector */}
        <aside
          aria-label="OWASP curriculum tracks"
          className="lg:col-span-4 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg flex flex-col lg:min-h-0 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[#111317]/15 bg-[#EAE4D7]/55 flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-[15px] font-bold text-[#111317]">OWASP Tracks</h2>
            <span className="text-xs font-mono font-semibold text-[#4B5260] tabular-nums">
              {enrichedTracks.length} Tracks
            </span>
          </div>

          <div className="flex-1 lg:min-h-0 overflow-y-auto divide-y divide-[#111317]/12">
            {enrichedTracks.map((track) => {
              const isSelected = activeTrack?.track_id === track.track_id;
              const trackSolved = track.items.filter((ch) => {
                const sum = summaryMap?.get(ch.challenge_id);
                return isAttacker ? Boolean(sum?.solved) : Boolean(sum?.verified);
              }).length;
              const trackPct =
                track.items.length > 0 ? Math.round((trackSolved / track.items.length) * 100) : 0;

              return (
                <button
                  key={track.track_id}
                  type="button"
                  onClick={() => setSelectedTrackId(track.track_id)}
                  aria-current={isSelected ? 'true' : undefined}
                  className={[
                    'w-full text-left px-4 py-3.5 transition-colors flex flex-col gap-2 border-b-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111317]',
                    isSelected
                      ? isAttacker
                        ? 'bg-[#EAE4D7]/70 border-b-[#C81E1E]'
                        : 'bg-[#EAE4D7]/70 border-b-[#1D4ED8]'
                      : 'bg-[#FAF8F3] border-b-transparent hover:bg-[#EAE4D7]/40',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-[15px] font-bold text-[#111317] leading-snug">
                        {track.title}
                      </div>
                      <p className="text-[13px] text-[#4B5260] leading-snug line-clamp-2">
                        {track.subtitle}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={[
                          'font-display text-[32px] font-extrabold leading-none tabular-nums',
                          isSelected
                            ? isAttacker
                              ? 'text-[#C81E1E]'
                              : 'text-[#1D4ED8]'
                            : 'text-[#111317]',
                        ].join(' ')}
                      >
                        {trackSolved}/{track.items.length}
                      </div>
                    </div>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-[#111317]/12 overflow-hidden">
                    <div
                      className={[
                        'h-full transition-all duration-300',
                        isAttacker ? 'bg-[#C81E1E]' : 'bg-[#1D4ED8]',
                      ].join(' ')}
                      style={{ width: `${trackPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: Active Track's 2-5 Spacious Modules */}
        <section
          aria-label={activeTrack ? activeTrack.title : 'Track modules'}
          className="lg:col-span-8 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg flex flex-col lg:min-h-0 overflow-hidden"
        >
          {!activeTrack ? (
            <div className="flex-1 flex items-center justify-center p-8 text-[15px] text-[#4B5260]">
              Loading live DVWA curriculum modules...
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-[#111317]/15 bg-[#EAE4D7]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-[#111317] leading-tight truncate">
                    {activeTrack.title}
                  </h2>
                  <p className="text-[14px] text-[#4B5260] mt-0.5 truncate">
                    {activeTrack.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={activeTrackSolved === activeTrack.items.length ? 'green' : 'neutral'}>
                    {activeTrackSolved} / {activeTrack.items.length}{' '}
                    {isAttacker ? 'Solved' : 'Verified'}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 lg:min-h-0 overflow-y-auto divide-y divide-[#111317]/12">
                {activeTrack.items.map((ch) => {
                  const summary = summaryMap?.get(ch.challenge_id);
                  const isDone = isAttacker ? Boolean(summary?.solved) : Boolean(summary?.verified);
                  const solvedTiers = summary?.solvedTiers || new Set();
                  const latestLevel = summary?.latest?.security_level_applied;

                  return (
                    <div
                      key={ch.challenge_id}
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#EAE4D7]/40 transition-colors"
                    >
                      <div className="min-w-0 flex items-start gap-3">
                        <div className="mt-1 shrink-0">
                          {isDone ? (
                            <CheckCircle
                              className="w-5 h-5 text-[#047857]"
                              weight="fill"
                              aria-hidden="true"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className={[
                                'inline-block w-3 h-3 rounded-full mt-1 border',
                                summary?.count > 0
                                  ? 'bg-[#B45309] border-[#B45309]'
                                  : 'bg-[#FAF8F3] border-[#111317]/35',
                              ].join(' ')}
                            />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[16px] sm:text-[17px] font-bold text-[#111317] leading-snug">
                              {ch.title}
                            </span>
                            <Badge variant={getDifficultyVariant(ch.difficulty)}>
                              {ch.difficulty}
                            </Badge>
                            {isDone ? (
                              <Badge variant="green">{isAttacker ? 'SOLVED' : 'VERIFIED'}</Badge>
                            ) : summary?.count > 0 ? (
                              <Badge variant="amber">IN PROGRESS</Badge>
                            ) : null}
                          </div>

                          <p className="text-[14px] text-[#4B5260] leading-snug truncate">
                            {getModuleContext(ch)}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-[#4B5260]">
                            <span>{ch.vulnerability_type}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#111317] font-medium">{ch.dvwa_page_ref}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                        {isAttacker ? (
                          <div className="flex items-center gap-1 font-mono text-xs">
                            {['low', 'medium', 'high'].map((tier) => {
                              const ok = solvedTiers.has(tier) || (tier === 'low' && isDone);
                              return (
                                <span
                                  key={tier}
                                  title={`${tier} security tier ${ok ? 'cleared' : 'pending'}`}
                                  className={[
                                    'px-2 py-0.5 rounded border uppercase font-semibold',
                                    ok
                                      ? 'bg-[#047857]/12 border-[#047857]/40 text-[#047857]'
                                      : 'bg-[#EAE4D7] border-[#111317]/20 text-[#4B5260]',
                                  ].join(' ')}
                                >
                                  {tier[0]}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          latestLevel && (
                            <Badge
                              variant={
                                latestLevel === 'impossible'
                                  ? 'green'
                                  : latestLevel === 'high'
                                    ? 'cobalt'
                                    : latestLevel === 'medium'
                                      ? 'amber'
                                      : 'red'
                              }
                              className="uppercase font-mono"
                            >
                              {latestLevel}
                            </Badge>
                          )
                        )}

                        <Button
                          type="button"
                          variant={isAttacker ? 'attacker' : 'defender'}
                          size="sm"
                          onClick={() => onSelectChallenge?.(ch)}
                        >
                          <span>Launch Lab</span>
                          <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
