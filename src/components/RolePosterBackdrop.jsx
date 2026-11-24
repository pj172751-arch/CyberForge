import React from 'react';

export default function RolePosterBackdrop({ role = 'attacker' }) {
  const isAttacker = role === 'attacker';
  const primaryColor = isAttacker ? '#ff2a3d' : '#2ab7ff';
  const secondaryColor = isAttacker ? '#ff7582' : '#70d6ff';
  const darkGlow = isAttacker ? 'rgba(255, 42, 61, 0.22)' : 'rgba(42, 183, 255, 0.22)';

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0 flex flex-col justify-between">
      {/* 1. Subtle Cyber Ambient Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isAttacker
            ? 'radial-gradient(circle at 50% 48%, rgba(185, 28, 28, 0.24) 0%, rgba(30, 4, 8, 0.85) 55%, #050508 100%)'
            : 'radial-gradient(circle at 50% 48%, rgba(14, 165, 233, 0.22) 0%, rgba(3, 18, 33, 0.85) 55%, #050508 100%)'
        }}
      />

      {/* Subtle Coordinate Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${primaryColor} 1px, transparent 1px), linear-gradient(90deg, ${primaryColor} 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />

      {/* 2. Top Editorial Header Elements (inspired by reference poster) */}
      <div className="relative z-10 w-full px-6 sm:px-12 pt-20 sm:pt-24 flex items-start justify-between">
        {/* Top-Left: Wireframe glyphs [X][X][X] and technical micro-specs */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 opacity-80">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-5 h-5 sm:w-6 sm:h-6 border border-white/20 relative flex items-center justify-center bg-black/40"
              >
                <svg className="w-full h-full text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <line x1="0" y1="0" x2="24" y2="24" />
                  <line x1="24" y1="0" x2="0" y2="24" />
                </svg>
              </div>
            ))}
            <div className="ml-2 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full border ${isAttacker ? 'border-red-400' : 'border-[#2ab7ff]'}`} />
              <span className={`w-2 h-2 rounded-full ${isAttacker ? 'bg-red-500/80 shadow-[0_0_6px_#ff2a3d]' : 'bg-[#2ab7ff]/80 shadow-[0_0_6px_#2ab7ff]'}`} />
            </div>
          </div>

          <div className="font-mono text-[9px] sm:text-[10px] tracking-widest text-zinc-400/90 uppercase space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">SYS_EDITION //</span>
              <span className="text-white font-semibold">2026.04</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">DESIGNATION //</span>
              <span className={isAttacker ? 'text-red-300' : 'text-sky-300'}>
                {isAttacker ? 'RED_TEAM_RECON_01' : 'BLUE_TEAM_SHIELD_02'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">SECURITY TIER //</span>
              <span className="text-emerald-400">AUTHORITATIVE</span>
            </div>
          </div>
        </div>

        {/* Top-Right: CyberForge Editorial Stamp & Telemetry Coordinate */}
        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-black tracking-widest text-white uppercase">
              CYBERFORGE
            </span>
            <span className={`w-2 h-2 rounded-full ${isAttacker ? 'bg-red-500 shadow-[0_0_8px_#ff2a3d]' : 'bg-[#2ab7ff] shadow-[0_0_8px_#2ab7ff]'}`} />
          </div>
          <div className="font-mono text-[9px] sm:text-[10px] text-zinc-400/80 uppercase tracking-widest">
            <div>LABS // OPERATIONAL MATRIX</div>
            <div className="text-zinc-500">HOST: 127.0.0.1:8081 (DVWA)</div>
          </div>
        </div>
      </div>

      {/* 3. Left & Right Measurement Scales (Graduated SVG Rulers) */}
      <div className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center gap-3">
        <svg width="24" height="280" viewBox="0 0 24 280" className="opacity-40">
          {/* Main vertical line */}
          <line x1="8" y1="10" x2="8" y2="270" stroke={primaryColor} strokeWidth="1" />
          {/* Graduated tick lines */}
          {Array.from({ length: 27 }).map((_, idx) => {
            const y = 10 + idx * 10;
            const isMajor = idx % 5 === 0;
            return (
              <g key={idx}>
                <line
                  x1="8"
                  y1={y}
                  x2={isMajor ? 20 : 13}
                  y2={y}
                  stroke={isMajor ? '#ffffff' : primaryColor}
                  strokeWidth={isMajor ? 1.5 : 1}
                />
                {isMajor && (
                  <text
                    x="23"
                    y={y + 3}
                    fill="#94a3b8"
                    fontSize="7"
                    fontFamily="monospace"
                  >
                    {idx * 4}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500 [writing-mode:vertical-lr] rotate-180">
          {isAttacker ? 'PENETRATION DEPTH // AXIS_Y' : 'PERIMETER INTEGRITY // AXIS_Y'}
        </div>
      </div>

      <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center gap-3">
        <div className="font-mono text-[8px] uppercase tracking-widest text-zinc-500 [writing-mode:vertical-lr]">
          {isAttacker ? 'EXPLOIT DISPATCH FREQ // 142.8 MHZ' : 'TELEMETRY SAMPLING // REALTIME'}
        </div>

        <svg width="24" height="280" viewBox="0 0 24 280" className="opacity-40">
          <line x1="16" y1="10" x2="16" y2="270" stroke={primaryColor} strokeWidth="1" />
          {Array.from({ length: 27 }).map((_, idx) => {
            const y = 10 + idx * 10;
            const isMajor = idx % 5 === 0;
            return (
              <g key={idx}>
                <line
                  x1={isMajor ? 4 : 11}
                  y1={y}
                  x2="16"
                  y2={y}
                  stroke={isMajor ? '#ffffff' : primaryColor}
                  strokeWidth={isMajor ? 1.5 : 1}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* 4. Giant Poster Typography (BEHIND the 3D particle canvas) */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
        <div className="relative flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-4">
          
          {/* Overlaid Cursive / Script Accent (matching "Estilos" in reference poster) */}
          <div
            className="absolute -top-12 sm:-top-20 md:-top-28 left-4 sm:left-12 md:left-24 z-0 select-none pointer-events-none transform -rotate-6"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 700
            }}
          >
            <span
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wide text-white/95 drop-shadow-[0_4px_30px_rgba(255,255,255,0.45)]"
            >
              {isAttacker ? 'Offensive' : 'Perimeter'}
            </span>
          </div>

          {/* Giant Condensed Bold Typography (matching "VISUAIS" in reference image) */}
          <div className="relative select-none pointer-events-none">
            <h1
              className="text-[18vw] sm:text-[19vw] md:text-[20vw] lg:text-[21vw] font-black uppercase tracking-[-0.03em] leading-[0.78] text-center select-none"
              style={{
                fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif",
                background: isAttacker
                  ? 'linear-gradient(180deg, #ff334b 0%, #be123c 35%, #4c0519 75%, #180206 100%)'
                  : 'linear-gradient(180deg, #38bdf8 0%, #0284c7 35%, #082f49 75%, #02111d 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: isAttacker
                  ? 'drop-shadow(0 0 50px rgba(255,42,61,0.3))'
                  : 'drop-shadow(0 0 50px rgba(56,189,248,0.3))'
              }}
            >
              {isAttacker ? 'ATTACKER' : 'DEFENDER'}
            </h1>

            {/* Editorial Number Badge (matching "#3" on letter 'S' in reference image) */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 right-[12%] sm:right-[15%] md:right-[17%] px-2 sm:px-3 py-1 rounded-md font-mono text-[10px] sm:text-xs md:text-sm font-black tracking-widest uppercase border z-0 shadow-lg ${
                isAttacker
                  ? 'bg-red-950/90 text-red-200 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  : 'bg-sky-950/90 text-sky-200 border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
              }`}
            >
              {isAttacker ? '#01' : '#02'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Precise Mid-Level Operational Specs Floating on Left & Right */}
      <div className="relative z-10 w-full px-6 sm:px-12 flex items-end justify-between pb-24 sm:pb-28">
        {/* Left Specification Column */}
        <div className="max-w-xs sm:max-w-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              isAttacker
                ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                : 'bg-sky-950/80 text-sky-300 border border-[#2ab7ff]/40'
            }`}>
              {isAttacker ? 'VECTOR PROTOCOL // ACTIVE' : 'INGRESS FILTERING // ACTIVE'}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300/90 leading-relaxed font-sans font-medium">
            {isAttacker
              ? 'Execute precision adversarial workflows: automate reconnaissance, inject structured CVE payloads (SQLi, XSS, RCE), and evaluate target compromise.'
              : 'Enforce real-time telemetry inspection: synthesize dynamic L4/L7 iptables rules, escalate hardening tiers, and verify vulnerability neutralization.'}
          </p>

          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest pt-1 flex items-center gap-2">
            <span>TARGET_STATUS:</span>
            <span className="text-emerald-400 font-semibold">[READY // 8081]</span>
          </div>
        </div>

        {/* Right Metric Column */}
        <div className="text-right flex flex-col items-end gap-1.5 hidden sm:flex">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase tracking-wider">
            <span>TIER STATUS</span>
            <span className="text-white font-bold">{isAttacker ? 'OFFENSIVE V3' : 'DEFENSIVE HIGH'}</span>
          </div>
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest max-w-[200px] leading-snug">
            {isAttacker
              ? '21 ATTACK PROTOCOLS READY FOR AUDIT & INJECTION'
              : '21 DEFENSE RULES READY FOR HARDENING & REPLAY'}
          </div>
        </div>
      </div>

      {/* 6. Bottom-Right Diagonal Decorative Cyber Stripes (matching reference poster) */}
      <div className="absolute -bottom-10 -right-10 w-64 h-32 opacity-15 pointer-events-none transform -rotate-12 z-0">
        <svg viewBox="0 0 200 100" className="w-full h-full text-white">
          <line x1="0" y1="20" x2="200" y2="20" stroke="currentColor" strokeWidth="6" />
          <line x1="0" y1="45" x2="200" y2="45" stroke="currentColor" strokeWidth="12" />
          <line x1="0" y1="75" x2="200" y2="75" stroke="currentColor" strokeWidth="18" />
        </svg>
      </div>
    </div>
  );
}
