import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import { ArrowRight } from '@phosphor-icons/react';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Splits a string into individually animatable character spans while preserving spaces.
 */
function splitKineticChars(text) {
  const value = String(text || '');
  return value.split('').map((char, idx) => (
    <span key={`${idx}-${char}`} className="cf-kinetic-char">
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));
}

/**
 * Full-viewport Warm Archival Vellum (~550ms) upward rotated kinetic letter curtain
 * bridging major view transitions (3D Hub <-> Console, Track Atlas -> Lab Studio).
 */
export const KineticTypeCurtain = forwardRef(function KineticTypeCurtain(_, ref) {
  const overlayRef = useRef(null);
  const fieldRef = useRef(null);
  const timelineRef = useRef(null);

  const [payload, setPayload] = useState({
    role: 'attacker',
    title: 'CyberForge',
    subtitle: 'Live DVWA Range',
    trackLabel: 'OPERATIONAL MATRIX',
  });

  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

  const trigger = useCallback((options = {}) => {
    const {
      role = 'attacker',
      title = 'CyberForge Studio',
      subtitle = 'Live DVWA Target',
      trackLabel = 'OWASP WORKBENCH',
      onMidpoint,
    } = options;

    if (prefersReducedMotion()) {
      onMidpoint?.();
      return;
    }

    timelineRef.current?.kill();
    setPayload({
      role: role === 'defender' ? 'defender' : 'attacker',
      title: String(title || 'CyberForge Studio'),
      subtitle: String(subtitle || 'Live DVWA Target'),
      trackLabel: String(trackLabel || 'OWASP WORKBENCH'),
    });

    const overlay = overlayRef.current;
    const field = fieldRef.current;
    if (!overlay || !field) {
      onMidpoint?.();
      return;
    }

    const lines = [...field.querySelectorAll('.cf-curtain-line')];
    let midpointFired = false;
    const fireMidpoint = () => {
      if (midpointFired) return;
      midpointFired = true;
      onMidpoint?.();
    };

    gsap.set(overlay, { autoAlpha: 0 });
    gsap.set(field, { rotate: 0, scale: 1 });
    gsap.set(lines, { xPercent: 8, opacity: 0.16 });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(overlay, { autoAlpha: 0 });
        gsap.set(field, { rotate: 0, scale: 1 });
        gsap.set(lines, { xPercent: 0, opacity: 0.16 });
        timelineRef.current = null;
      },
    });
    timelineRef.current = tl;

    tl.to(overlay, { autoAlpha: 1, duration: 0.18, ease: 'power2.out' }, 0)
      .to(
        field,
        {
          rotate: -90,
          scale: 2.45,
          duration: 1.25,
          ease: 'power2.inOut',
        },
        0.08
      )
      .to(
        lines,
        {
          keyframes: [
            { xPercent: 18, duration: 0.62, ease: 'power1.inOut' },
            { xPercent: -175, duration: 1.22, ease: 'power2.in' },
          ],
          stagger: 0.032,
        },
        0
      )
      .to(
        lines,
        {
          keyframes: [
            { opacity: 0.96, duration: 0.68, ease: 'power1.inOut' },
            { opacity: 0, duration: 1.05, ease: 'power1.in' },
          ],
          stagger: 0.02,
        },
        0.06
      )
      .call(fireMidpoint, [], 0.95)
      .to(overlay, { autoAlpha: 0, duration: 0.45, ease: 'power2.out' }, 1.55);
  }, []);

  useImperativeHandle(ref, () => ({ trigger }), [trigger]);

  const isDefender = payload.role === 'defender';
  const accentTextClass = isDefender ? 'text-[#1E40AF]' : 'text-[#D92D20]';
  const deepAccentClass = isDefender ? 'text-[#1E3A8A]' : 'text-[#B42318]';

  const curtainLines = useMemo(() => {
    const cleanTitle = payload.title;
    const cleanSub = payload.subtitle;
    const cleanTrack = payload.trackLabel.toUpperCase();

    if (isDefender) {
      return [
        { text: 'PERIMETER FIREWALL DEFENSE TELEMETRY SHIELD ISOLATE', italic: false, accent: false },
        { text: 'Prepared Statements · Output Encoding · Zero Trust · Forensics', italic: true, accent: false },
        { text: 'CONTENT SECURITY POLICY ANTI CSRF TOKEN HARDENING', italic: false, accent: true },
        { text: `${cleanTitle} · ${cleanSub} · Root Cause Remediation`, italic: true, accent: true },
        { text: 'PARAMETERIZED QUERIES STRICT ALLOWLIST QUARANTINE', italic: false, accent: true },
        { text: 'Session Entropy · Input Canonicalization · Replay Verification', italic: true, accent: false },
        { text: 'INTRUSION PREVENTION HEURISTIC AUDIT INTEGRITY LOCK', italic: false, accent: false },
        { text: `${cleanTrack} · DVWA Target 8081 · ${cleanTitle}`, italic: true, accent: true },
        { text: 'ESCAPE BOUNDARY SANITIZE SINK VERIFY IMPOSSIBLE TIER', italic: false, accent: true },
        { text: 'Inspect Handler Diff · Grade Patch Logic · Block Live Replay', italic: true, accent: false },
        { text: 'SENTINEL SHIELD PERIMETER SECURED DEFENSE ACTIVE', italic: false, accent: false },
      ];
    }

    return [
      { text: 'CYBERFORGE EXPLOIT PROTOCOL INJECTION ROOT ACCESS', italic: false, accent: false },
      { text: 'Tainted Input · Boolean Oracle · Reverse Shell · Zero Day', italic: true, accent: false },
      { text: 'OFFENSIVE OPERATIONS BREACH VECTOR ACTIVE RECON TAINT', italic: false, accent: true },
      { text: `${cleanTitle} · ${cleanSub} · Live PHP Sink`, italic: true, accent: true },
      { text: 'PRIVILEGE ESCALATION COMMAND CONTROL EXFILTRATION CIPHER', italic: false, accent: true },
      { text: 'Session Hijack · Reflected DOM · Token Forge · Path Traversal', italic: true, accent: false },
      { text: 'VULNERABILITY AUDIT BRUTE FORCE BYPASS PERSISTENCE', italic: false, accent: false },
      { text: `${cleanTrack} · DVWA Target 8081 · ${cleanTitle}`, italic: true, accent: true },
      { text: 'SQL SYNTAX BREAKOUT PARAMETER POLLUTION PAYLOAD PROBE', italic: false, accent: true },
      { text: 'Inspect HTTP Wire · Escalate Filter Tier · Capture Live Proof', italic: true, accent: false },
      { text: 'TERMINAL ZERO SYSTEM OVERRIDE ATTACK PROTOCOL', italic: false, accent: false },
    ];
  }, [isDefender, payload]);

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-[120] invisible opacity-0 pointer-events-none overflow-hidden bg-[#F3EFE6] flex items-center justify-center select-none"
    >
      {/* Swiss Press corner registration hairlines */}
      <span className="absolute top-5 left-5 w-6 h-6 border-t border-l border-[#111317]/25" />
      <span className="absolute top-5 right-5 w-6 h-6 border-t border-r border-[#111317]/25" />
      <span className="absolute bottom-5 left-5 w-6 h-6 border-b border-l border-[#111317]/25" />
      <span className="absolute bottom-5 right-5 w-6 h-6 border-b border-r border-[#111317]/25" />

      <div
        ref={fieldRef}
        className="w-[155vmax] flex flex-col gap-2 will-change-transform origin-center"
      >
        {curtainLines.map((line, idx) => (
          <div
            key={idx}
            className={[
              'cf-curtain-line whitespace-nowrap will-change-transform',
              line.italic
                ? `font-editorial italic text-[clamp(2.3rem,5.4vw,4.4rem)] leading-[0.94] ${
                    line.accent ? deepAccentClass : 'text-[#111317]/80'
                  }`
                : `font-display font-extrabold uppercase text-[clamp(2.8rem,6.5vw,5.2rem)] leading-[0.88] tracking-[-0.02em] ${
                    line.accent ? accentTextClass : 'text-[#111317]'
                  }`,
            ].join(' ')}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Non-blocking (~260ms) upward character-slot roll for Lab Studio headings
 * when switching between DVWA targets or escalating security tiers.
 */
export function KineticTitleRoll({ text, triggerKey, role = 'attacker', className = '' }) {
  const containerRef = useRef(null);
  const lastTriggerRef = useRef(triggerKey);

  useEffect(() => {
    if (lastTriggerRef.current === triggerKey) {
      return;
    }
    lastTriggerRef.current = triggerKey;

    if (prefersReducedMotion()) return;
    const node = containerRef.current;
    if (!node) return;

    const chars = node.querySelectorAll('.cf-kinetic-char');
    if (!chars.length) return;

    const tween = gsap.fromTo(
      chars,
      { yPercent: 108, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.26,
        stagger: 0.012,
        ease: 'power3.out',
        overwrite: true,
      }
    );

    return () => {
      tween.kill();
    };
  }, [triggerKey]);

  const accentCaretClass = role === 'defender' ? 'text-[#1E40AF]' : 'text-[#D92D20]';

  return (
    <span
      ref={containerRef}
      aria-label={text}
      className={['inline-flex flex-wrap items-baseline overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true" className="inline-flex flex-wrap items-baseline">
        {splitKineticChars(text)}
      </span>
      <span aria-hidden="true" className={`ml-0.5 font-editorial italic ${accentCaretClass}`}>
        .
      </span>
    </span>
  );
}

/**
 * Crisp Light Archival Folio card with 4-corner mechanical shutters sliding inward
 * on hover/focus via GSAP to spotlight live DVWA telemetry without leaking answers.
 */
export function ArchivalShutterCard({
  indexNum = '01',
  challenge,
  role = 'attacker',
  trackTag = 'TRACK I',
  contextText = '',
  isDone = false,
  isInProgress = false,
  solvedTiers,
  latestLevel = null,
  onLaunch,
}) {
  const cardRef = useRef(null);
  const baseRef = useRef(null);
  const shutterLayerRef = useRef(null);
  const activeTlRef = useRef(null);

  const isAttacker = role === 'attacker';
  const accentTextClass = isAttacker ? 'text-[#D92D20]' : 'text-[#1E40AF]';
  const deepAccentTextClass = isAttacker ? 'text-[#B42318]' : 'text-[#1E3A8A]';

  const statusText = isDone
    ? isAttacker
      ? 'SOLVED'
      : 'VERIFIED'
    : isInProgress
      ? 'IN PROGRESS'
      : isAttacker
        ? 'READY'
        : 'PENDING';

  const statusPillClass = isDone
    ? 'bg-[#047857]/12 text-[#047857] border-[#047857]/35'
    : isInProgress
      ? 'bg-[#B45309]/12 text-[#92400E] border-[#B45309]/35'
      : isAttacker
        ? 'bg-[#D92D20]/10 text-[#B42318] border-[#D92D20]/30'
        : 'bg-[#1E40AF]/10 text-[#1E3A8A] border-[#1E40AF]/30';

  const difficultyKey = String(challenge?.difficulty || '').toLowerCase();
  const difficultyClass =
    difficultyKey === 'hard'
      ? 'text-[#B42318]'
      : difficultyKey === 'medium'
        ? 'text-[#92400E]'
        : 'text-[#047857]';

  useEffect(() => {
    return () => {
      activeTlRef.current?.kill();
    };
  }, []);

  const animateShutter = useCallback((opening) => {
    if (prefersReducedMotion()) return;
    const base = baseRef.current;
    const layer = shutterLayerRef.current;
    const card = cardRef.current;
    if (!base || !layer || !card) return;

    activeTlRef.current?.kill();
    const boxes = [...layer.querySelectorAll('.cf-shutter-box')];
    const chars = [...layer.querySelectorAll('.cf-kinetic-char')];

    const offsets = [
      { xPercent: -14, yPercent: -14 },
      { xPercent: 14, yPercent: -14 },
      { xPercent: -14, yPercent: 14 },
      { xPercent: 14, yPercent: 14 },
    ];

    if (opening) {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      activeTlRef.current = tl;
      tl.set(layer, { autoAlpha: 1 }, 0)
        .to(base, { scale: 0.95, opacity: 0.12, duration: 0.3, ease: 'power3.out' }, 0)
        .fromTo(
          boxes,
          {
            opacity: 0,
            xPercent: (idx) => offsets[idx]?.xPercent ?? 0,
            yPercent: (idx) => offsets[idx]?.yPercent ?? 0,
          },
          {
            opacity: 1,
            xPercent: 0,
            yPercent: 0,
            duration: 0.32,
            stagger: 0.025,
          },
          0
        )
        .fromTo(
          chars,
          { opacity: 0, yPercent: 35 },
          {
            opacity: 1,
            yPercent: 0,
            duration: 0.24,
            stagger: 0.008,
            ease: 'power2.out',
          },
          0.04
        );
    } else {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      activeTlRef.current = tl;
      tl.to(base, { scale: 1, opacity: 1, duration: 0.24 }, 0)
        .to(
          boxes,
          {
            opacity: 0,
            xPercent: (idx) => offsets[idx]?.xPercent ?? 0,
            yPercent: (idx) => offsets[idx]?.yPercent ?? 0,
            duration: 0.2,
          },
          0
        )
        .set(layer, { autoAlpha: 0 });
    }
  }, []);

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onLaunch?.(challenge)}
      onMouseEnter={() => animateShutter(true)}
      onMouseLeave={() => animateShutter(false)}
      onFocus={() => animateShutter(true)}
      onBlur={() => animateShutter(false)}
      aria-label={`Launch ${challenge?.title || 'lab'} lab`}
      className={[
        'group relative w-full h-auto min-h-[128px] md:h-[136px] text-left rounded-xl overflow-hidden',
        'bg-[#FAF8F3] border border-[#111317]/15 transition-colors duration-150',
        'hover:border-[#111317]/35 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]',
      ].join(' ')}
    >
      {/* Resting Light Folio Card Face */}
      <div
        ref={baseRef}
        className="w-full h-full px-4 py-3 flex flex-col justify-between gap-2 will-change-transform"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span
              className={`font-display text-[22px] font-extrabold leading-none tabular-nums shrink-0 ${accentTextClass}`}
            >
              {indexNum}
            </span>
            <h3 className="text-[15.5px] font-bold text-[#111317] leading-snug truncate">
              {challenge?.title}
            </h3>
          </div>
          <span
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${statusPillClass}`}
          >
            {statusText}
          </span>
        </div>

        <p className="text-[13.5px] text-[#4B5260] leading-snug line-clamp-2">
          {contextText}
        </p>

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#111317]/12">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#4B5260] min-w-0 truncate">
            <span className={`font-semibold shrink-0 ${difficultyClass}`}>
              {challenge?.difficulty}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{challenge?.vulnerability_type}</span>
          </div>

          {isAttacker ? (
            <div className="flex items-center gap-1 font-mono text-xs shrink-0">
              {['low', 'medium', 'high'].map((tier) => {
                const ok = solvedTiers?.has(tier) || (tier === 'low' && isDone);
                return (
                  <span
                    key={tier}
                    className={[
                      'px-1.5 py-0.5 rounded border uppercase font-semibold leading-none',
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
            <span className="text-xs font-mono uppercase font-semibold px-2 py-0.5 rounded border border-[#111317]/20 bg-[#EAE4D7] text-[#111317] shrink-0">
              {latestLevel || 'low'}
            </span>
          )}
        </div>
      </div>

      {/* 4-Corner Mechanical Archival Shutters (Hover / Focus Reveal) */}
      <div
        ref={shutterLayerRef}
        aria-hidden="true"
        className="pointer-events-none invisible opacity-0 absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5"
      >
        {/* Top-Left: Condensed Module Number & Track Tag */}
        <div className="cf-shutter-box rounded-lg bg-[#F3EFE6]/95 border border-[#111317]/20 px-2.5 py-1.5 flex items-center justify-between gap-1.5 overflow-hidden">
          <span className={`font-display text-2xl font-extrabold leading-none ${accentTextClass}`}>
            {splitKineticChars(`#${indexNum}`)}
          </span>
          <span className="text-xs font-mono font-semibold text-[#4B5260] uppercase truncate">
            {splitKineticChars(trackTag)}
          </span>
        </div>

        {/* Top-Right: Live Telemetry Status & Difficulty */}
        <div className="cf-shutter-box rounded-lg bg-[#F3EFE6]/95 border border-[#111317]/20 px-2.5 py-1.5 flex items-center justify-between gap-1.5 overflow-hidden">
          <span className={`text-xs font-mono font-bold truncate ${deepAccentTextClass}`}>
            {splitKineticChars(statusText)}
          </span>
          <span className={`text-xs font-mono font-semibold shrink-0 ${difficultyClass}`}>
            {challenge?.difficulty}
          </span>
        </div>

        {/* Bottom-Left: DVWA Page Ref */}
        <div className="cf-shutter-box rounded-lg bg-[#F3EFE6]/95 border border-[#111317]/20 px-2.5 py-1.5 flex items-center justify-between gap-1.5 overflow-hidden">
          <span className="text-xs font-mono font-medium text-[#111317] truncate">
            {splitKineticChars(challenge?.dvwa_page_ref || 'DVWA :8081')}
          </span>
        </div>

        {/* Bottom-Right: Editorial Action Trigger */}
        <div className="cf-shutter-box rounded-lg bg-[#FAF8F3] border border-[#111317]/30 px-2.5 py-1.5 flex items-center justify-between gap-1.5 overflow-hidden">
          <span className={`font-editorial italic text-[20px] leading-none truncate ${accentTextClass}`}>
            {splitKineticChars(isAttacker ? 'Launch Lab' : 'Audit Sink')}
          </span>
          <ArrowRight className={`w-4 h-4 shrink-0 ${accentTextClass}`} weight="bold" />
        </div>
      </div>
    </button>
  );
}
