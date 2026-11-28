import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Copy,
  Info,
  MagnifyingGlass,
  WarningCircle,
  X,
} from '@phosphor-icons/react';

const SPOTLIGHT_RGB = {
  amber: '180, 83, 9',
  brass: '180, 83, 9',
  teal: '4, 120, 87',
  emerald: '4, 120, 87',
  rose: '200, 30, 30',
  red: '200, 30, 30',
  crimson: '200, 30, 30',
  sky: '29, 78, 216',
  blue: '29, 78, 216',
  cobalt: '29, 78, 216',
  ink: '17, 19, 23',
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
        'isolate group/spot relative overflow-hidden rounded-lg bg-[#FAF8F3] border border-[#111317]/15 transition-colors duration-150',
        padding,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 opacity-0 group-hover/spot:opacity-100 transition-opacity duration-200"
        style={{
          padding: '1px',
          background: `radial-gradient(220px circle at var(--mx, -999px) var(--my, -999px), rgba(${rgb}, 0.55), transparent 70%)`,
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
      className="fixed inset-0 z-50 flex justify-end bg-[#111317]/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cf-inspector-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="cf-slide-in-right w-full max-w-lg h-full bg-[#FAF8F3] text-[#111317] border-l border-[#111317]/20 flex flex-col">
        <div className="px-5 py-4 border-b border-[#111317]/15 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="cf-inspector-title"
                className="text-lg font-bold text-[#111317] leading-6 truncate text-balance"
              >
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-[13px] text-[#4B5260] mt-1 leading-relaxed break-words">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close inspector"
            className="p-2 rounded-md text-[#4B5260] hover:text-[#111317] hover:bg-[#EAE4D7] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-[#111317]/15 bg-[#EAE4D7]/55 flex items-center justify-end gap-2 shrink-0">
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-[#111317]/50"
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
      <div className="w-full max-w-xl bg-[#FAF8F3] text-[#111317] border border-[#111317]/30 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[#111317]/15">
          <MagnifyingGlass className="w-4 h-4 text-[#4B5260] shrink-0" weight="bold" />
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
            className="flex-1 min-w-0 bg-transparent text-[15px] text-[#111317] placeholder:text-[#4B5260] focus:outline-none"
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
              className="p-1 rounded text-[#4B5260] hover:text-[#111317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded bg-[#EAE4D7] border border-[#111317]/15 text-xs font-mono text-[#1C1F26]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2.5 space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-[14px] text-[#4B5260]">
              No matching commands found.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.heading} className="space-y-1">
                <div className="px-2.5 py-1 text-xs font-bold uppercase text-[#4B5260]">
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
                        'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-left transition-colors duration-100',
                        isActive
                          ? 'bg-[#111317] text-[#FAF8F3]'
                          : 'text-[#1C1F26] hover:bg-[#EAE4D7]',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {Icon && (
                          <Icon
                            className={[
                              'w-4 h-4 shrink-0',
                              isActive ? 'text-[#FAF8F3]' : 'text-[#4B5260]',
                            ].join(' ')}
                            weight="regular"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold truncate">{item.label}</div>
                          {item.hint && (
                            <div
                              className={[
                                'text-xs truncate',
                                isActive ? 'text-[#EAE4D7]' : 'text-[#4B5260]',
                              ].join(' ')}
                            >
                              {item.hint}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.shortcut && (
                        <kbd
                          className={[
                            'px-1.5 py-0.5 rounded border text-xs font-mono tabular-nums shrink-0',
                            isActive
                              ? 'bg-[#FAF8F3]/15 border-[#FAF8F3]/25 text-[#FAF8F3]'
                              : 'bg-[#EAE4D7] border-[#111317]/15 text-[#4B5260]',
                          ].join(' ')}
                        >
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

        <div className="px-4 py-2.5 border-t border-[#111317]/15 bg-[#EAE4D7]/55 flex items-center justify-between text-xs text-[#4B5260]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-[#FAF8F3] border border-[#111317]/20 font-mono text-xs text-[#111317]">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-[#FAF8F3] border border-[#111317]/20 font-mono text-xs text-[#111317]">
                Enter
              </kbd>
              Execute
            </span>
          </div>
          <span className="font-mono font-semibold tabular-nums text-[#111317]">
            {flatItems.length} actions
          </span>
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
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EAE4D7]/80 hover:bg-[#EAE4D7] border border-[#111317]/20 text-xs font-mono tabular-nums text-[#111317] transition-colors duration-150 max-w-full active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#047857] shrink-0" weight="bold" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-[#4B5260] shrink-0" weight="regular" />
      )}
      <span className={['truncate', copied ? 'text-[#047857] font-semibold' : ''].join(' ')}>
        {copied ? 'Copied' : label || value}
      </span>
    </button>
  );
}

const TOAST_STYLE = {
  success: {
    border: 'border-[#047857]/45',
    iconClass: 'text-[#047857]',
    Icon: CheckCircle,
  },
  error: {
    border: 'border-[#C81E1E]/45',
    iconClass: 'text-[#C81E1E]',
    Icon: WarningCircle,
  },
  info: {
    border: 'border-[#1D4ED8]/40',
    iconClass: 'text-[#1D4ED8]',
    Icon: Info,
  },
};

export function TactileToast({ toasts = [], onDismiss }) {
  if (!Array.isArray(toasts) || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const cfg = TOAST_STYLE[toast.variant] || TOAST_STYLE.info;
        const ToastIcon = cfg.Icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={[
              'pointer-events-auto cf-toast-in bg-[#FAF8F3] border rounded-lg px-4 py-3 flex items-start gap-2.5 text-[#111317]',
              cfg.border,
            ].join(' ')}
          >
            <ToastIcon
              className={['w-4 h-4 shrink-0 mt-0.5', cfg.iconClass].join(' ')}
              weight="bold"
            />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <div className="text-[14px] font-bold text-[#111317]">{toast.title}</div>
              )}
              {toast.message && (
                <div className="text-[13px] text-[#1C1F26] leading-relaxed break-words">
                  {toast.message}
                </div>
              )}
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss toast"
                className="p-0.5 rounded text-[#4B5260] hover:text-[#111317] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
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

const VERDICT_STAMP_META = {
  verified: {
    defaultLabel: 'EXPLOIT VERIFIED',
    ink: '#C81E1E',
    container: 'border-[#C81E1E] text-[#C81E1E] bg-[#FAF8F3]',
  },
  exploit: {
    defaultLabel: 'EXPLOIT VERIFIED',
    ink: '#C81E1E',
    container: 'border-[#C81E1E] text-[#C81E1E] bg-[#FAF8F3]',
  },
  breach: {
    defaultLabel: 'EXPLOIT VERIFIED',
    ink: '#C81E1E',
    container: 'border-[#C81E1E] text-[#C81E1E] bg-[#FAF8F3]',
  },
  patched: {
    defaultLabel: 'PATCH VERIFIED',
    ink: '#047857',
    container: 'border-[#047857] text-[#047857] bg-[#FAF8F3]',
  },
  patch: {
    defaultLabel: 'PATCH VERIFIED',
    ink: '#047857',
    container: 'border-[#047857] text-[#047857] bg-[#FAF8F3]',
  },
  defended: {
    defaultLabel: 'PATCH VERIFIED',
    ink: '#047857',
    container: 'border-[#047857] text-[#047857] bg-[#FAF8F3]',
  },
  blocked: {
    defaultLabel: 'BLOCKED',
    ink: '#B45309',
    container: 'border-[#B45309] text-[#92400E] bg-[#FAF8F3]',
  },
  failed: {
    defaultLabel: 'FAILED',
    ink: '#111317',
    container: 'border-[#111317] text-[#111317] bg-[#FAF8F3]',
  },
};

export function VerdictStamp({
  status = 'verified',
  label,
  sublabel,
  active = true,
  className = '',
}) {
  if (!active) return null;
  const meta = VERDICT_STAMP_META[status] || VERDICT_STAMP_META.verified;
  const resolvedLabel = label || meta.defaultLabel;

  return (
    <div
      role="status"
      aria-label={`${resolvedLabel}${sublabel ? ` — ${sublabel}` : ''}`}
      className={[
        'cf-stamp-snap inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded border-2 select-none -rotate-3',
        meta.container,
        className,
      ].join(' ')}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <polygon
          points="12,2 19,5 22,12 19,19 12,22 5,19 2,12 5,5"
          stroke={meta.ink}
          strokeWidth="1.75"
        />
        <circle cx="12" cy="12" r="5.5" stroke={meta.ink} strokeWidth="1.25" />
        <path
          d={
            status === 'blocked' || status === 'failed'
              ? 'M9.5 9.5L14.5 14.5M14.5 9.5L9.5 14.5'
              : 'M9 12.2L11.2 14.4L15.2 10.2'
          }
          stroke={meta.ink}
          strokeWidth="1.75"
          strokeLinecap="square"
        />
      </svg>
      <div className="leading-tight">
        <div className="font-display text-lg font-extrabold tracking-wider uppercase leading-none">
          {resolvedLabel}
        </div>
        {sublabel && (
          <div className="text-xs font-mono font-semibold mt-0.5 leading-none">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

const PACKET_BEAM_ACCENT = {
  crimson: {
    bar: 'bg-[#C81E1E]',
    dot: 'bg-[#C81E1E]',
    text: 'text-[#C81E1E]',
  },
  cobalt: {
    bar: 'bg-[#1D4ED8]',
    dot: 'bg-[#1D4ED8]',
    text: 'text-[#1D4ED8]',
  },
  emerald: {
    bar: 'bg-[#047857]',
    dot: 'bg-[#047857]',
    text: 'text-[#047857]',
  },
  brass: {
    bar: 'bg-[#B45309]',
    dot: 'bg-[#B45309]',
    text: 'text-[#B45309]',
  },
};

export function PacketBeam({
  active = false,
  accent = 'crimson',
  fromLabel = 'Payload',
  toLabel = 'DVWA :8081',
  statusText,
  className = '',
}) {
  const theme = PACKET_BEAM_ACCENT[accent] || PACKET_BEAM_ACCENT.crimson;

  return (
    <div
      aria-live="polite"
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-md bg-[#EAE4D7]/70 border border-[#111317]/15',
        className,
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={[
            'w-2 h-2 rounded-full transition-opacity duration-150',
            active ? theme.dot : 'bg-[#111317]/35',
          ].join(' ')}
        />
        <span className="text-xs font-mono font-semibold text-[#111317]">{fromLabel}</span>
      </div>

      <div className="relative flex-1 h-1.5 rounded-full bg-[#111317]/12 overflow-hidden">
        {active ? (
          <span
            className={[
              'cf-packet-sweep absolute inset-y-0 left-0 w-1/3 rounded-full',
              theme.bar,
            ].join(' ')}
          />
        ) : (
          <span className="absolute inset-y-0 left-0 w-full bg-[#111317]/10" />
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {statusText && (
          <span className={['text-xs font-mono font-semibold', active ? theme.text : 'text-[#4B5260]'].join(' ')}>
            {statusText}
          </span>
        )}
        <span className="text-xs font-mono font-semibold text-[#111317]">{toLabel}</span>
      </div>
    </div>
  );
}

export function PaginationBar({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 8,
  onPageChange,
  itemLabel = 'items',
  className = '',
}) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), safeTotalPages);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const startIdx = safeTotalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, safeTotalItems);

  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#FAF8F3] border border-[#111317]/15 rounded-lg shrink-0',
        className,
      ].join(' ')}
    >
      <div className="text-[13px] font-mono tabular-nums text-[#4B5260]">
        {safeTotalItems === 0 ? (
          <span>0 {itemLabel}</span>
        ) : (
          <span>
            Showing <strong className="text-[#111317]">{startIdx}–{endIdx}</strong> of{' '}
            <strong className="text-[#111317]">{safeTotalItems}</strong> {itemLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange?.(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded border border-[#111317]/20 bg-[#FAF8F3] hover:bg-[#EAE4D7] text-xs font-semibold text-[#111317] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
        >
          <CaretLeft className="w-3.5 h-3.5" weight="bold" />
          <span>Prev</span>
        </button>

        <span className="px-2.5 text-[13px] font-mono font-semibold tabular-nums text-[#111317]">
          Page {safePage} / {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange?.(safePage + 1)}
          disabled={safePage >= safeTotalPages}
          aria-label="Next page"
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded border border-[#111317]/20 bg-[#FAF8F3] hover:bg-[#EAE4D7] text-xs font-semibold text-[#111317] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
        >
          <span>Next</span>
          <CaretRight className="w-3.5 h-3.5" weight="bold" />
        </button>
      </div>
    </div>
  );
}
