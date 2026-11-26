import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AttackerParticles from './AttackerParticles';
import DefenderParticles from './DefenderParticles';
import RolePosterBackdrop from './RolePosterBackdrop';
import { CaretDown, SignOut, X, TerminalWindow, ShieldCheck } from '@phosphor-icons/react';
import { ATTACKER_TASKS, DEFENDER_TASKS } from '../data/cyberTasks';
import './StickyGridScroll.css';

gsap.registerPlugin(ScrollTrigger);

export default function RoleLandingPage({ role = 'attacker', email = '', onSignOut, onNavigateToTasks }) {
  const isAttacker = role === 'attacker';
  const tasks = isAttacker ? ATTACKER_TASKS : DEFENDER_TASKS;
  const galleryTasks = tasks.slice(0, 12);

  const [showOverviewModal, setShowOverviewModal] = useState(false);

  const blockRef = useRef(null);
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const buttonRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    // Scroll window to top cleanly on mount
    window.scrollTo(0, 0);

    // 1. Initialize Lenis Smooth Scrolling (matching user code)
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
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    const title = titleRef.current;
    const description = descRef.current;
    const button = buttonRef.current;
    const grid = gridRef.current;

    // 2. Wrap all animations in gsap.context for React cleanup
    const ctx = gsap.context(() => {
      let items = [];
      if (grid) {
        items = Array.from(grid.querySelectorAll('.gallery__item'));
      }

      // Group Grid Items into 3 Columns
      const numColumns = 3;
      const columns = Array.from({ length: numColumns }, () => []);
      items.forEach((item, index) => {
        columns[index % numColumns].push(item);
      });

      // Initialize Visual State of Content (initContent)
      let titleOffsetY = 0;
      if (description && button) {
        gsap.set([description, button], { opacity: 0, pointerEvents: 'none' });
      }
      if (content && title) {
        const dy = (content.offsetHeight - title.offsetHeight) / 2;
        titleOffsetY = (dy / content.offsetHeight) * 100;
        gsap.set(title, { yPercent: titleOffsetY });
      }

      // Parallax on Wrapper (addParallaxOnScroll)
      if (block && wrapper) {
        gsap.fromTo(
          wrapper,
          { yPercent: -100 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: block,
              start: 'top bottom',
              end: 'top top',
              scrub: true,
            },
          }
        );
      }

      // Animate Title on Scroll (animateTitleOnScroll)
      if (block && title) {
        gsap.fromTo(
          title,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.7,
            ease: 'power1.out',
            scrollTrigger: {
              trigger: block,
              start: 'top 57%',
              toggleActions: 'play none none reset',
            },
          }
        );
      }

      // Grid Reveal Timeline (gridRevealTimeline)
      const wh = window.innerHeight;
      const gridHeight = grid?.offsetHeight && grid.offsetHeight > 100 ? grid.offsetHeight : Math.min(wh * 0.85, 750);
      const dy = wh - (wh - gridHeight) / 2;
      const revealTimeline = gsap.timeline();
      columns.forEach((column, colIndex) => {
        const fromTop = colIndex % 2 === 0;
        revealTimeline.fromTo(
          column,
          { y: dy * (fromTop ? -1 : 1) },
          {
            y: 0,
            stagger: {
              each: 0.06,
              from: fromTop ? 'end' : 'start',
            },
            ease: 'power1.inOut',
          },
          'grid-reveal',
        );
      });

      // Grid Zoom Timeline (gridZoomTimeline)
      const zoomTimeline = gsap.timeline({ defaults: { duration: 1, ease: 'power2.inOut' } });
      if (grid) {
        zoomTimeline.fromTo(grid, { scale: 1 }, { scale: 2.2 });
      }
      if (columns[0]?.length) {
        zoomTimeline.fromTo(columns[0], { xPercent: 0 }, { xPercent: -65 }, '<');
      }
      if (columns[2]?.length) {
        zoomTimeline.fromTo(columns[2], { xPercent: 0 }, { xPercent: 65 }, '<');
      }
      if (columns[1]?.length) {
        zoomTimeline.fromTo(
          columns[1],
          { yPercent: 0, opacity: 1 },
          {
            yPercent: (index) => (index < 2 ? -130 : 130),
            opacity: 0,
            duration: 0.7,
            ease: 'power2.inOut',
          },
          '-=0.5',
        );
      }

      // Toggle Content (toggleContent)
      const toggleContent = (isVisible = true) => {
        if (!title || !description || !button) return;
        gsap.timeline({ defaults: { overwrite: true } })
          .to(title, {
            yPercent: isVisible ? 0 : titleOffsetY,
            duration: 0.7,
            ease: 'power2.inOut',
          })
          .to(
            [description, button],
            {
              opacity: isVisible ? 1 : 0,
              duration: 0.4,
              ease: `power1.${isVisible ? 'inOut' : 'out'}`,
              pointerEvents: isVisible ? 'auto' : 'none',
            },
            isVisible ? '-=90%' : '<',
          );
      };

      // Animate Grid On Scroll (animateGridOnScroll)
      const masterTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: block,
          start: 'top 25%',
          end: 'bottom bottom',
          scrub: true,
        },
      });

      masterTimeline
        .add(revealTimeline)
        .add(zoomTimeline, '-=0.6')
        .add(() => {
          toggleContent(masterTimeline.scrollTrigger?.direction === 1);
        }, '-=0.32');
    }, blockRef);

    // Refresh ScrollTrigger after DOM setup
    ScrollTrigger.refresh();
    const rafId = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      lenis.destroy();
      gsap.ticker.remove(tickerCb);
      ctx.revert();
    };
  }, [role]);

  return (
    <div className="scroll-page selection:bg-white/20">
      {/* Sleek CyberForge HUD Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/10 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141724] border border-[#23283b] flex items-center justify-center">
            {isAttacker ? (
              <TerminalWindow className="w-4 h-4 text-red-500" weight="bold" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#2ab7ff]" weight="bold" />
            )}
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-white uppercase block">
              CyberForge OS
            </span>
            <span className={`text-[10px] font-mono tracking-wider ${isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'}`}>
              {isAttacker ? 'ATTACKER PROTOCOL' : 'DEFENDER SHIELD'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#141724] border border-[#23283b] text-xs font-mono text-zinc-300">
            <span className={`w-2 h-2 rounded-full ${isAttacker ? 'bg-red-500 shadow-[0_0_8px_#ff2a3d]' : 'bg-[#2ab7ff] shadow-[0_0_8px_#2ab7ff]'}`} />
            <span>{email || (isAttacker ? 'attacker@cyberforge.local' : 'defender@cyberforge.local')}</span>
          </div>

          {typeof onNavigateToTasks === 'function' && (
            <button
              type="button"
              onClick={onNavigateToTasks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E5CC] hover:bg-[#00CCA6] text-[#0A0A0B] text-xs font-mono font-semibold transition-colors"
            >
              <span>Open Console</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          )}

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141724] hover:bg-white/10 border border-[#23283b] text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          >
            <SignOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ---------------- BLOCK INTRO: Particle Simulation & Poster ---------------- */}
      <section className="block block--intro">
        {/* Editorial Poster Backdrop: Giant ATTACKER/DEFENDER lettering, cursive script, SVGs, rulers */}
        <RolePosterBackdrop role={role} />

        {/* 3D Particle Simulation: Floating in front of the giant text, explodes in 3D on scroll */}
        {isAttacker ? <AttackerParticles /> : <DefenderParticles />}

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none opacity-80">
          <span className={`text-[10px] font-mono tracking-widest uppercase ${isAttacker ? 'text-red-300/80' : 'text-sky-300/80'}`}>
            Scroll to Explode & Reveal Matrix
          </span>
          <CaretDown className={`w-4 h-4 animate-bounce ${isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'}`} />
        </div>
      </section>

      {/* ---------------- BLOCK MAIN: 425vh Sticky Parallax & Zoom Grid ---------------- */}
      <section className="block block--main" ref={blockRef}>
        <div className="block__wrapper" ref={wrapperRef}>
          {/* Centered Content Overlay (revealed upon scroll zoom) */}
          <div className="content" ref={contentRef}>
            <h2
              className={`content__title bg-clip-text text-transparent bg-gradient-to-b ${
                isAttacker
                  ? 'from-white via-zinc-200 to-red-500'
                  : 'from-white via-zinc-200 to-[#2ab7ff]'
              }`}
              ref={titleRef}
            >
              {isAttacker ? 'Offensive Exploitation Suite' : 'Perimeter Defense Architecture'}
            </h2>

            <p className="content__description" ref={descRef}>
              {isAttacker
                ? 'EXPLOIT HIGH-VALUE SYSTEM VECTORS, EXTRACT PRIVILEGED CREDENTIALS, AND COMPROMISE TARGET ARCHITECTURES DIRECTLY WITHIN THE DVWA CONTAINER ENVIRONMENT.'
                : 'MONITOR REAL-TIME TELEMETRY, ENFORCE L4/L7 IPTABLES POLICIES, AND REPLAY WEAPONIZED ATTACK PAYLOADS TO CERTIFY HOST ZERO-DAY IMMUNITY.'}
            </p>

            {/* "More ->" link in the middle (strictly in the middle, navigates to TaskMatrixPage) */}
            <button
              ref={buttonRef}
              onClick={() => {
                if (onNavigateToTasks) {
                  onNavigateToTasks();
                } else {
                  setShowOverviewModal(true);
                }
              }}
              className={`content__button ${
                isAttacker ? 'text-red-400 hover:text-red-300' : 'text-[#2ab7ff] hover:text-[#7ad6ff]'
              }`}
            >
              <span>More</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* 3-Column Tactical Task Gallery Grid (12 Items) */}
          <div className="gallery">
            <ul className="gallery__grid" ref={gridRef}>
              {galleryTasks.map((task) => (
                <li key={task.id} className="gallery__item">
                  <div
                    className={`gallery__task-box ${
                      isAttacker ? 'gallery__task-box--attacker' : 'gallery__task-box--defender'
                    }`}
                  >
                    {/* Card Header with SVG & Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`p-2 rounded-xl ${
                          isAttacker
                            ? 'bg-red-950/60 border border-red-500/30'
                            : 'bg-sky-950/60 border border-[#2ab7ff]/30'
                        }`}
                      >
                        {task.svg}
                      </div>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                          isAttacker
                            ? 'bg-red-950/50 text-red-300 border-red-500/30'
                            : 'bg-sky-950/50 text-sky-300 border-[#2ab7ff]/30'
                        }`}
                      >
                        {task.badge}
                      </span>
                    </div>

                    {/* Card Title & Desc (No "More ->" here) */}
                    <div className="mt-auto">
                      <h3 className="text-xs sm:text-sm font-bold text-white mb-1 tracking-tight">
                        {task.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {task.desc}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- TACTICAL MODAL (Opened only if fallback) ---------------- */}
      {showOverviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className={`w-full max-w-2xl bg-[#0e111a] border rounded-2xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto ${
              isAttacker ? 'border-red-500/40' : 'border-[#2ab7ff]/40'
            }`}
          >
            {/* Modal Top Glow */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${
                isAttacker ? 'via-red-500' : 'via-[#2ab7ff]'
              } to-transparent`}
            />

            {/* Modal Header */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    isAttacker
                      ? 'bg-red-950/50 border border-red-500/40 text-red-400'
                      : 'bg-sky-950/50 border border-[#2ab7ff]/40 text-[#2ab7ff]'
                  }`}
                >
                  {isAttacker ? <TerminalWindow className="w-6 h-6" weight="bold" /> : <ShieldCheck className="w-6 h-6" weight="bold" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {isAttacker ? 'Offensive Operations Matrix' : 'Defense Architecture Catalog'}
                  </h3>
                  <span
                    className={`inline-block text-[11px] font-mono uppercase tracking-wider ${
                      isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'
                    }`}
                  >
                    21 Active Protocols Deployed
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowOverviewModal(false)}
                className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tasks List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#141824] p-3.5 rounded-xl border border-white/5 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-1.5 rounded-lg bg-black/40">{task.svg}</div>
                    <div>
                      <h4 className="font-bold text-white">{task.title}</h4>
                      <span className={`text-[9px] font-mono ${isAttacker ? 'text-red-400' : 'text-[#2ab7ff]'}`}>
                        {task.badge}
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-[11px] mb-2">{task.details}</p>
                  <div className="bg-[#08090f] p-2 rounded-lg border border-white/5 font-mono text-[10px] text-amber-300/90 overflow-x-auto">
                    <code>{task.vector}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">CyberForge Operator Module</span>
              <button
                onClick={() => setShowOverviewModal(false)}
                className={`px-6 py-2.5 rounded-xl text-xs font-semibold text-white transition-all ${
                  isAttacker
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_15px_rgba(255,42,61,0.4)]'
                    : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 shadow-[0_0_15px_rgba(42,183,255,0.4)]'
                }`}
              >
                Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
