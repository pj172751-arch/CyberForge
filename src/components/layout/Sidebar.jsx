import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Shield,
  Terminal,
  Crosshair,
  ShieldCheck,
  Activity,
  Users,
  Settings,
  User,
  Layers,
  Database,
  Radio,
  FileCode,
  CheckCircle2
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { currentRole, challenges, attempts, defenses, alerts, moderators } = useApp();

  // Navigation menus configured strictly per role
  const getNavItems = () => {
    switch (currentRole) {
      case 'attacker':
        return [
          { id: 'dashboard', label: 'Active Challenges', icon: Crosshair, badge: challenges.length },
          { id: 'attempts', label: 'My Attempts', icon: Terminal, badge: attempts.length },
          { id: 'profile', label: 'Operator Profile', icon: User },
          { id: 'settings', label: 'Console Settings', icon: Settings },
        ];
      case 'defender':
        return [
          { id: 'dashboard', label: 'Target Defenses', icon: Shield, badge: challenges.length },
          { id: 'verified', label: 'Mitigations Log', icon: ShieldCheck, badge: defenses.filter(d => d.verified).length },
          { id: 'profile', label: 'Operator Profile', icon: User },
          { id: 'settings', label: 'Console Settings', icon: Settings },
        ];
      case 'moderator':
        return [
          { id: 'activity', label: 'Activity & Alerts', icon: Activity, badge: alerts.length },
          { id: 'challenges', label: 'Manage Challenges', icon: Layers, badge: challenges.length },
          { id: 'actors', label: 'Attacker / Defender', icon: Users },
          { id: 'settings', label: 'Console Settings', icon: Settings },
        ];
      case 'admin':
        return [
          { id: 'moderators', label: 'Moderator Oversight', icon: Users, badge: moderators.length },
          { id: 'metrics', label: 'Platform Metrics', icon: Database },
          { id: 'settings', label: 'Console Settings', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-bg-panel border-r border-hairline flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="h-14 border-b border-hairline px-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sharp bg-cyan-dim border border-cyan-accent/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-cyan-accent" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm tracking-wider text-zinc-100">
                CYBERFORGE
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-accent bg-cyan-dim px-1 rounded-sharp border border-cyan-accent/20">
                v1.0
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 tracking-tight">
              SEM-5 PROJECT-I // CTF
            </div>
          </div>
        </div>

        {/* Actor Role Indicator Banner */}
        <div className="mx-3 my-3 p-2.5 bg-bg-main border border-hairline rounded-panel flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Current Subsystem</div>
            <div className="text-xs font-mono font-bold text-cyan-accent uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-accent animate-ping" />
              {currentRole} Console
            </div>
          </div>
          <div className="font-mono text-[10px] text-zinc-400 bg-bg-subtle px-1.5 py-0.5 rounded border border-hairline">
            8-TBL
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-2 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono rounded-panel transition-all ${
                  isActive
                    ? 'bg-cyan-dim text-cyan-accent font-semibold border border-cyan-accent/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-bg-subtle/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-accent' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-sharp border ${
                      isActive
                        ? 'border-cyan-accent/40 text-cyan-accent bg-bg-main'
                        : 'border-hairline text-zinc-500 bg-bg-main'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Diagnostic Pill */}
      <div className="p-3 border-t border-hairline bg-bg-main/60">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-status-green animate-pulse" />
            <span>DVWA REPLAY</span>
          </div>
          <span className="text-status-green font-semibold">:8081 OK</span>
        </div>
        <div className="text-[10px] font-mono text-zinc-500 truncate">
          LJ Polytechnic // Sec Lab
        </div>
      </div>
    </aside>
  );
}
