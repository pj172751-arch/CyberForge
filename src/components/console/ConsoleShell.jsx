import React, { useEffect, useRef, useState } from 'react';
import {
  Cube,
  List,
  MagnifyingGlass,
  SignOut,
  X,
} from '@phosphor-icons/react';
import { apiFetch } from '../../utils/api';
import { Badge, Button } from '../ui/primitives';

const ROLE_BADGE_VARIANT = {
  admin: 'amber',
  moderator: 'teal',
  attacker: 'red',
  defender: 'green',
};

function CyberForgeMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <polygon
        points="14,2 25,8.25 25,19.75 14,26 3,19.75 3,8.25"
        stroke="#232326"
        strokeWidth="1.5"
        fill="#141416"
      />
      <polygon
        points="14,5.5 21.5,9.75 21.5,18.25 14,22.5 6.5,18.25 6.5,9.75"
        stroke="#00E5CC"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M14 9.5L18 11.75V16.25L14 18.5L10 16.25V11.75L14 9.5Z"
        fill="#00E5CC"
      />
    </svg>
  );
}

export default function ConsoleShell({
  user,
  navItems = [],
  activeTab,
  onTabChange,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search console...',
  onSignOut,
  onOpenOverview,
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dbHealth, setDbHealth] = useState('checking'); // 'checking' | 'ok' | 'error'
  const searchInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const res = await apiFetch('/health/db');
        if (!cancelled) {
          setDbHealth(res?.status === 'ok' && res?.database === 'connected' ? 'ok' : 'error');
        }
      } catch {
        if (!cancelled) {
          setDbHealth('error');
        }
      }
    }

    checkHealth();
    const timer = window.setInterval(checkHealth, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (event.key === 'Escape' && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  const roleKey = (user?.role || '').toLowerCase();
  const roleVariant = ROLE_BADGE_VARIANT[roleKey] || 'neutral';
  const roleLabel = roleKey ? roleKey.charAt(0).toUpperCase() + roleKey.slice(1) : 'Operator';

  const statusDotClass =
    dbHealth === 'ok'
      ? 'bg-[#10B981]'
      : dbHealth === 'checking'
        ? 'bg-[#F59E0B]'
        : 'bg-[#EF4444]';

  const statusLabel =
    dbHealth === 'ok'
      ? 'OPERATIONAL · All systems online · v1.0.0'
      : dbHealth === 'checking'
        ? 'SYNCING · Checking database · v1.0.0'
        : 'DEGRADED · Database offline · v1.0.0';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0A0A0B] border-r border-[#232326]">
      <div className="h-14 px-4 border-b border-[#232326] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <CyberForgeMark />
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-[0.14em] text-zinc-100 leading-tight truncate">
              CYBERFORGE
            </div>
            <div className="text-[10px] font-mono tracking-[0.08em] text-zinc-500 leading-tight truncate mt-0.5">
              TRAIN. DEFEND. EVOLVE.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-[4px] text-zinc-400 hover:text-zinc-100 hover:bg-[#1B1B1E]"
        >
          <X className="w-4 h-4" weight="bold" />
        </button>
      </div>

      <nav aria-label="Console sections" className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onTabChange?.(item.id);
                setMobileNavOpen(false);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-[4px] text-sm border transition-colors duration-150 text-left',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
                isActive
                  ? 'bg-[#1B1B1E] text-zinc-100 border-[#232326] font-medium'
                  : 'bg-transparent text-zinc-400 border-transparent hover:bg-[#141416] hover:text-zinc-100',
              ].join(' ')}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                  <Icon
                    className={[
                      'w-4 h-4 shrink-0',
                      isActive ? 'text-[#00E5CC]' : 'text-zinc-500',
                    ].join(' ')}
                    weight={isActive ? 'fill' : 'regular'}
                  />
                )}
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge !== null && (
                <span className="text-[11px] font-mono tabular-nums text-zinc-400 bg-[#141416] border border-[#232326] px-1.5 py-0.5 rounded-[4px]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#232326] shrink-0">
        <div className="px-2.5 py-2 rounded-[4px] bg-[#141416] border border-[#232326] flex items-center gap-2">
          <span className={['w-2 h-2 rounded-full shrink-0', statusDotClass].join(' ')} />
          <span className="text-[11px] font-mono text-zinc-400 leading-snug break-words">
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-60 max-w-[80vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-[#232326] bg-[#0A0A0B] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-[4px] border border-[#232326] bg-[#141416] text-zinc-300 hover:text-white"
            >
              <List className="w-4 h-4" weight="bold" />
            </button>

            <div className="relative flex-1 min-w-0">
              <MagnifyingGlass
                className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                weight="regular"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.currentTarget.blur();
                  }
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full h-9 pl-9 pr-16 bg-[#141416] border border-[#232326] rounded-[4px] text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#00E5CC] transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && onSearchChange ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search"
                    className="p-0.5 rounded-[4px] text-zinc-400 hover:text-zinc-100"
                  >
                    <X className="w-3.5 h-3.5" weight="bold" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-[#0A0A0B] border border-[#232326] rounded-[4px]">
                    Ctrl+K
                  </kbd>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {typeof onOpenOverview === 'function' && (
              <Button variant="secondary" size="sm" onClick={onOpenOverview}>
                <Cube className="w-3.5 h-3.5 text-[#00E5CC]" weight="regular" />
                <span className="hidden sm:inline">3D Overview</span>
              </Button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#141416] border border-[#232326]">
              <span className="text-xs font-medium text-zinc-200 max-w-[140px] truncate">
                {user?.username || user?.email || 'Operator'}
              </span>
              <Badge variant={roleVariant}>{roleLabel}</Badge>
            </div>

            {onSignOut && (
              <Button variant="secondary" size="sm" onClick={onSignOut}>
                <SignOut className="w-3.5 h-3.5" weight="regular" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
