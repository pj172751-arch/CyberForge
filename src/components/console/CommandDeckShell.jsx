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

const ROLE_THEMES = {
  admin: {
    accentHex: '#F59E0B',
    defaultLabel: 'ROOT GOVERNANCE',
    pillClass: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25',
    avatarClass: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/20',
    dockActiveClass: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
    dockBadgeClass: 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]',
    focusRingClass: 'focus-visible:ring-[#F59E0B]',
    inputFocusClass: 'focus:border-[#F59E0B]/60',
  },
  moderator: {
    accentHex: '#00E5CC',
    defaultLabel: 'RANGE OPERATIONS',
    pillClass: 'bg-[#00E5CC]/10 text-[#00E5CC] border-[#00E5CC]/25',
    avatarClass: 'bg-[#00E5CC]/10 border-[#00E5CC]/30 text-[#00E5CC] hover:bg-[#00E5CC]/20',
    dockActiveClass: 'bg-[#00E5CC]/15 text-[#00E5CC] border border-[#00E5CC]/30',
    dockBadgeClass: 'bg-[#00E5CC]/15 border-[#00E5CC]/30 text-[#00E5CC]',
    focusRingClass: 'focus-visible:ring-[#00E5CC]',
    inputFocusClass: 'focus:border-[#00E5CC]/60',
  },
  attacker: {
    accentHex: '#F43F5E',
    defaultLabel: 'RED TEAM OPS',
    pillClass: 'bg-[#F43F5E]/10 text-[#FB7185] border-[#F43F5E]/30',
    avatarClass: 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#FB7185] hover:bg-[#F43F5E]/20',
    dockActiveClass: 'bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/35',
    dockBadgeClass: 'bg-[#F43F5E]/15 border-[#F43F5E]/30 text-[#FB7185]',
    focusRingClass: 'focus-visible:ring-[#F43F5E]',
    inputFocusClass: 'focus:border-[#F43F5E]/60',
  },
  defender: {
    accentHex: '#38BDF8',
    defaultLabel: 'BLUE TEAM DEFENSE',
    pillClass: 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30',
    avatarClass: 'bg-[#38BDF8]/10 border-[#38BDF8]/30 text-[#38BDF8] hover:bg-[#38BDF8]/20',
    dockActiveClass: 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/35',
    dockBadgeClass: 'bg-[#38BDF8]/15 border-[#38BDF8]/30 text-[#38BDF8]',
    focusRingClass: 'focus-visible:ring-[#38BDF8]',
    inputFocusClass: 'focus:border-[#38BDF8]/60',
  },
};

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
  const [dvwaHealth, setDvwaHealth] = useState('checking'); // 'checking' | 'ok' | 'setup_required' | 'offline'
  const [dvwaBaseUrl, setDvwaBaseUrl] = useState('http://localhost:8081');
  const telemetryRef = useRef(null);

  const theme = ROLE_THEMES[roleTheme] || ROLE_THEMES.moderator;
  const accentHex = theme.accentHex;
  const resolvedRoleLabel = roleLabel || theme.defaultLabel;

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      const [dbRes, dvwaRes] = await Promise.allSettled([
        apiFetch('/health/db'),
        apiFetch('/health/dvwa'),
      ]);
      if (cancelled) return;

      if (dbRes.status === 'fulfilled') {
        const res = dbRes.value;
        setDbHealth(res?.status === 'ok' && res?.database === 'connected' ? 'ok' : 'error');
      } else {
        setDbHealth('error');
      }

      if (dvwaRes.status === 'fulfilled') {
        const dvwa = dvwaRes.value;
        if (dvwa?.base_url) {
          setDvwaBaseUrl(dvwa.base_url);
        }
        if (dvwa?.status === 'ok' || (dvwa?.reachable && dvwa?.initialized)) {
          setDvwaHealth('ok');
        } else if (dvwa?.status === 'setup_required' || (dvwa?.reachable && !dvwa?.initialized)) {
          setDvwaHealth('setup_required');
        } else {
          setDvwaHealth('offline');
        }
      } else {
        setDvwaHealth('offline');
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
    dbHealth === 'error'
      ? 'bg-[#EF4444]'
      : dbHealth === 'checking' || dvwaHealth === 'checking'
        ? 'bg-[#F59E0B]'
        : dbHealth === 'ok' && dvwaHealth === 'ok'
          ? 'bg-[#10B981]'
          : 'bg-[#F59E0B]';

  const statusText =
    dbHealth === 'error'
      ? 'DEGRADED'
      : dbHealth === 'checking' || dvwaHealth === 'checking'
        ? 'SYNC'
        : dbHealth === 'ok' && dvwaHealth === 'ok'
          ? 'ONLINE'
          : dvwaHealth === 'setup_required'
            ? 'SETUP'
            : 'PARTIAL';

  const dvwaStatusLabel =
    dvwaHealth === 'ok'
      ? 'ONLINE'
      : dvwaHealth === 'setup_required'
        ? 'SETUP'
        : dvwaHealth === 'checking'
          ? 'CHECKING'
          : 'OFFLINE';

  const dvwaStatusClass =
    dvwaHealth === 'ok'
      ? 'text-[#10B981]'
      : dvwaHealth === 'setup_required' || dvwaHealth === 'checking'
        ? 'text-[#F59E0B]'
        : 'text-[#EF4444]';

  return (
    <div className="cf-dot-canvas min-h-screen text-zinc-100 flex flex-col">
      {/* Floating Top Bar */}
      <header className="sticky top-3 z-30 w-full mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="bg-[#0E1016]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-3 shadow-xl">
          {/* Brand + Role Posture */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
            <CyberForgeDeckMark accentColor={accentHex} />
            <span className="hidden sm:inline text-xs sm:text-sm font-bold tracking-[0.12em] text-zinc-100 whitespace-nowrap">
              CYBERFORGE
            </span>
            <span
              className={[
                'hidden md:inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono tracking-[0.08em] whitespace-nowrap',
                theme.pillClass,
              ].join(' ')}
            >
              {resolvedRoleLabel}
            </span>
          </div>

          {/* Center Filter + Command Bar Trigger */}
          <div className="flex items-center gap-2 flex-1 max-w-md min-w-0 justify-end sm:justify-center">
            {onSearchChange && (
              <div className="relative hidden sm:flex items-center flex-1 min-w-0">
                <MagnifyingGlass
                  className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none"
                  weight="regular"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className={[
                    'w-full h-9 pl-8 pr-7 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-400 focus:outline-none transition-colors',
                    theme.inputFocusClass,
                  ].join(' ')}
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
              className={[
                'h-9 w-9 sm:w-auto sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center gap-2 text-xs text-zinc-300 hover:text-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1',
                theme.focusRingClass,
              ].join(' ')}
            >
              <Command className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" weight="regular" />
              <span className="hidden lg:inline">Commands</span>
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-[#07080B] border border-white/[0.08] text-[10px] font-mono text-zinc-400">
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
                className={[
                  'h-9 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center gap-2 text-xs font-mono text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-1',
                  theme.focusRingClass,
                ].join(' ')}
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
                      <span className="text-zinc-400">DVWA Target :8081</span>
                      <span className={['font-mono text-[11px]', dvwaStatusClass].join(' ')}>
                        {dvwaStatusLabel}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-white/[0.08] text-[10px] font-mono text-zinc-400 truncate" title={`${API_BASE} · ${dvwaBaseUrl}`}>
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
                'focus-visible:outline-none focus-visible:ring-1',
                theme.focusRingClass,
                theme.avatarClass,
              ].join(' ')}
            >
              {getUserInitials(user)}
            </button>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
                className={[
                  'min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:h-9 sm:px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1',
                  theme.focusRingClass,
                ].join(' ')}
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
              className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none"
              weight="regular"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={[
                'w-full h-10 pl-8 pr-8 rounded-xl bg-[#0E1016]/90 border border-white/[0.08] text-sm text-zinc-100 placeholder:text-zinc-400 focus:outline-none',
                theme.inputFocusClass,
              ].join(' ')}
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
        className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1rem)]"
      >
        <div className="bg-[#0E1016]/90 backdrop-blur-xl border border-white/[0.1] rounded-2xl p-1 sm:p-1.5 shadow-2xl flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
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
                  'group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-150 hover:-translate-y-0.5 shrink-0',
                  'focus-visible:outline-none focus-visible:ring-1',
                  theme.focusRingClass,
                  isActive
                    ? theme.dockActiveClass
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
                      'hidden sm:inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums border',
                      isActive
                        ? theme.dockBadgeClass
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-400',
                    ].join(' ')}
                  >
                    {item.badge}
                  </span>
                )}
                {idx < 9 && (
                  <span className="hidden xl:inline text-[10px] font-mono tabular-nums text-zinc-500">
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
