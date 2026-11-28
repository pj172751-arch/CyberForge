import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import RolePosterBackdrop from './RolePosterBackdrop';

const AttackerParticles = lazy(() => import('./AttackerParticles'));
const DefenderParticles = lazy(() => import('./DefenderParticles'));
import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  SignOut,
} from '@phosphor-icons/react';
import { apiFetch } from '../utils/api';
import './StickyGridScroll.css';

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_TRACKS = [
  {
    track_id: 'track_1_injection',
    track_order: 1,
    title: 'Track I · Injection Mastery',
    shortLabel: 'Track I · Injection',
    modules: ['sqli', 'sqli_blind', 'exec'],
  },
  {
    track_id: 'track_2_client',
    track_order: 2,
    title: 'Track II · Client-Side Exploitation',
    shortLabel: 'Track II · Client',
    modules: ['xss_r', 'xss_s', 'xss_d', 'csp', 'javascript'],
  },
  {
    track_id: 'track_3_auth',
    track_order: 3,
    title: 'Track III · Auth & Workflow Abuse',
    shortLabel: 'Track III · Auth',
    modules: ['brute', 'weak_id', 'csrf', 'captcha'],
  },
  {
    track_id: 'track_4_server',
    track_order: 4,
    title: 'Track IV · Server & File Takeover',
    shortLabel: 'Track IV · Server',
    modules: ['fi', 'upload'],
  },
];

const MODULE_META = {
  sqli: {
    attackDesc: 'Extract database rows by breaking out of unsanitized SQL string concatenation.',
    defendDesc: 'Bind parameters with PDO prepared statements to neutralize query injection.',
  },
  sqli_blind: {
    attackDesc: 'Infer hidden records via true/false boolean conditions and time-delay probes.',
    defendDesc: 'Enforce parameterized queries and suppress differential timing or error leaks.',
  },
  exec: {
    attackDesc: 'Chain shell metacharacters through diagnostic ping arguments to run OS commands.',
    defendDesc: 'Validate strict IP format allowlists and eliminate raw shell invocation.',
  },
  xss_r: {
    attackDesc: 'Reflect executable script payloads directly inside unescaped server responses.',
    defendDesc: 'Apply context-aware HTML output encoding with htmlspecialchars ENT_QUOTES.',
  },
  xss_s: {
    attackDesc: 'Persist malicious JavaScript in guestbook entries executed for every visitor.',
    defendDesc: 'Sanitize stored input, encode output on render, and enforce strict CSP.',
  },
  xss_d: {
    attackDesc: 'Exploit unsafe client-side DOM sinks reading unvalidated URL parameters.',
    defendDesc: 'Replace raw HTML DOM sinks with textContent and strict allowlist checks.',
  },
  csp: {
    attackDesc: 'Bypass permissive Content-Security-Policy whitelists and weak script sources.',
    defendDesc: 'Remove unsafe-inline, drop open CDN JSONP hosts, and require strict nonces.',
  },
  javascript: {
    attackDesc: 'Reverse weak client-side token signing logic to forge valid requests.',
    defendDesc: 'Move cryptographic token verification exclusively onto the server.',
  },
  brute: {
    attackDesc: 'Automate credential guesses against unthrottled login forms.',
    defendDesc: 'Enforce per-account lockout, anti-CSRF tokens, and timing-safe checks.',
  },
  weak_id: {
    attackDesc: 'Predict sequential or weakly hashed session identifiers to hijack sessions.',
    defendDesc: 'Generate cryptographically random session IDs with HttpOnly and SameSite flags.',
  },
  csrf: {
    attackDesc: 'Trigger state-changing password updates via forged cross-origin requests.',
    defendDesc: 'Require unpredictable per-session anti-CSRF tokens and current-password checks.',
  },
  captcha: {
    attackDesc: 'Skip multi-step verification gates by tampering with hidden step parameters.',
    defendDesc: 'Bind server-side verification state to the session rather than client flags.',
  },
  fi: {
    attackDesc: 'Traverse local include paths to expose host files and PHP source.',
    defendDesc: 'Map page parameters to an explicit server-side file allowlist.',
  },
  upload: {
    attackDesc: 'Bypass extension or Content-Type checks to plant executable web shells.',
    defendDesc: 'Verify image magic bytes, re-encode uploads, and store outside web root.',
  },
};

