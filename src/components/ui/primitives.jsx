import React, { useEffect } from 'react';
import {
  CaretDown,
  CheckCircle,
  CircleNotch,
  Info,
  Warning,
  WarningCircle,
  X,
} from '@phosphor-icons/react';

const BUTTON_VARIANTS = {
  primary:
    'bg-[#111317] text-[#FAF8F3] border border-[#111317] font-semibold hover:bg-[#1C1F26] hover:border-[#1C1F26]',
  attacker:
    'bg-[#C81E1E] text-[#FAF8F3] border border-[#C81E1E] font-semibold hover:bg-[#A61717] hover:border-[#A61717]',
  defender:
    'bg-[#1D4ED8] text-[#FAF8F3] border border-[#1D4ED8] font-semibold hover:bg-[#1740B5] hover:border-[#1740B5]',
  secondary:
    'bg-[#FAF8F3] text-[#111317] border border-[#111317]/25 font-medium hover:bg-[#EAE4D7] hover:border-[#111317]/45',
  ghost:
    'bg-transparent text-[#1C1F26] border border-transparent font-medium hover:bg-[#EAE4D7]/75 hover:text-[#111317]',
  danger:
    'bg-[#C81E1E]/10 text-[#B91C1C] border border-[#C81E1E]/35 font-semibold hover:bg-[#C81E1E]/18 hover:border-[#C81E1E]/60',
};

const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-[14px] gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center rounded-md transition-transform transition-colors duration-150 whitespace-nowrap select-none active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317] focus-visible:ring-offset-1 focus-visible:ring-offset-[#F3EFE6]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.secondary,
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <CircleNotch className="w-4 h-4 animate-spin shrink-0" weight="bold" />}
      {children}
    </button>
  );
}

const BADGE_VARIANTS = {
  teal: 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/30',
  blue: 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/30',
  cobalt: 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/30',
  green: 'bg-[#047857]/10 text-[#047857] border-[#047857]/30',
  emerald: 'bg-[#047857]/10 text-[#047857] border-[#047857]/30',
  amber: 'bg-[#B45309]/10 text-[#92400E] border-[#B45309]/35',
  brass: 'bg-[#B45309]/10 text-[#92400E] border-[#B45309]/35',
  red: 'bg-[#C81E1E]/10 text-[#B91C1C] border-[#C81E1E]/30',
  crimson: 'bg-[#C81E1E]/10 text-[#B91C1C] border-[#C81E1E]/30',
  neutral: 'bg-[#EAE4D7] text-[#1C1F26] border-[#111317]/20',
  ink: 'bg-[#111317] text-[#FAF8F3] border-[#111317]',
};

export function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-semibold leading-4 whitespace-nowrap',
        BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}

