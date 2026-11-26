import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle,
  Copy,
  Info,
  MagnifyingGlass,
  WarningCircle,
  X,
} from '@phosphor-icons/react';

const SPOTLIGHT_RGB = {
  amber: '245, 158, 11',
  teal: '0, 229, 204',
  rose: '244, 63, 94',
  sky: '56, 189, 248',
};

export function SpotlightSurface({
  children,
  className = '',
  accent = 'amber',
  padding = '',
}) {
  const surfaceRef = useRef(null);
  const rgb = SPOTLIGHT_RGB[accent] || SPOTLIGHT_RGB.amber;

  function handlePointerMove(event) {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={surfaceRef}
      onPointerMove={handlePointerMove}
      className={[
        'isolate group/spot relative overflow-hidden rounded-xl bg-[#0D0F14]/90 border border-white/[0.08] transition-colors duration-150',
        padding,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] -z-10 opacity-0 group-hover/spot:opacity-100 transition-opacity duration-200"
        style={{
          background: `radial-gradient(320px circle at var(--mx, -999px) var(--my, -999px), rgba(${rgb}, 0.08), transparent 70%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 opacity-0 group-hover/spot:opacity-100 transition-opacity duration-200"
        style={{
          padding: '1px',
          background: `radial-gradient(240px circle at var(--mx, -999px) var(--my, -999px), rgba(${rgb}, 0.55), transparent 70%)`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {children}
    </div>
  );
}

function checkReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function AnimatedTicker({
  value = 0,
  duration = 550,
  suffix = '',
  className = '',
}) {
  const numericTarget = Number.isFinite(Number(value)) ? Number(value) : 0;
  const reducedMotion = checkReducedMotion();
  const [displayValue, setDisplayValue] = useState(numericTarget);
  const currentRef = useRef(numericTarget);

  useEffect(() => {
    if (reducedMotion || duration <= 0) {
      currentRef.current = numericTarget;
      return undefined;
    }

    const startValue = currentRef.current;
    if (startValue === numericTarget) return undefined;

    let rafId = 0;
    let startTime = null;
    const isInteger = Number.isInteger(numericTarget) && Number.isInteger(startValue);

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = startValue + (numericTarget - startValue) * eased;
      const formatted = isInteger ? Math.round(next) : Number(next.toFixed(1));
      currentRef.current = formatted;
      setDisplayValue(formatted);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        currentRef.current = numericTarget;
        setDisplayValue(numericTarget);
      }
    }

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [numericTarget, duration, reducedMotion]);

  const shown = reducedMotion || duration <= 0 ? numericTarget : displayValue;
  const formattedText = Number.isInteger(shown)
    ? shown.toLocaleString()
    : shown.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <span className={['font-mono tabular-nums', className].filter(Boolean).join(' ')}>
      {formattedText}
      {suffix}
    </span>
  );
}

export function BorderSweep({
  color = '#F59E0B',
  secondary = '#00E5CC',
  duration = 8,
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 overflow-hidden"
      style={{
        padding: '1px',
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      }}
    >
      <div
        className="cf-beam-rotator absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square"
        style={{
          '--cf-beam-duration': `${duration}s`,
          background: `conic-gradient(from 0deg, transparent 0deg 285deg, ${color} 325deg, ${secondary} 348deg, transparent 360deg)`,
        }}
      />
    </div>
  );
}

export function SlideOverInspector({
  open,
  onClose,
  title,
  subtitle,
  badge,
  footer,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cf-inspector-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="cf-slide-in-right w-full max-w-md h-full bg-[#0E1016]/95 backdrop-blur-xl border-l border-white/[0.08] shadow-[inset_1px_0_0_rgba(255,255,255,0.08)] flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="cf-inspector-title"
                className="text-base font-semibold text-zinc-100 leading-6 truncate"
              >
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed break-words">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close inspector"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-white/[0.08] bg-[#090B10]/90 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function CommandPaletteInner({
  onClose,
  placeholder = 'Type a command or search...',
  groups = [],
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { filteredGroups, flatItems } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nextGroups = [];
    const nextFlat = [];

    for (const group of groups) {
      const items = (group?.items || []).filter((item) => {
        if (!q) return true;
        const label = (item?.label || '').toLowerCase();
        const hint = (item?.hint || '').toLowerCase();
        return label.includes(q) || hint.includes(q);
      });
      if (items.length > 0) {
        const mapped = items.map((item) => {
          const flatIdx = nextFlat.length;
          const entry = { ...item, _flatIdx: flatIdx };
          nextFlat.push(entry);
          return entry;
        });
        nextGroups.push({
          heading: group.heading,
          items: mapped,
        });
      }
    }

    return { filteredGroups: nextGroups, flatItems: nextFlat };
  }, [groups, query]);

  const safeIndex = flatItems.length > 0 ? Math.min(activeIndex, flatItems.length - 1) : -1;

  function runItem(item) {
    if (!item) return;
    onClose?.();
    item.onSelect?.();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (flatItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (safeIndex >= 0 && flatItems[safeIndex]) {
        runItem(flatItems[safeIndex]);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xl bg-[#0E1016]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-white/[0.08]">
          <MagnifyingGlass className="w-4 h-4 text-zinc-400 shrink-0" weight="regular" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 min-w-0 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear command search"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-zinc-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-400">
              No matching commands found.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.heading} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                  {group.heading}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item._flatIdx === safeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(item._flatIdx)}
                      onClick={() => runItem(item)}
                      className={[
                        'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-100',
                        isActive
                          ? 'bg-white/[0.08] text-zinc-100'
                          : 'text-zinc-300 hover:bg-white/[0.04]',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {Icon && (
                          <Icon
                            className={[
                              'w-4 h-4 shrink-0',
                              isActive ? 'text-[#00E5CC]' : 'text-zinc-400',
                            ].join(' ')}
                            weight="regular"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          {item.hint && (
                            <div className="text-xs text-zinc-500 truncate">{item.hint}</div>
                          )}
                        </div>
                      </div>
                      {item.shortcut && (
                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono tabular-nums text-zinc-400 shrink-0">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.08] bg-[#090B10]/80 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[10px] text-zinc-400">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] font-mono text-[10px] text-zinc-400">
                Enter
              </kbd>
              Execute
            </span>
          </div>
          <span className="font-mono tabular-nums">{flatItems.length} actions</span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteModal({
  open,
  onClose,
  placeholder = 'Type a command or search...',
  groups = [],
}) {
  if (!open) return null;
  return (
    <CommandPaletteInner
      onClose={onClose}
      placeholder={placeholder}
      groups={groups}
    />
  );
}

export function CopyChip({ value, label, className = '' }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleCopy(event) {
    event.stopPropagation();
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
      // Ignore clipboard permission failures
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label || value}`}
      className={[
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono tabular-nums text-zinc-300 transition-colors duration-150 max-w-full',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" weight="bold" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" weight="regular" />
      )}
      <span className={['truncate', copied ? 'text-[#10B981]' : ''].join(' ')}>
        {copied ? 'Copied' : label || value}
      </span>
    </button>
  );
}

const TOAST_STYLE = {
  success: {
    border: 'border-[#10B981]/35',
    iconClass: 'text-[#10B981]',
    Icon: CheckCircle,
  },
  error: {
    border: 'border-[#EF4444]/35',
    iconClass: 'text-[#EF4444]',
    Icon: WarningCircle,
  },
  info: {
    border: 'border-[#00E5CC]/35',
    iconClass: 'text-[#00E5CC]',
    Icon: Info,
  },
};

export function TactileToast({ toasts = [], onDismiss }) {
  if (!Array.isArray(toasts) || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const cfg = TOAST_STYLE[toast.variant] || TOAST_STYLE.info;
        const ToastIcon = cfg.Icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={[
              'pointer-events-auto cf-toast-in bg-[#0E1016]/95 backdrop-blur-xl border rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 shadow-2xl',
              cfg.border,
            ].join(' ')}
          >
            <ToastIcon
              className={['w-4 h-4 shrink-0 mt-0.5', cfg.iconClass].join(' ')}
              weight="bold"
            />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <div className="text-xs font-semibold text-zinc-100">{toast.title}</div>
              )}
              {toast.message && (
                <div className="text-xs text-zinc-300 leading-relaxed break-words">
                  {toast.message}
                </div>
              )}
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss toast"
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-100 shrink-0"
              >
                <X className="w-3.5 h-3.5" weight="bold" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