function inferModuleKey(pageRef) {
  const raw = String(pageRef || '').toLowerCase();
  const match = raw.match(
    /(?:^|\/)(sqli_blind|sqli|xss_r|xss_s|xss_d|weak_id|upload|brute|csrf|exec|csp|javascript|captcha|fi)(?:\/|$|\?)/
  );
  return match ? match[1] : 'custom';
}

function renderModuleSvg(moduleKey, isAttacker) {
  const strokeClass = isAttacker ? 'w-5 h-5 text-red-400' : 'w-5 h-5 text-[#38bdf8]';
  switch (moduleKey) {
    case 'sqli':
    case 'sqli_blind':
      return (
        <svg className={strokeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'xss_r':
    case 'xss_s':
    case 'xss_d':
    case 'javascript':
      return (
        <svg className={strokeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
      );
    case 'exec':
      return (
        <svg className={strokeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    case 'fi':
    case 'upload':
      return (
        <svg className={strokeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
      );
    case 'csrf':
    case 'weak_id':
    case 'brute':
    case 'captcha':
      return (
        <svg className={strokeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    default:
      return (
        <svg className={strokeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      );
  }
}

function CyberForgeHubMark({ isAttacker }) {
  const accent = isAttacker ? '#EF4444' : '#38BDF8';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="shrink-0">
      <polygon
        points="14,2 25,8.25 25,19.75 14,26 3,19.75 3,8.25"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
        fill="#0A0B0F"
      />
      <polygon
        points="14,6 21,10 21,18 14,22 7,18 7,10"
        stroke={accent}
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M14 10L17.5 12V16L14 18L10.5 16V12L14 10Z" fill={accent} />
    </svg>
  );
}

function shortTrackTag(track) {
  if (!track) return 'Custom';
  if (track.shortLabel) return track.shortLabel;
  const order = track.track_order;
  const roman = order === 1 ? 'I' : order === 2 ? 'II' : order === 3 ? 'III' : order === 4 ? 'IV' : String(order || '');
  return roman ? `Track ${roman}` : 'Track';
}

export default function RoleLandingPage({
  user,
  role = 'attacker',
  email = '',
  onSignOut,
  onNavigateToTasks,
  onSelectChallenge,
}) {
  const effectiveRole = (user?.role || role || 'attacker').toLowerCase();
  const isAttacker = effectiveRole === 'attacker';
  const operatorId = user?.id;

  const [challenges, setChallenges] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');

  const blockRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const buttonRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHubData() {
      setLoadingData(true);
      setDataError('');
      try {
        const progressEndpoint = isAttacker
          ? operatorId
            ? `/api/attempts?attacker_id=${encodeURIComponent(operatorId)}`
            : '/api/attempts'
          : operatorId
            ? `/api/defenses?defender_id=${encodeURIComponent(operatorId)}`
            : '/api/defenses';

        const [challengeList, trackList, roleLogs] = await Promise.all([
          apiFetch('/api/challenges'),
          apiFetch('/api/tracks').catch(() => []),
          apiFetch(progressEndpoint).catch(() => []),
        ]);

        if (!cancelled) {
          setChallenges(Array.isArray(challengeList) ? challengeList : []);
          setTracks(Array.isArray(trackList) ? trackList : []);
          setProgressRows(Array.isArray(roleLogs) ? roleLogs : []);
        }
      } catch (err) {
        if (!cancelled) {
          setDataError(err?.message || 'Unable to sync live DVWA challenges.');
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadHubData();
    return () => {
      cancelled = true;
    };
  }, [isAttacker, operatorId]);

  const progressMap = useMemo(() => {
    const map = new Map();
    if (isAttacker) {
      for (const item of progressRows) {
        const prev = map.get(item.challenge_id) || {
          count: 0,
          solved: false,
          solvedTiers: new Set(),
        };
        const isSuccess = item.status === 'success';
        const nextTiers = new Set(prev.solvedTiers);
        if (isSuccess) {
          nextTiers.add(
            String(item.target_security_level || item.dvwa_security_level || 'low').toLowerCase()
          );
        }
        map.set(item.challenge_id, {
          count: prev.count + 1,
          solved: prev.solved || isSuccess,
          solvedTiers: nextTiers,
        });
      }
    } else {
      for (const item of progressRows) {
        const prev = map.get(item.challenge_id);
        if (!prev) {
          map.set(item.challenge_id, {
            count: 1,
            verified: Boolean(item.verified),
            latestLevel: item.security_level_applied || null,
          });
        } else {
          map.set(item.challenge_id, {
            count: prev.count + 1,
            verified: prev.verified || Boolean(item.verified),
            latestLevel: prev.latestLevel || item.security_level_applied || null,
          });
        }
      }
    }
    return map;
  }, [isAttacker, progressRows]);

  const trackByModule = useMemo(() => {
    const map = new Map();
    const sourceTracks = tracks.length > 0 ? tracks : FALLBACK_TRACKS;
    for (const tr of sourceTracks) {
      for (const mod of tr.modules || []) {
        map.set(String(mod).toLowerCase(), tr);
      }
      for (const ch of tr.challenges || []) {
        const mod = inferModuleKey(ch.dvwa_page_ref);
        if (mod !== 'custom') {
          map.set(mod, tr);
        }
      }
    }
    return map;
  }, [tracks]);

  const enrichedChallenges = useMemo(() => {
    return challenges.map((ch) => {
      const moduleKey = inferModuleKey(ch.dvwa_page_ref);
      const track = trackByModule.get(moduleKey);
      const meta = MODULE_META[moduleKey];
      const summary = progressMap.get(ch.challenge_id);
      const cleared = isAttacker ? Boolean(summary?.solved) : Boolean(summary?.verified);

      return {
        ...ch,
        moduleKey,
        trackTag: shortTrackTag(track),
        summary,
        cleared,
        description: isAttacker
          ? meta?.attackDesc || `Exploit ${ch.vulnerability_type} at ${ch.dvwa_page_ref} inside live DVWA.`
          : meta?.defendDesc || `Audit and remediate ${ch.vulnerability_type} at ${ch.dvwa_page_ref}.`,
      };
    });
  }, [challenges, trackByModule, progressMap, isAttacker]);

  const clearedCount = useMemo(
    () => enrichedChallenges.filter((ch) => ch.cleared).length,
    [enrichedChallenges]
  );

  const nextMissionChallenge = useMemo(() => {
    if (enrichedChallenges.length === 0) return null;
    return enrichedChallenges.find((ch) => !ch.cleared) || enrichedChallenges[0];
  }, [enrichedChallenges]);

  const handleCardLaunch = useCallback(
    (challenge) => {
      if (typeof onSelectChallenge === 'function') {
        onSelectChallenge(challenge);
      } else if (typeof onNavigateToTasks === 'function') {
        onNavigateToTasks();
      }
    },
    [onSelectChallenge, onNavigateToTasks]
  );

  const handleContinueMission = useCallback(() => {
    if (nextMissionChallenge && typeof onSelectChallenge === 'function') {
      onSelectChallenge(nextMissionChallenge);
    } else if (typeof onNavigateToTasks === 'function') {
      onNavigateToTasks();
    }
  }, [nextMissionChallenge, onSelectChallenge, onNavigateToTasks]);

  const challengesSignature = useMemo(
    () => enrichedChallenges.map((ch) => ch.challenge_id).join(','),
    [enrichedChallenges]
  );

  useEffect(() => {
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1.4,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const tickerCb = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCb);
    gsap.ticker.lagSmoothing(0);

    const block = blockRef.current;
    const title = titleRef.current;
    const description = descRef.current;
    const button = buttonRef.current;
    const grid = gridRef.current;

    const ctx = gsap.context(() => {
      let items = [];
      let cardButtons = [];
      if (grid) {
        items = Array.from(grid.querySelectorAll('.gallery__item'));
        cardButtons = Array.from(grid.querySelectorAll('.gallery__item button'));
      }

      if (!block || items.length === 0) return;

      const isMobileGrid = window.innerWidth < 640;
      const numColumns = isMobileGrid ? 2 : 3;
      const columns = Array.from({ length: numColumns }, () => []);
      items.forEach((item, index) => {
        columns[index % numColumns].push(item);
      });

      const textTargets = [title, description].filter(Boolean);
      const allContentTargets = [title, description, button].filter(Boolean);
      if (allContentTargets.length) {
        gsap.set(allContentTargets, { opacity: 0, yPercent: 18, pointerEvents: 'none' });
      }

      const wh = window.innerHeight || 900;
      const enterOffset = Math.round(wh * 0.42);

      const masterTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: block,
          start: 'top 55%',
          end: 'bottom bottom',
          scrub: true,
        },
      });

      // Phase 1 (0.85): bring all columns into centered view
      columns.forEach((column, colIndex) => {
        if (!column.length) return;
        const fromTop = colIndex % 2 === 0;
        masterTimeline.fromTo(
          column,
          { y: fromTop ? -enterOffset : enterOffset, opacity: 0.25 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            stagger: {
              each: 0.04,
              from: fromTop ? 'end' : 'start',
            },
            ease: 'power1.out',
          },
          0
        );
      });

      // Phase 2: Interactive Hold Plateau (cards stay stationary & clickable mid-scroll)
      masterTimeline.to({}, { duration: 1.5 });

      // Phase 3 (1.0): Scale & part grid, fade cards, reveal title/description/CTA
      const phase3Start = masterTimeline.duration();
      if (grid) {
        masterTimeline.fromTo(
          grid,
          { scale: 1, opacity: 1 },
          {
            scale: isMobileGrid ? 1.5 : 1.9,
            opacity: 0.08,
            duration: 1.0,
            ease: 'power2.inOut',
          },
          phase3Start
        );
      }

      if (numColumns === 2) {
        if (columns[0]?.length) {
          masterTimeline.fromTo(
            columns[0],
            { xPercent: 0 },
            { xPercent: -70, duration: 1.0, ease: 'power2.inOut' },
            phase3Start
          );
        }
        if (columns[1]?.length) {
          masterTimeline.fromTo(
            columns[1],
            { xPercent: 0 },
            { xPercent: 70, duration: 1.0, ease: 'power2.inOut' },
            phase3Start
          );
        }
      } else {
        if (columns[0]?.length) {
          masterTimeline.fromTo(
            columns[0],
            { xPercent: 0 },
            { xPercent: -70, duration: 1.0, ease: 'power2.inOut' },
            phase3Start
          );
        }
        if (columns[2]?.length) {
          masterTimeline.fromTo(
            columns[2],
            { xPercent: 0 },
            { xPercent: 70, duration: 1.0, ease: 'power2.inOut' },
            phase3Start
          );
        }
        if (columns[1]?.length) {
          const splitIdx = Math.ceil(columns[1].length / 2);
          masterTimeline.fromTo(
            columns[1],
            { yPercent: 0, opacity: 1 },
            {
              yPercent: (index) => (index < splitIdx ? -120 : 120),
              opacity: 0,
              duration: 0.85,
              ease: 'power2.inOut',
            },
            phase3Start + 0.1
          );
        }
      }

      if (cardButtons.length) {
        masterTimeline.fromTo(
          cardButtons,
          { pointerEvents: 'auto' },
          { pointerEvents: 'none', duration: 0.01 },
          phase3Start + 0.35
        );
      }

      if (textTargets.length) {
        masterTimeline.fromTo(
          textTargets,
          { opacity: 0, yPercent: 18 },
          { opacity: 1, yPercent: 0, duration: 0.55, ease: 'power2.out' },
          phase3Start + 0.35
        );
      }

      if (button) {
        masterTimeline.fromTo(
          button,
          { opacity: 0, yPercent: 18, pointerEvents: 'none' },
          { opacity: 1, yPercent: 0, pointerEvents: 'auto', duration: 0.55, ease: 'power2.out' },
          phase3Start + 0.35
        );
      }

      // Brief trailing hold so bottom scroll keeps CTA crisp and clickable
      masterTimeline.to({}, { duration: 0.25 });
    }, blockRef);

    ScrollTrigger.refresh();
    const rafId = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    const timer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 220);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
      lenis.destroy();
      gsap.ticker.remove(tickerCb);
      ctx.revert();
    };
  }, [effectiveRole, challengesSignature]);

  const operatorHandle = user?.username || email || (isAttacker ? 'attacker' : 'defender');

  return (
    <div className="scroll-page overflow-x-clip selection:bg-white/20">
      {/* Persistent Top Command HUD Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 bg-black/75 backdrop-blur-md border-b border-white/15 pointer-events-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <CyberForgeHubMark isAttacker={isAttacker} />
          <div className="min-w-0">
            <span className="text-sm font-bold tracking-[0.12em] text-white uppercase block leading-tight">
              CyberForge
            </span>
            <span
              className={`text-xs font-mono tracking-wider uppercase block leading-tight ${
                isAttacker ? 'text-red-300' : 'text-sky-300'
              }`}
            >
              {isAttacker ? 'Attacker Protocol' : 'Defender Shield'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#121417] border border-white/15 text-xs font-mono text-zinc-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isAttacker ? 'bg-red-500' : 'bg-[#38BDF8]'
              }`}
            />
            <span className="truncate max-w-[160px]">{operatorHandle}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-[#121417] border border-white/15 text-xs font-mono font-semibold tabular-nums text-zinc-100">
            {loadingData
              ? 'Syncing...'
              : `${clearedCount} / ${enrichedChallenges.length} Cleared`}
          </div>

          <button
            type="button"
            onClick={handleContinueMission}
            className={`min-h-[38px] px-3.5 sm:px-4 rounded-md text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-1.5 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              isAttacker
                ? 'bg-[#C81E1E] hover:bg-[#A61717]'
                : 'bg-[#1D4ED8] hover:bg-[#1740B5]'
            }`}
          >
            <span>Continue Mission</span>
            <ArrowRight className="w-4 h-4" weight="bold" />
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[38px] px-2.5 sm:px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs sm:text-sm font-medium text-zinc-200 hover:text-white inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <SignOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* BLOCK INTRO: 3D Particle Simulation & Editorial Poster Backdrop */}
      <section className="block block--intro">
        <RolePosterBackdrop role={effectiveRole} />
        <Suspense fallback={null}>
          {isAttacker ? <AttackerParticles /> : <DefenderParticles />}
        </Suspense>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
          <span
            className={`text-xs font-mono tracking-widest uppercase ${
              isAttacker ? 'text-red-200' : 'text-sky-200'
            }`}
          >
            Scroll to Explode & Launch Any Lab
          </span>
          <CaretDown
            className={`w-4 h-4 ${
              isAttacker ? 'text-red-400' : 'text-[#38bdf8]'
            }`}
            weight="bold"
          />
        </div>
      </section>

      {/* BLOCK MAIN: 425vh Sticky Parallax & Interactive 3-Column DVWA Matrix */}
      <section className="block block--main" ref={blockRef}>
        <div className="block__wrapper">
          <div className="content">
            <h2
              className="content__title text-[#FAF8F3]"
              ref={titleRef}
            >
              {isAttacker ? 'Offensive Exploitation Suite' : 'Perimeter Defense Architecture'}
            </h2>

            <p className="content__description !text-[15px] !text-zinc-200 !normal-case !tracking-normal" ref={descRef}>
              {isAttacker
                ? `Launch any of ${enrichedChallenges.length || 14} live DVWA modules, inspect vulnerable PHP sinks, and escalate through Low, Medium, and High filter tiers.`
                : `Audit ${enrichedChallenges.length || 14} vulnerable PHP handlers across 4 OWASP tracks, select the root-cause fix, and block live exploit replays.`}
            </p>

            <button
              type="button"
              ref={buttonRef}
              onClick={handleContinueMission}
              className={`content__button ${
                isAttacker ? 'text-red-300 hover:text-red-200' : 'text-sky-300 hover:text-sky-200'
              }`}
            >
              <span>Continue Mission</span>
              <ArrowRight className="w-4 h-4" weight="bold" />
            </button>
          </div>

          <div className="gallery !w-[min(960px,94vw)]">
            {dataError && enrichedChallenges.length === 0 ? (
              <div className="pointer-events-auto max-w-md mx-auto p-6 rounded-xl bg-[#0E1014]/95 border border-red-500/40 text-center space-y-3">
                <p className="text-sm text-red-200 font-medium">{dataError}</p>
                <button
                  type="button"
                  onClick={handleContinueMission}
                  className="px-4 py-2 rounded-md bg-[#C81E1E] text-white text-sm font-semibold"
                >
                  Open Studio Console
                </button>
              </div>
            ) : (
              <ul className="gallery__grid !grid-cols-2 sm:!grid-cols-3 !gap-2 sm:!gap-x-4 sm:!gap-y-2.5" ref={gridRef}>
                {enrichedChallenges.map((ch) => {
                  const isAttempted = !ch.cleared && (ch.summary?.count || 0) > 0;
                  const solvedTiers = ch.summary?.solvedTiers || new Set();
                  const latestLevel = ch.summary?.latestLevel;

                  const statusLabel = isAttacker
                    ? ch.cleared
                      ? 'SOLVED'
                      : isAttempted
                        ? 'ATTEMPTED'
                        : 'READY'
                    : ch.cleared
                      ? 'BLOCKED'
                      : isAttempted
                        ? 'EXPOSED'
                        : 'PENDING';

                  const statusClass = ch.cleared
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/45'
                    : isAttempted
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/45'
                      : isAttacker
                        ? 'bg-red-950/70 text-red-200 border-red-500/35'
                        : 'bg-sky-950/70 text-sky-200 border-sky-400/35';

                  return (
                    <li
                      key={ch.challenge_id}
                      className="gallery__item !aspect-auto !min-h-0 h-[96px] sm:h-[126px]"
                    >
                      <button
                        type="button"
                        onClick={() => handleCardLaunch(ch)}
                        aria-label={`Launch ${ch.title} lab`}
                        className={`pointer-events-auto cursor-pointer text-left w-full h-full !p-2.5 !rounded-xl gallery__task-box ${
                          isAttacker ? 'gallery__task-box--attacker' : 'gallery__task-box--defender'
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
                      >
                        {/* Top Row: Icon (sm+) + Track Tag + Live Status */}
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`hidden sm:flex p-1 rounded-md shrink-0 ${
                                isAttacker
                                  ? 'bg-red-950/60 border border-red-500/35'
                                  : 'bg-sky-950/60 border border-[#38bdf8]/35'
                              }`}
                            >
                              {renderModuleSvg(ch.moduleKey, isAttacker)}
                            </div>
                            <span className="text-xs font-mono text-zinc-300 truncate">
                              {ch.trackTag}
                            </span>
                          </div>

                          <span
                            className={`text-xs font-mono font-semibold px-1.5 sm:px-2 py-0.5 rounded border shrink-0 inline-flex items-center gap-1 ${statusClass}`}
                          >
                            {ch.cleared && <CheckCircle className="w-3.5 h-3.5" weight="bold" />}
                            {statusLabel}
                          </span>
                        </div>

                        {/* Middle: Title & Real Description */}
                        <div className="my-auto">
                          <h3 className="text-sm sm:text-[15px] font-bold text-white leading-snug line-clamp-1">
                            {ch.title}
                          </h3>
                          <p className="hidden sm:line-clamp-1 text-sm text-zinc-300 leading-snug">
                            {ch.description}
                          </p>
                        </div>

                        {/* Bottom Row: Difficulty + Tier Badges */}
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1 border-t border-white/10">
                          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 truncate">
                            <span
                              className={
                                ch.difficulty === 'Hard'
                                  ? 'text-red-300 font-semibold'
                                  : ch.difficulty === 'Medium'
                                    ? 'text-amber-300 font-semibold'
                                    : 'text-emerald-300 font-semibold'
                              }
                            >
                              {ch.difficulty}
                            </span>
                            <span className="hidden sm:inline" aria-hidden="true">·</span>
                            <span className="hidden sm:inline truncate">{ch.vulnerability_type}</span>
                          </div>

                          {isAttacker ? (
                            <div className="flex items-center gap-1 font-mono text-xs shrink-0">
                              {['low', 'medium', 'high'].map((tier) => {
                                const clearedTier =
                                  solvedTiers.has(tier) || (tier === 'low' && ch.cleared);
                                return (
                                  <span
                                    key={tier}
                                    className={`px-1 sm:px-1.5 py-0.5 rounded border uppercase ${
                                      clearedTier
                                        ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-300'
                                        : 'bg-white/[0.04] border-white/15 text-zinc-300'
                                    }`}
                                  >
                                    {tier[0]}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs font-mono uppercase px-1.5 sm:px-2 py-0.5 rounded border border-white/15 bg-white/[0.04] text-zinc-200 shrink-0">
                              {latestLevel || 'low'}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
