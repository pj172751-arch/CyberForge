import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Command,
  Database,
  MagnifyingGlass,
  SignOut,
  X,
} from '@phosphor-icons/react';
import { API_BASE, apiFetch } from '../../utils/api';
import { CommandPaletteModal } from '../ui/spells';

function CyberForgeDeckMark({ accentColor }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <polygon
        points="14,2 25,8.25 25,19.75 14,26 3,19.75 3,8.25"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.5"
        fill="#0A0B0F"
      />
      <polygon
        points="14,5.5 21.5,9.75 21.5,18.25 14,22.5 6.5,18.25 6.5,9.75"
        stroke={accentColor}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M14 9.5L18 11.75V16.25L14 18.5L10 16.25V11.75L14 9.5Z"
        fill={accentColor}
      />
    </svg>
  );
}

function getUserInitials(user) {
  const source = (user?.username || user?.email || 'CF').trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function CommandDeckShell({
  user,
  roleTheme = 'admin',
  roleLabel,
  navItems = [],
  activeTab,
  onTabChange,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Filter or jump...',
  commandGroups = [],
  headerActions,
  onSignOut,
  children,
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [dbHealth, setDbHealth] = useState('checking'); // 'checking' | 'ok' | 'error'
  const telemetryRef = useRef(null);

  const isAdmin = roleTheme === 'admin';
  const accentHex = isAdmin ? '#F59E0B' : '#00E5CC';
  const resolvedRoleLabel = roleLabel || (isAdmin ? 'ROOT GOVERNANCE' : 'RANGE OPERATIONS');

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
    if (!telemetryOpen) return undefined;
    function handleOutside(event) {
      if (telemetryRef.current && !telemetryRef.current.contains(event.target)) {
        setTelemetryOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setTelemetryOpen(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [telemetryOpen]);

  useEffect(() => {
    function handleGlobalKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (paletteOpen || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }

      const num = Number(event.key);
      if (Number.isInteger(num) && num >= 1 && num <= navItems.length) {
        const item = navItems[num - 1];
        if (item?.id) {
          onTabChange?.(item.id);
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [navItems, onTabChange, paletteOpen]);

  const resolvedGroups = useMemo(() => {
    if (Array.isArray(commandGroups) && commandGroups.length > 0) {
      return commandGroups;
    }
    if (!navItems.length) return [];
    return [
      {
        heading: 'Console Views',
        items: navItems.map((item, idx) => ({
          id: `nav-${item.id}`,
          label: item.label,
          hint: `Switch to ${item.label}`,
          shortcut: idx < 9 ? String(idx + 1) : undefined,
          icon: item.icon,
          onSelect: () => onTabChange?.(item.id),
        })),
      },
    ];
  }, [commandGroups, navItems, onTabChange]);

  const statusDot =
    dbHealth === 'ok'
      ? 'bg-[#10B981]'
      : dbHealth === 'checking'
        ? 'bg-[#F59E0B]'
        : 'bg-[#EF4444]';

  const statusText =
    dbHealth === 'ok'
      ? 'ONLINE'
      : dbHealth === 'checking'
        ? 'SYNC'
        : 'DEGRADED';

  return (
    <div className="cf-dot-canvas min-h-screen text-zinc-100 flex flex-col">
      {/* Floating Top Bar */}
      <header className="sticky top-3 z-30 w-full mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="bg-[#0E1016]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-3 shadow-xl">
          {/* Brand + Role Posture */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <CyberForgeDeckMark accentColor={accentHex} />
            <span className="text-xs sm:text-sm font-bold tracking-[0.12em] text-zinc-100 whitespace-nowrap">
              CYBERFORGE
            </span>
            <span
              className={[
                'hidden md:inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono tracking-[0.08em] whitespace-nowrap',
                isAdmin
                  ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25'
                  : 'bg-[#00E5CC]/10 text-[#00E5CC] border-[#00E5CC]/25',
              ].join(' ')}
            >
              {resolvedRoleLabel}
            </span>
          </div>

          {/* Center Filter + Command Bar Trigger */}
          <div className="flex items-center gap-2 flex-1 max-w-md min-w-0 justify-center">
            {onSearchChange && (
              <div className="relative hidden sm:flex items-center flex-1 min-w-0">
                <MagnifyingGlass
                  className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none"
                  weight="regular"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="w-full h-9 pl-8 pr-7 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#00E5CC]/60 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear filter"
                    className="absolute right-2 p-0.5 rounded text-zinc-400 hover:text-zinc-100"
                  >
                    <X className="w-3.5 h-3.5" weight="bold" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="h-9 px-2.5 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center gap-2 text-xs text-zinc-300 hover:text-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]"
            >
              <Command className="w-3.5 h-3.5 text-zinc-400" weight="regular" />
              <span className="hidden lg:inline">Commands</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#07080B] border border-white/[0.08] text-[10px] font-mono text-zinc-400">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right Controls: Telemetry, Optional Actions, Profile Monogram, Sign Out */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div ref={telemetryRef} className="relative">
              <button
                type="button"
                onClick={() => setTelemetryOpen((prev) => !prev)}
                aria-expanded={telemetryOpen}
                aria-label="Infrastructure telemetry status"
                className="h-9 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center gap-2 text-xs font-mono text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]"
              >
                <span className={['w-2 h-2 rounded-full shrink-0', statusDot].join(' ')} />
                <span className="hidden sm:inline">{statusText}</span>
              </button>

              {telemetryOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#0E1016]/95 backdrop-blur-xl border border-white/[0.1] rounded-xl p-3 shadow-2xl z-50 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#00E5CC]" weight="regular" />
                      Runtime Endpoints
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">v1.0.0</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">FastAPI :8000</span>
                      <span className="font-mono text-[11px] text-[#10B981]">
                        {dbHealth === 'error' ? 'CHECK' : 'ACTIVE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Postgres :5433</span>
                      <span
                        className={[
                          'font-mono text-[11px]',
                          dbHealth === 'ok'
                            ? 'text-[#10B981]'
                            : dbHealth === 'checking'
                              ? 'text-[#F59E0B]'
                              : 'text-[#EF4444]',
                        ].join(' ')}
                      >
                        {dbHealth === 'ok' ? 'CONNECTED' : dbHealth === 'checking' ? 'CHECKING' : 'OFFLINE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">DVWA Target</span>
                      <span className="font-mono tabular-nums text-[11px] text-zinc-300">
                        :8081
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-white/[0.08] text-[10px] font-mono text-zinc-500 truncate">
                    {API_BASE}
                  </div>
                </div>
              )}
            </div>

            {headerActions}

            <button
              type="button"
              onClick={() => onTabChange?.('profile')}
              title={`${user?.username || 'Operator'} — Open Profile`}
              aria-label="Open operator profile"
              className={[
                'h-9 w-9 rounded-xl border flex items-center justify-center text-xs font-mono font-semibold transition-colors shrink-0',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
                isAdmin
                  ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/20'
                  : 'bg-[#00E5CC]/10 border-[#00E5CC]/30 text-[#00E5CC] hover:bg-[#00E5CC]/20',
              ].join(' ')}
            >
              {getUserInitials(user)}
            </button>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:h-9 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]"
              >
                <SignOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" weight="regular" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full mx-auto max-w-[1440px] px-4 sm:px-6 pt-5 pb-28">
        {onSearchChange && (
          <div className="sm:hidden mb-4 relative flex items-center">
            <MagnifyingGlass
              className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none"
              weight="regular"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full h-10 pl-8 pr-8 rounded-xl bg-[#0E1016]/90 border border-white/[0.08] text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#00E5CC]/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear filter"
                className="absolute right-2.5 p-1 rounded text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-3.5 h-3.5" weight="bold" />
              </button>
            )}
          </div>
        )}
        {children}
      </main>

      {/* Bottom Floating Tactical Dock */}
      <nav
        aria-label="Command deck navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)]"
      >
        <div className="bg-[#0E1016]/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-1.5 shadow-2xl flex items-center gap-1 overflow-x-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange?.(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'group relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 hover:-translate-y-0.5 shrink-0',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00E5CC]',
                  isActive
                    ? isAdmin
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                      : 'bg-[#00E5CC]/15 text-[#00E5CC] border border-[#00E5CC]/30'
                    : 'text-zinc-400 border border-transparent hover:text-zinc-100 hover:bg-white/[0.05]',
                ].join(' ')}
              >
                {Icon && (
                  <Icon
                    className="w-4 h-4 shrink-0"
                    weight={isActive ? 'fill' : 'regular'}
                  />
                )}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={[
                      'px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums border',
                      isActive
                        ? isAdmin
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]'
                          : 'bg-[#00E5CC]/15 border-[#00E5CC]/30 text-[#00E5CC]'
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-400',
                    ].join(' ')}
                  >
                    {item.badge}
                  </span>
                )}
                {idx < 9 && (
                  <span className="hidden xl:inline text-[10px] font-mono tabular-nums text-zinc-600">
                    {idx + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <CommandPaletteModal
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        placeholder={searchPlaceholder}
        groups={resolvedGroups}
      />
    </div>
  );
}
