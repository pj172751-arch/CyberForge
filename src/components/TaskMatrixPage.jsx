import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ATTACKER_TASKS, DEFENDER_TASKS, getTaskCyberBg } from '../data/cyberTasks';
import { Card1 } from '../utils/cardHover';
import { TypeTransition } from '../utils/typeTransition';
import CyberCard from './CyberCard';
import ChallengeAttemptModal from './ChallengeAttemptModal';
import { Copy, Check, Play } from 'lucide-react';
import './TaskMatrix.css';

const ATTACKER_TYPE_LINES = [
  'CYBERFORGE EXPLOIT PROTOCOL INJECTION ROOT ACCESS',
  'BUFFER OVERFLOW SQL INJECTION REVERSE SHELL ZERO DAY',
  'OFFENSIVE OPERATIONS BREACH VECTOR ACTIVE RECON TAINT',
  'PRIVILEGE ESCALATION COMMAND CONTROL EXFILTRATION CIPHER',
  'VULNERABILITY SCANNER BRUTE FORCE HIJACK PERSISTENCE',
  'CYBERFORGE EXPLOIT PROTOCOL INJECTION ROOT ACCESS',
  'BUFFER OVERFLOW SQL INJECTION REVERSE SHELL ZERO DAY',
  'OFFENSIVE OPERATIONS BREACH VECTOR ACTIVE RECON TAINT',
  'PRIVILEGE ESCALATION COMMAND CONTROL EXFILTRATION CIPHER',
  'VULNERABILITY SCANNER BRUTE FORCE HIJACK PERSISTENCE',
  'TERMINAL ZERO SYSTEM OVERRIDE ATTACK PROTOCOL'
];

const DEFENDER_TYPE_LINES = [
  'PERIMETER FIREWALL DEFENSE TELEMETRY SHIELD ISOLATE',
  'ENCRYPT KERNEL HARDENING INCIDENT RESPONSE FORENSICS',
  'AIR GAP ZERO TRUST PACKET INSPECTION THREAT HUNTING',
  'ANOMALY DETECTION SIGNATURE ANALYSIS MITIGATION QUARANTINE',
  'INTRUSION PREVENTION SYSTEM HEURISTIC AUDIT INTEGRITY',
  'PERIMETER FIREWALL DEFENSE TELEMETRY SHIELD ISOLATE',
  'ENCRYPT KERNEL HARDENING INCIDENT RESPONSE FORENSICS',
  'AIR GAP ZERO TRUST PACKET INSPECTION THREAT HUNTING',
  'ANOMALY DETECTION SIGNATURE ANALYSIS MITIGATION QUARANTINE',
  'INTRUSION PREVENTION SYSTEM HEURISTIC AUDIT INTEGRITY',
  'SENTINEL SHIELD PERIMETER SECURED DEFENSE ACTIVE'
];

