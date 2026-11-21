import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { soundEngine } from '../../utils/audio';
import { 
  Bell, 
  Search, 
  Shield, 
  Terminal, 
  User, 
  LogOut, 
  AlertTriangle,
  ChevronDown,
  X
} from 'lucide-react';

export default function Topbar({ onOpenSearch }) {
  const { currentRole, currentUser, loginAs, logout, alerts } = useApp();
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const roles = [
    { id: 'attacker', label: 'Attacker' },
    { id: 'defender', label: 'Defender' },
    { id: 'moderator', label: 'Moderator' },
    { id: 'admin', label: 'Admin' }
  ];

  return (
    <header className="h-14 border-b border-hairline bg-bg-panel/95 backdrop-blur px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Quick search button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 bg-bg-main border border-hairline hover:border-border-subtle text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-panel text-xs transition-colors group w-52 sm:w-64"
        >
          <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-accent transition-colors" />
          <span className="flex-1 text-left">Search challenges, logs...</span>
          <kbd className="hidden sm:inline-block bg-bg-subtle border border-hairline px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right controls: Role switcher, Alert bell, User badge */}
      <div className="flex items-center gap-3">
        {/* Role Switcher Toolbar (Crucial for evaluation/testing) */}
        <div className="hidden md:flex items-center bg-bg-main border border-hairline p-0.5 rounded-panel">
          <span className="text-[10px] font-mono text-zinc-500 px-2 uppercase tracking-wider">Role:</span>
          {roles.map(r => {
            const isActive = currentRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  soundEngine.playBlip();
                  loginAs(r.id);
                }}
                className={`px-2.5 py-1 text-xs font-mono rounded-sharp transition-all ${
                  isActive
                    ? 'bg-cyan-accent text-bg-main font-semibold shadow-[0_0_12px_rgba(0,229,204,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-bg-subtle'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Alerts Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              const next = !showAlertsDropdown;
              setShowAlertsDropdown(next);
              if (next) soundEngine.playAlarm();
            }}
            className="relative p-2 text-zinc-400 hover:text-zinc-200 hover:bg-bg-subtle rounded-panel border border-hairline transition-colors"
            title="System Alerts"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-status-red text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-bg-panel animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Drawer */}
          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-bg-panel border border-hairline rounded-panel shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-hairline mb-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-amber" />
                  <span>Real-time Security Alerts ({alerts.length})</span>
                </div>
                <button 
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {alerts.map(a => (
                  <div key={a.alert_id} className="p-2 bg-bg-main border border-hairline rounded-sharp text-xs">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                      <span className="text-status-red font-medium">{a.alert_type}</span>
                      <span>{a.timestamp.split(' ')[1]}</span>
                    </div>
                    <p className="text-zinc-300 font-mono text-[11px] leading-snug">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-hairline">
          <div className="w-7 h-7 rounded-sharp bg-bg-subtle border border-hairline flex items-center justify-center font-mono text-xs text-cyan-accent font-bold">
            {currentUser?.username?.substring(0, 2).toUpperCase() || 'CF'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-mono font-medium text-zinc-200 leading-tight">
              {currentUser?.username || 'Operator'}
            </div>
            <div className="text-[10px] font-mono text-cyan-accent leading-none uppercase">
              {currentRole}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-zinc-500 hover:text-status-red hover:bg-status-redDim rounded-sharp transition-colors ml-1"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