const MODAL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111317]/55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cf-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={[
          'w-full bg-[#FAF8F3] border border-[#111317]/30 rounded-lg overflow-hidden text-[#111317]',
          MODAL_SIZES[size] || MODAL_SIZES.md,
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#111317]/15">
          <div className="min-w-0">
            <h2
              id="cf-modal-title"
              className="text-lg font-bold text-[#111317] leading-6 text-balance"
            >
              {title}
            </h2>
            {description && (
              <p className="text-[14px] text-[#4B5260] mt-1 leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-[#4B5260] hover:text-[#111317] hover:bg-[#EAE4D7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#111317]/15 bg-[#EAE4D7]/55 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, required = false, className = '', children }) {
  return (
    <div className={['space-y-1.5', className].join(' ')}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[14px] font-semibold text-[#111317]"
        >
          {label}
          {required && <span className="text-[#C81E1E] ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[13px] font-medium text-[#B91C1C]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-[#4B5260]">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL_BASE =
  'w-full bg-[#FAF8F3] border rounded-md text-[15px] text-[#111317] placeholder:text-[#4B5260] transition-colors duration-150 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = React.forwardRef(function Input(
  { className = '', error = false, type = 'text', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={[
        CONTROL_BASE,
        'h-10 px-3.5',
        error
          ? 'border-[#C81E1E] focus:border-[#C81E1E] focus:ring-[#C81E1E]'
          : 'border-[#111317]/25 focus:border-[#111317] focus:ring-[#111317]',
        className,
      ].join(' ')}
      {...props}
    />
  );
});

export const Select = React.forwardRef(function Select(
  { className = '', error = false, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={[
          CONTROL_BASE,
          'h-10 pl-3.5 pr-9 appearance-none cursor-pointer',
          error
            ? 'border-[#C81E1E] focus:border-[#C81E1E] focus:ring-[#C81E1E]'
            : 'border-[#111317]/25 focus:border-[#111317] focus:ring-[#111317]',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        className="w-4 h-4 text-[#4B5260] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        weight="bold"
      />
    </div>
  );
});

export const Textarea = React.forwardRef(function Textarea(
  { className = '', error = false, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={[
        CONTROL_BASE,
        'p-3.5 resize-y',
        error
          ? 'border-[#C81E1E] focus:border-[#C81E1E] focus:ring-[#C81E1E]'
          : 'border-[#111317]/25 focus:border-[#111317] focus:ring-[#111317]',
        className,
      ].join(' ')}
      {...props}
    />
  );
});

export function SkeletonRows({ rows = 5, columns = 4, className = '' }) {
  return (
    <div
      className={[
        'bg-[#FAF8F3] border border-[#111317]/15 rounded-lg divide-y divide-[#111317]/10 overflow-hidden',
        className,
      ].join(' ')}
      aria-busy="true"
      aria-label="Loading content"
    >
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-4 py-3.5 flex items-center gap-4">
          {Array.from({ length: columns }).map((__, colIdx) => (
            <div
              key={colIdx}
              className="h-3.5 rounded bg-[#EAE4D7] animate-pulse"
              style={{
                width: colIdx === 0 ? '28%' : colIdx === columns - 1 ? '14%' : '20%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div
      className={[
        'bg-[#FAF8F3] border border-[#111317]/15 rounded-lg px-6 py-10 text-center flex flex-col items-center justify-center',
        className,
      ].join(' ')}
    >
      {Icon && (
        <div className="w-11 h-11 rounded-md bg-[#EAE4D7] border border-[#111317]/15 flex items-center justify-center text-[#111317] mb-3">
          <Icon className="w-5 h-5" weight="regular" />
        </div>
      )}
      <h3 className="text-base font-bold text-[#111317] text-balance">{title}</h3>
      {description && (
        <p className="text-[14px] text-[#4B5260] mt-1.5 max-w-md leading-relaxed text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const ALERT_VARIANTS = {
  error: {
    container: 'bg-[#C81E1E]/[0.07] border-[#C81E1E]/35 text-[#1C1F26]',
    iconColor: 'text-[#C81E1E]',
    Icon: WarningCircle,
  },
  warning: {
    container: 'bg-[#B45309]/[0.08] border-[#B45309]/35 text-[#1C1F26]',
    iconColor: 'text-[#B45309]',
    Icon: Warning,
  },
  success: {
    container: 'bg-[#047857]/[0.08] border-[#047857]/35 text-[#1C1F26]',
    iconColor: 'text-[#047857]',
    Icon: CheckCircle,
  },
  info: {
    container: 'bg-[#1D4ED8]/[0.07] border-[#1D4ED8]/30 text-[#1C1F26]',
    iconColor: 'text-[#1D4ED8]',
    Icon: Info,
  },
};

export function AlertBanner({
  variant = 'error',
  title,
  message,
  children,
  onDismiss,
  className = '',
}) {
  const cfg = ALERT_VARIANTS[variant] || ALERT_VARIANTS.error;
  const StatusIcon = cfg.Icon;
  const body = children || message;

  if (!body && !title) return null;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={[
        'border rounded-md px-3.5 py-2.5 flex items-start gap-2.5 text-[14px] leading-relaxed',
        cfg.container,
        className,
      ].join(' ')}
    >
      <StatusIcon className={['w-4 h-4 shrink-0 mt-1', cfg.iconColor].join(' ')} weight="bold" />
      <div className="flex-1 min-w-0">
        {title && <div className="font-bold text-[#111317] mb-0.5">{title}</div>}
        {body && <div className="text-[#1C1F26] text-pretty">{body}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-[#4B5260] hover:text-[#111317] p-1 rounded transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      )}
    </div>
  );
}

const STAT_ACCENTS = {
  default: 'text-[#4B5260]',
  teal: 'text-[#1D4ED8]',
  blue: 'text-[#1D4ED8]',
  green: 'text-[#047857]',
  amber: 'text-[#B45309]',
  red: 'text-[#C81E1E]',
};

export function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  accent = 'default',
  loading = false,
  className = '',
}) {
  return (
    <div
      className={[
        'bg-[#FAF8F3] border border-[#111317]/15 rounded-lg px-4 py-3.5 flex flex-col justify-between',
        className,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#4B5260] truncate">{label}</span>
        {Icon && (
          <Icon
            className={['w-4 h-4 shrink-0', STAT_ACCENTS[accent] || STAT_ACCENTS.default].join(' ')}
            weight="regular"
          />
        )}
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-[#EAE4D7] rounded animate-pulse mt-2" />
      ) : (
        <div className="font-display text-3xl font-extrabold tabular-nums text-[#111317] mt-1.5 leading-none">
          {value ?? 0}
        </div>
      )}
      {detail && (
        <div className="text-xs font-medium text-[#4B5260] mt-2 truncate">{detail}</div>
      )}
    </div>
  );
}