export default function TaskMatrixPage({ role = 'attacker', email = '', onBack }) {
  const isAttacker = role === 'attacker';
  const tasks = isAttacker ? ATTACKER_TASKS : DEFENDER_TASKS;
  const kineticLines = isAttacker ? ATTACKER_TYPE_LINES : DEFENDER_TYPE_LINES;

  const [copiedId, setCopiedId] = useState(null);
  const [attemptTask, setAttemptTask] = useState(null);

  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const typeContainerRef = useRef(null);
  const articleWrapRef = useRef(null);
  const backBtnRef = useRef(null);
  const frameRef = useRef(null);

  const isAnimatingRef = useRef(false);
  const currentItemIndexRef = useRef(-1);
  const typeTransitionInstanceRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Initialize Card hover instances
    const cardsInstances = [];
    const cardElements = gridRef.current
      ? [...gridRef.current.querySelectorAll('.card:not(.card--empty)')]
      : [];

    cardElements.forEach((cardEl) => {
      cardsInstances.push(new Card1(cardEl));
    });

    // Initialize TypeTransition instance
    if (typeContainerRef.current) {
      typeTransitionInstanceRef.current = new TypeTransition(typeContainerRef.current);
    }

    return () => {
      cardsInstances.forEach((card) => card.destroy && card.destroy());
      document.body.style.overflow = '';
    };
  }, [role]);

  const handleCopyVector = (vector, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(vector);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const openItem = (taskIndex) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    currentItemIndexRef.current = taskIndex;

    const typeT = typeTransitionInstanceRef.current;
    if (!typeT) {
      isAnimatingRef.current = false;
      return;
    }

    const task = tasks[taskIndex];
    const cardElements = gridRef.current
      ? [...gridRef.current.querySelectorAll('.card:not(.card--empty)')]
      : [];
    const frameEl = frameRef.current;
    const backCtrl = backBtnRef.current;
    const itemsWrap = gridRef.current;
    const articleWrap = articleWrapRef.current;

    const articleEl = containerRef.current?.querySelector(`#article-${task.num}`);
    if (!articleEl) {
      isAnimatingRef.current = false;
      return;
    }

    const titleEl = articleEl.querySelector('.article__title');
    const numberEl = articleEl.querySelector('.article__number');
    const introEl = articleEl.querySelector('.article__intro');
    const descEl = articleEl.querySelector('.article__description');
    const imgWrapEl = articleEl.querySelector('.article__img-wrap');
    const imgEl = articleEl.querySelector('.article__img');

    // Build timeline following exact Codrops specs
    const openTimeline = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
      }
    });

    const typeInTimeline = typeT.in();

    openTimeline
      .addLabel('start', 0)
      .addLabel('typeTransition', 0.3)
      .addLabel(
        'articleOpening',
        typeInTimeline.totalDuration() * 0.75 + 0.3
      )
      // Fade out cards with alternating vertical translation
      .to(
        cardElements,
        {
          duration: 0.8,
          ease: 'power2.inOut',
          opacity: 0,
          y: (pos) => (pos % 2 ? '25%' : '-25%')
        },
        'start'
      )
      // Fade out top header frame
      .to(
        frameEl,
        {
          duration: 0.8,
          ease: 'power3',
          opacity: 0,
          onComplete: () => gsap.set(frameEl, { pointerEvents: 'none' })
        },
        'start'
      )
      // Play Kinetic Type Transition
      .add(typeInTimeline.play(), 'typeTransition')
      // Enable article view & lock background scroll
      .add(() => {
        gsap.set(backCtrl, { pointerEvents: 'auto' });
        gsap.set(itemsWrap, { pointerEvents: 'none' });
        gsap.set(articleWrap, { pointerEvents: 'auto' });
        articleEl.classList.add('article--current');
        document.body.style.overflow = 'hidden';
      }, 'articleOpening')
      // Fade in back button
      .to(
        backCtrl,
        {
          duration: 0.7,
          opacity: 1
        },
        'articleOpening'
      )
      // Position article text elements
      .set(
        [titleEl, numberEl, introEl, descEl],
        {
          opacity: 0,
          y: '50%'
        },
        'articleOpening'
      )
      // Image wrap and image opposite translate (reveal effect)
      .set(imgWrapEl, { y: '100%' }, 'articleOpening')
      .set(imgEl, { y: '-100%' }, 'articleOpening')
      // Reveal article text elements
      .to(
        [titleEl, numberEl, introEl, descEl],
        {
          duration: 1,
          ease: 'expo',
          opacity: 1,
          y: '0%',
          stagger: 0.04
        },
        'articleOpening'
      )
      // Reveal article image
      .to(
        [imgWrapEl, imgEl],
        {
          duration: 1,
          ease: 'expo',
          y: '0%'
        },
        'articleOpening'
      );
  };

  const closeItem = () => {
    if (isAnimatingRef.current || currentItemIndexRef.current === -1) return;
    isAnimatingRef.current = true;

    const typeT = typeTransitionInstanceRef.current;
    if (!typeT) {
      isAnimatingRef.current = false;
      return;
    }

    const currentTask = tasks[currentItemIndexRef.current];
    const articleEl = containerRef.current?.querySelector(`#article-${currentTask.num}`);
    if (!articleEl) {
      isAnimatingRef.current = false;
      return;
    }

    const titleEl = articleEl.querySelector('.article__title');
    const numberEl = articleEl.querySelector('.article__number');
    const introEl = articleEl.querySelector('.article__intro');
    const descEl = articleEl.querySelector('.article__description');
    const imgWrapEl = articleEl.querySelector('.article__img-wrap');
    const imgEl = articleEl.querySelector('.article__img');

    const cardElements = gridRef.current
      ? [...gridRef.current.querySelectorAll('.card:not(.card--empty)')]
      : [];
    const frameEl = frameRef.current;
    const backCtrl = backBtnRef.current;
    const itemsWrap = gridRef.current;
    const articleWrap = articleWrapRef.current;

    const closeTimeline = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
        currentItemIndexRef.current = -1;
        document.body.style.overflow = '';
      }
    });

    const typeOutTimeline = typeT.out();

    closeTimeline
      .addLabel('start', 0)
      .addLabel('typeTransition', 0.5)
      .addLabel(
        'showItems',
        typeOutTimeline.totalDuration() * 0.7 + 0.5
      )
      // Fade out back button
      .to(
        backCtrl,
        {
          duration: 0.7,
          ease: 'power1',
          opacity: 0
        },
        'start'
      )
      // Animate article text elements down
      .to(
        [titleEl, numberEl, introEl, descEl],
        {
          duration: 1,
          ease: 'power4.in',
          opacity: 0,
          y: '50%',
          stagger: -0.04
        },
        'start'
      )
      // Reverse image reveal
      .to(
        imgWrapEl,
        {
          duration: 1,
          ease: 'power4.in',
          y: '100%'
        },
        'start'
      )
      .to(
        imgEl,
        {
          duration: 1,
          ease: 'power4.in',
          y: '-100%'
        },
        'start'
      )
      // Deactivate current article & reset pointer events
      .add(() => {
        gsap.set(backCtrl, { pointerEvents: 'none' });
        gsap.set(itemsWrap, { pointerEvents: 'auto' });
        gsap.set(articleWrap, { pointerEvents: 'none' });
        articleEl.classList.remove('article--current');
      })
      // Play Kinetic Type Transition Out
      .add(typeOutTimeline.play(), 'typeTransition')
      // Fade frame back in
      .to(
        frameEl,
        {
          duration: 0.8,
          ease: 'power3',
          opacity: 1,
          onStart: () => gsap.set(frameEl, { pointerEvents: 'auto' })
        },
        'showItems'
      )
      // Stagger cards back into view
      .to(
        cardElements,
        {
          duration: 1,
          ease: 'power3.inOut',
          opacity: 1,
          y: '0%'
        },
        'showItems'
      );
  };

  return (
    <div
      ref={containerRef}
      className="task-matrix-page"
      style={{
        '--color-type': isAttacker ? '#ff2a3d' : '#2ab7ff',
        '--type-line-opacity': '0.06'
      }}
    >
      {/* Full-screen Kinetic Typography Transition Overlay */}
      <div ref={typeContainerRef} className="type" data-type-transition aria-hidden="true">
        {kineticLines.map((line, idx) => (
          <div key={idx} className="type__line">
            {line}
          </div>
        ))}
      </div>

      {/* Top Header matching Codrops .frame */}
      <div ref={frameRef} className="frame">
        <h1 className="frame__title">
          {isAttacker ? 'Offensive Operations Matrix' : 'Perimeter Defense Architecture'}
        </h1>
        <button
          type="button"
          onClick={onBack}
          className="frame__back"
        >
          &larr; Back to Overview
        </button>
      </div>

      {/* The Single Tasks Grid with All 21 Tasks */}
      <div ref={gridRef} className="grid" data-effect="hover-1">
        {tasks.map((task, index) => (
          <CyberCard
            key={task.id}
            task={task}
            role={role}
            isAlt={index % 2 === 1}
            onClick={() => openItem(index)}
          />
        ))}
      </div>

      {/* Codrops Kinetic Article Wrap containing full detailed tactical layouts for all tasks */}
      <section ref={articleWrapRef} className="article-wrap">
        <button
          ref={backBtnRef}
          type="button"
          className="back"
          onClick={closeItem}
          aria-label="Back to Matrix Grid"
          title="Back to Matrix Grid"
        >
          <svg viewBox="0 0 50 9" width="100%">
            <path d="M0 4.5l5-3M0 4.5l5 3M50 4.5h-77" />
          </svg>
        </button>

        {tasks.map((task) => (
          <article
            key={task.id}
            className="article"
            id={`article-${task.num}`}
          >
            {/* Tactical Cyber Image Banner with telemetry */}
            <div className="article__img-wrap">
              <div
                className="article__img"
                style={{
                  backgroundImage: getTaskCyberBg(task.num, role, task.title)
                }}
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] font-mono tracking-wider text-white">
                {task.badge} // {task.tags}
              </div>
            </div>

            {/* Protocol Number */}
            <span className="article__number">
              {task.num}
            </span>

            {/* Task Title */}
            <h2 className="article__title">
              {task.title}
            </h2>

            {/* Introductory Summary */}
            <div className="article__intro">
              <p>{task.desc}</p>
            </div>

            {/* Deep Operational Mechanics & Payload Signature Vector */}
            <div className="article__description">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Operational Mechanics
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {task.details}
                  </p>
                </div>

                {/* Exploit Vector / Defensive Rule Signature */}
                <div className="article__vector-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      {isAttacker ? 'Payload / Exploit Signature' : 'Defensive Rule Signature'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyVector(task.vector, task.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === task.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-amber-300/95 overflow-x-auto leading-relaxed p-2.5 rounded bg-black/60 border border-white/5">
                    <code>{task.vector}</code>
                  </div>
                </div>

                {/* Launch Interactive Attempt / Verification Terminal */}
                <div className="mt-4 flex items-center justify-between pt-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    TARGET: DVWA:8081 SANDBOX
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttemptTask(task)}
                    className={`px-4 py-2 rounded-lg font-mono text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                      isAttacker
                        ? 'bg-red-600/90 hover:bg-red-500 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        : 'bg-sky-600/90 hover:bg-sky-500 border border-[#2ab7ff]/40 shadow-[0_0_15px_rgba(42,183,255,0.3)]'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isAttacker ? 'Launch Exploit Terminal' : 'Verify Defense Rule'}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Interactive Exploit / Verification Terminal Modal */}
      {attemptTask && (
        <ChallengeAttemptModal
          task={attemptTask}
          role={role}
          onClose={() => setAttemptTask(null)}
        />
      )}
    </div>
  );
}
