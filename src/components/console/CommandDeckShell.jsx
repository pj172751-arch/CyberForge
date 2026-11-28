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
        stroke="#111317"
        strokeWidth="1.5"
        fill="#FAF8F3"
      />
      <polygon
        points="14,5.75 21.25,9.9 21.25,18.1 14,22.25 6.75,18.1 6.75,9.9"
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
    accentHex: '#B45309',
    defaultLabel: 'ROOT GOVERNANCE',
    pillClass: 'bg-[#B45309]/10 text-[#92400E] border-[#B45309]/35',
    avatarClass: 'bg-[#B45309]/10 border-[#B45309]/40 text-[#92400E] hover:bg-[#B45309]/20',
    activeTabRule: 'border-[#B45309] text-[#111317]',
    activeBadgeClass: 'bg-[#B45309] text-[#FAF8F3] border-[#B45309]',
    mobileActiveClass: 'bg-[#B45309]/12 text-[#92400E] border-[#B45309]/40',
    focusRingClass: 'focus-visible:ring-[#B45309]',
    inputFocusClass: 'focus:border-[#B45309]',
  },
  moderator: {
    accentHex: '#B45309',
    defaultLabel: 'RANGE OPERATIONS',
    pillClass: 'bg-[#B45309]/10 text-[#92400E] border-[#B45309]/35',
    avatarClass: 'bg-[#B45309]/10 border-[#B45309]/40 text-[#92400E] hover:bg-[#B45309]/20',
    activeTabRule: 'border-[#B45309] text-[#111317]',
    activeBadgeClass: 'bg-[#B45309] text-[#FAF8F3] border-[#B45309]',
    mobileActiveClass: 'bg-[#B45309]/12 text-[#92400E] border-[#B45309]/40',
    focusRingClass: 'focus-visible:ring-[#B45309]',
    inputFocusClass: 'focus:border-[#B45309]',
  },
  attacker: {
    accentHex: '#C81E1E',
    defaultLabel: 'RED TEAM OPS',
    pillClass: 'bg-[#C81E1E]/10 text-[#B91C1C] border-[#C81E1E]/35',
    avatarClass: 'bg-[#C81E1E]/10 border-[#C81E1E]/40 text-[#B91C1C] hover:bg-[#C81E1E]/18',
    activeTabRule: 'border-[#C81E1E] text-[#111317]',
    activeBadgeClass: 'bg-[#C81E1E] text-[#FAF8F3] border-[#C81E1E]',
    mobileActiveClass: 'bg-[#C81E1E]/10 text-[#B91C1C] border-[#C81E1E]/35',
    focusRingClass: 'focus-visible:ring-[#C81E1E]',
    inputFocusClass: 'focus:border-[#C81E1E]',
  },
  defender: {
    accentHex: '#1D4ED8',
    defaultLabel: 'BLUE TEAM DEFENSE',
    pillClass: 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/35',
    avatarClass: 'bg-[#1D4ED8]/10 border-[#1D4ED8]/40 text-[#1D4ED8] hover:bg-[#1D4ED8]/18',
    activeTabRule: 'border-[#1D4ED8] text-[#111317]',
    activeBadgeClass: 'bg-[#1D4ED8] text-[#FAF8F3] border-[#1D4ED8]',
    mobileActiveClass: 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/35',
    focusRingClass: 'focus-visible:ring-[#1D4ED8]',
    inputFocusClass: 'focus:border-[#1D4ED8]',
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [dbHealth, setDbHealth] = useState('checking'); // 'checking' | 'ok' | 'error'
  const [dvwaHealth, setDvwaHealth] = useState('checking'); // 'checking' | 'ok' | 'setup_required' | 'offline'
  const [dvwaBaseUrl, setDvwaBaseUrl] = useState('http://localhost:8081');
  const telemetryRef = useRef(null);
  const filterRef = useRef(null);
  const filterInputRef = useRef(null);

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
    if (!telemetryOpen && !filterOpen) return undefined;
    function handleOutside(event) {
      if (telemetryOpen && telemetryRef.current && !telemetryRef.current.contains(event.target)) {
        setTelemetryOpen(false);
      }
      if (filterOpen && filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setTelemetryOpen(false);
        setFilterOpen(false);
      }
    }
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [telemetryOpen, filterOpen]);

  useEffect(() => {
    if (filterOpen) {
      filterInputRef.current?.focus();
    }
  }, [filterOpen]);

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
      ? 'bg-[#C81E1E]'
      : dbHealth === 'checking' || dvwaHealth === 'checking'
        ? 'bg-[#B45309]'
        : dbHealth === 'ok' && dvwaHealth === 'ok'
          ? 'bg-[#047857]'
          : 'bg-[#B45309]';

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
      ? 'text-[#047857]'
      : dvwaHealth === 'setup_required' || dvwaHealth === 'checking'
        ? 'text-[#B45309]'
        : 'text-[#C81E1E]';

  return (
    <div className="cf-archival-canvas min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden bg-[#F3EFE6] text-[#111317] flex flex-col">
      {/* Unified 60px Top Archival Instrument Bar */}
      <header className="sticky top-0 lg:static h-[60px] shrink-0 bg-[#FAF8F3] border-b border-[#111317]/15 z-30">
        <div className="w-full h-full mx-auto max-w-[1440px] px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Brand + Role Stamp */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <CyberForgeDeckMark accentColor={accentHex} />
            <span className="font-display text-xl font-extrabold tracking-wide text-[#111317] whitespace-nowrap leading-none">
              CYBERFORGE
            </span>
            <span
              title={resolvedRoleLabel}
              aria-label={resolvedRoleLabel}
              className="2xl:hidden inline-flex items-center justify-center w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: accentHex }}
            />
            <span
              className={[
                'hidden 2xl:inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-semibold tracking-wide whitespace-nowrap',
                theme.pillClass,
              ].join(' ')}
            >
              {resolvedRoleLabel}
            </span>
          </div>

          {/* Center Page Nav Tabs (Desktop lg+) */}
          <nav
            aria-label="Primary console navigation"
            className="hidden lg:flex items-center h-full gap-0.5 xl:gap-1 min-w-0 overflow-x-auto cf-no-scrollbar"
          >
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange?.(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={idx < 9 ? `${item.label} (Shortcut ${idx + 1})` : item.label}
                  className={[
                    'h-full px-2.5 xl:px-3 flex items-center gap-1.5 text-[14px] font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
                    theme.focusRingClass,
                    isActive
                      ? theme.activeTabRule
                      : 'border-transparent text-[#4B5260] hover:text-[#111317]',
                  ].join(' ')}
                >
                  {Icon && (
                    <Icon
                      className="hidden 2xl:block w-4 h-4 shrink-0"
                      weight={isActive ? 'fill' : 'regular'}
                    />
                  )}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={[
                        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold tabular-nums border leading-none',
                        isActive
                          ? theme.activeBadgeClass
                          : 'bg-[#EAE4D7] border-[#111317]/15 text-[#1C1F26]',
                      ].join(' ')}
                    >
                      {item.badge}
                    </span>
                  )}
                  {idx < 9 && (
                    <span className="hidden 2xl:inline text-xs font-mono tabular-nums text-[#4B5260]">
                      {idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Anchored Filter Popover, Ctrl+K, Telemetry, Actions, Profile, Sign Out */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onSearchChange && (
              <div ref={filterRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  aria-expanded={filterOpen}
                  aria-label="Filter active view"
                  title={searchQuery ? `Filter: ${searchQuery}` : 'Filter active view'}
                  className={[
                    'h-9 px-2.5 rounded-md border flex items-center gap-1.5 text-xs font-semibold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2',
                    theme.focusRingClass,
                    searchQuery
                      ? 'bg-[#111317] text-[#FAF8F3] border-[#111317]'
                      : 'bg-[#F3EFE6] hover:bg-[#EAE4D7] border-[#111317]/20 text-[#111317]',
                  ].join(' ')}
                >
                  <MagnifyingGlass className="w-4 h-4 shrink-0" weight="regular" />
                  {searchQuery && (
                    <span className="hidden 2xl:inline max-w-[72px] truncate">
                      {searchQuery}
                    </span>
                  )}
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#FAF8F3] border border-[#111317]/25 rounded-lg p-3 z-50 text-[#111317]">
                    <div className="relative flex items-center">
                      <MagnifyingGlass
                        className="w-4 h-4 text-[#4B5260] absolute left-3 pointer-events-none"
                        weight="regular"
                      />
                      <input
                        ref={filterInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        className={[
                          'w-full h-10 pl-9 pr-8 rounded-md bg-[#F3EFE6] border border-[#111317]/25 text-[14px] text-[#111317] placeholder:text-[#4B5260] focus:outline-none',
                          theme.inputFocusClass,
                        ].join(' ')}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => onSearchChange('')}
                          aria-label="Clear filter"
                          className="absolute right-2 p-1 rounded text-[#4B5260] hover:text-[#111317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317]"
                        >
                          <X className="w-3.5 h-3.5" weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              title="Command Palette (Ctrl+K)"
              className={[
                'h-9 px-2.5 rounded-md bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/20 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#111317] transition-colors shrink-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2',
                theme.focusRingClass,
              ].join(' ')}
            >
              <Command className="w-4 h-4 text-[#4B5260]" weight="regular" />
              <kbd className="hidden xl:inline-flex font-mono text-xs text-[#1C1F26]">
                Ctrl+K
              </kbd>
            </button>

            <div ref={telemetryRef} className="relative">
              <button
                type="button"
                onClick={() => setTelemetryOpen((prev) => !prev)}
                aria-expanded={telemetryOpen}
                aria-label="Infrastructure telemetry status"
                title={`Infrastructure: ${statusText}`}
                className={[
                  'h-9 px-2.5 rounded-md bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/20 flex items-center gap-2 text-xs font-mono font-semibold text-[#111317] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2',
                  theme.focusRingClass,
                ].join(' ')}
              >
                <span className={['w-2 h-2 rounded-full shrink-0', statusDot].join(' ')} />
                <span className="hidden xl:inline">{statusText}</span>
              </button>

              {telemetryOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#FAF8F3] border border-[#111317]/25 rounded-lg p-3.5 z-50 space-y-2.5 text-[#111317]">
                  <div className="flex items-center justify-between border-b border-[#111317]/15 pb-2">
                    <span className="text-[13px] font-bold text-[#111317] flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#1D4ED8]" weight="regular" />
                      Runtime Endpoints
                    </span>
                    <span className="text-xs font-mono text-[#4B5260]">v1.0.0</span>
                  </div>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#4B5260]">FastAPI :8000</span>
                      <span className="font-mono text-xs font-semibold text-[#047857]">
                        {dbHealth === 'error' ? 'CHECK' : 'ACTIVE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#4B5260]">Postgres :5432</span>
                      <span
                        className={[
                          'font-mono text-xs font-semibold',
                          dbHealth === 'ok'
                            ? 'text-[#047857]'
                            : dbHealth === 'checking'
                              ? 'text-[#B45309]'
                              : 'text-[#C81E1E]',
                        ].join(' ')}
                      >
                        {dbHealth === 'ok' ? 'CONNECTED' : dbHealth === 'checking' ? 'CHECKING' : 'OFFLINE'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#4B5260]">DVWA Target :8081</span>
                      <span className={['font-mono text-xs font-semibold', dvwaStatusClass].join(' ')}>
                        {dvwaStatusLabel}
                      </span>
                    </div>
                  </div>
                  <div
                    className="pt-2 border-t border-[#111317]/15 text-xs font-mono text-[#4B5260] truncate"
                    title={`${API_BASE} · ${dvwaBaseUrl}`}
                  >
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
                'h-9 w-9 rounded-md border flex items-center justify-center text-xs font-mono font-bold transition-colors shrink-0 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2',
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
                title="Sign out"
                className={[
                  'h-9 px-2.5 rounded-md bg-[#F3EFE6] hover:bg-[#EAE4D7] border border-[#111317]/20 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#111317] transition-colors shrink-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2',
                  theme.focusRingClass,
                ].join(' ')}
              >
                <SignOut className="w-4 h-4 text-[#4B5260]" weight="regular" />
                <span className="hidden md:inline lg:hidden 2xl:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Chassis — Single-frame bounded on desktop lg+, natural scroll on <lg */}
      <main className="flex-1 lg:min-h-0 lg:overflow-hidden flex flex-col w-full mx-auto max-w-[1440px] px-4 sm:px-6 py-4">
        {onSearchChange && (
          <div className="lg:hidden mb-3 relative flex items-center shrink-0">
            <MagnifyingGlass
              className="w-4 h-4 text-[#4B5260] absolute left-3 pointer-events-none"
              weight="regular"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={[
                'w-full h-10 pl-9 pr-9 rounded-md bg-[#FAF8F3] border border-[#111317]/20 text-[15px] text-[#111317] placeholder:text-[#4B5260] focus:outline-none',
                theme.inputFocusClass,
              ].join(' ')}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear filter"
                className="absolute right-2.5 p-1 rounded text-[#4B5260] hover:text-[#111317]"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 lg:min-h-0 flex flex-col">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar (<lg only) */}
      <nav
        aria-label="Mobile console navigation"
        className="lg:hidden sticky bottom-0 z-30 bg-[#FAF8F3] border-t border-[#111317]/15 px-2 py-1.5"
      >
        <div className="flex items-center justify-start sm:justify-center gap-1 overflow-x-auto cf-no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange?.(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center gap-1.5 px-3 py-2 rounded-md border text-[13px] font-semibold whitespace-nowrap transition-colors shrink-0',
                  'focus-visible:outline-none focus-visible:ring-2',
                  theme.focusRingClass,
                  isActive
                    ? theme.mobileActiveClass
                    : 'border-transparent text-[#4B5260] hover:text-[#111317] hover:bg-[#EAE4D7]',
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
                  <span className="px-1.5 py-0.5 rounded bg-[#EAE4D7] border border-[#111317]/15 text-xs font-mono tabular-nums text-[#111317] leading-none">
                    {item.badge}
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
