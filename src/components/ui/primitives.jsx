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
    'bg-[#00E5CC] text-[#0A0A0B] border border-[#00E5CC] font-semibold hover:bg-[#00CCA6] hover:border-[#00CCA6]',
  secondary:
    'bg-[#141416] text-zinc-100 border border-[#232326] font-medium hover:bg-[#1B1B1E] hover:border-[#2E2E33]',
  ghost:
    'bg-transparent text-zinc-300 border border-transparent font-medium hover:bg-[#1B1B1E] hover:text-zinc-100',
  danger:
    'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 font-medium hover:bg-[#EF4444]/20 hover:border-[#EF4444]/50',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
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
        'inline-flex items-center justify-center rounded-[4px] transition-colors duration-150 whitespace-nowrap select-none',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.secondary,
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <CircleNotch className="w-3.5 h-3.5 animate-spin shrink-0" weight="bold" />}
      {children}
    </button>
  );
}

const BADGE_VARIANTS = {
  teal: 'bg-[#00E5CC]/10 text-[#00E5CC] border-[#00E5CC]/25',
  green: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25',
  amber: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25',
  red: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
  neutral: 'bg-[#1B1B1E] text-zinc-300 border-[#232326]',
};

export function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[11px] font-medium leading-4 whitespace-nowrap',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
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
          'w-full bg-[#141416] border border-[#232326] rounded-[6px] shadow-2xl overflow-hidden',
          MODAL_SIZES[size] || MODAL_SIZES.md,
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#232326]">
          <div className="min-w-0">
            <h2 id="cf-modal-title" className="text-base font-semibold text-zinc-100 leading-6">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close modal"
            className="p-1.5 rounded-[4px] text-zinc-400 hover:text-zinc-100 hover:bg-[#1B1B1E] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#232326] bg-[#0A0A0B]/40 flex items-center justify-end gap-2">
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
          className="block text-xs font-medium text-zinc-300"
        >
          {label}
          {required && <span className="text-[#EF4444] ml-1">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-[#EF4444]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL_BASE =
  'w-full bg-[#0A0A0B] border rounded-[4px] text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

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
        'h-9 px-3',
        error
          ? 'border-[#EF4444] focus:border-[#EF4444]'
          : 'border-[#232326] focus:border-[#00E5CC]',
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
          'h-9 pl-3 pr-8 appearance-none cursor-pointer',
          error
            ? 'border-[#EF4444] focus:border-[#EF4444]'
            : 'border-[#232326] focus:border-[#00E5CC]',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        className="w-3.5 h-3.5 text-zinc-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
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
        'p-3 resize-y',
        error
          ? 'border-[#EF4444] focus:border-[#EF4444]'
          : 'border-[#232326] focus:border-[#00E5CC]',
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
        'bg-[#141416] border border-[#232326] rounded-[6px] divide-y divide-[#232326] overflow-hidden',
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
              className="h-3.5 rounded-[4px] bg-[#1B1B1E] animate-pulse"
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
        'bg-[#141416] border border-[#232326] rounded-[6px] px-6 py-10 text-center flex flex-col items-center justify-center',
        className,
      ].join(' ')}
    >
      {Icon && (
        <div className="w-10 h-10 rounded-[6px] bg-[#1B1B1E] border border-[#232326] flex items-center justify-center text-zinc-400 mb-3">
          <Icon className="w-5 h-5" weight="regular" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      {description && (
        <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const ALERT_VARIANTS = {
  error: {
    container: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-red-200',
    iconColor: 'text-[#EF4444]',
    Icon: WarningCircle,
  },
  warning: {
    container: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-amber-200',
    iconColor: 'text-[#F59E0B]',
    Icon: Warning,
  },
  success: {
    container: 'bg-[#10B981]/10 border-[#10B981]/30 text-emerald-200',
    iconColor: 'text-[#10B981]',
    Icon: CheckCircle,
  },
  info: {
    container: 'bg-[#00E5CC]/10 border-[#00E5CC]/30 text-teal-100',
    iconColor: 'text-[#00E5CC]',
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
        'border rounded-[6px] px-3.5 py-2.5 flex items-start gap-2.5 text-xs leading-relaxed',
        cfg.container,
        className,
      ].join(' ')}
    >
      <StatusIcon className={['w-4 h-4 shrink-0 mt-0.5', cfg.iconColor].join(' ')} weight="bold" />
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-zinc-100 mb-0.5">{title}</div>}
        {body && <div>{body}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded-[4px] transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      )}
    </div>
  );
}

const STAT_ACCENTS = {
  default: 'text-zinc-400',
  teal: 'text-[#00E5CC]',
  green: 'text-[#10B981]',
  amber: 'text-[#F59E0B]',
  red: 'text-[#EF4444]',
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
        'bg-[#141416] border border-[#232326] rounded-[6px] p-4 flex flex-col justify-between',
        className,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400 truncate">{label}</span>
        {Icon && (
          <Icon
            className={['w-4 h-4 shrink-0', STAT_ACCENTS[accent] || STAT_ACCENTS.default].join(' ')}
            weight="regular"
          />
        )}
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-[#1B1B1E] rounded-[4px] animate-pulse mt-2.5" />
      ) : (
        <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-100 mt-2 leading-none">
          {value ?? 0}
        </div>
      )}
      {detail && (
        <div className="text-xs text-zinc-500 mt-2 truncate">{detail}</div>
      )}
    </div>
  );
}
