import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { soundEngine } from '../utils/audio';
import { 
  Users, 
  Shield, 
  Plus, 
  Key, 
  Database, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  X,
  Server,
  Activity,
  HardDrive
} from 'lucide-react';

export default function AdminDashboard() {
  const { 
    moderators, 
    attackers, 
    defenders, 
    challenges, 
    attempts,
    defenses,
    alerts,
    adminList, 
    addModerator 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleAddModerator = (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim()) return;

    soundEngine.playSuccess();
    addModerator(newUsername.trim(), newEmail.trim());
    setNewUsername('');
    setNewEmail('');
    setIsModalOpen(false);
  };

  // The locked 8 database tables with live row counts
  const databaseTables = [
    { name: 'admin', pk: 'admin_id', count: adminList.length, role: 'Top Oversight' },
    { name: 'moderator', pk: 'moderator_id', count: moderators.length, role: 'Ops Management' },
    { name: 'attacker', pk: 'attacker_id', count: attackers.length, role: 'Attack Lab' },
    { name: 'defender', pk: 'defender_id', count: defenders.length, role: 'Defense Lab' },
    { name: 'challenges', pk: 'challenge_id', count: challenges.length, role: 'DVWA Scenarios' },
    { name: 'attempts', pk: 'attempt_id', count: attempts.length, role: 'Exploit Logs' },
    { name: 'defenses', pk: 'defense_id', count: defenses.length, role: 'Mitigation Logs' },
    { name: 'alerts', pk: 'alert_id', count: alerts.length, role: 'Detection Logs' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cyan-accent bg-cyan-dim px-2 py-0.5 rounded-sharp border border-cyan-accent/20 uppercase font-semibold">
              ADMIN SUBSYSTEM
            </span>
            <span className="text-xs font-mono text-zinc-500">
              OVERSIGHT LEVEL 0 // SCHEMA ENFORCED
            </span>
          </div>
          <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
            Moderator Oversight & Schema Diagnostics
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Admin maintains relational foreign key oversight strictly over `moderator` accounts and platform schema telemetry.
          </p>
        </div>

        <button
          onClick={() => {
            soundEngine.playBlip();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-accent hover:bg-cyan-hover text-bg-main font-mono font-bold text-xs rounded-panel transition-all shadow-[0_0_14px_rgba(0,229,204,0.25)]"
        >
          <Plus className="w-4 h-4" />
          <span>PROVISION MODERATOR</span>
        </button>
      </div>

      {/* Aggregate Platform Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Moderator Operators</span>
            <Users className="w-3.5 h-3.5 text-cyan-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {moderators.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            FK Linked via `admin_id`
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Total Attackers</span>
            <Shield className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {attackers.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Managed by moderators
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Total Defenders</span>
            <Shield className="w-3.5 h-3.5 text-status-green" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {defenders.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Managed by moderators
          </div>
        </div>

        <div className="bg-bg-panel border border-hairline p-3.5 rounded-panel">
          <div className="text-[11px] font-mono text-zinc-500 uppercase flex items-center justify-between">
            <span>Hosted Challenges</span>
            <Layers className="w-3.5 h-3.5 text-cyan-accent" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {challenges.length}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-1">
            Active DVWA Scenarios
          </div>
        </div>
      </div>

      {/* 8-Table Relational Schema Telemetry Grid */}
      <div className="bg-bg-panel border border-hairline rounded-panel p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-accent" />
            <h3 className="text-xs font-bold font-mono text-zinc-100">
              Locked 8-Table Database Schema Diagnostic
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-greenDim border border-status-green/30 text-status-green">
            100% SCHEMA COMPLIANT
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {databaseTables.map(t => (
            <div key={t.name} className="p-2.5 bg-bg-main border border-hairline rounded-sharp text-xs font-mono">
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span className="uppercase">{t.name}</span>
                <span className="text-cyan-accent font-bold">PK: {t.pk}</span>
              </div>
              <div className="text-base font-bold text-zinc-100 mt-1">
                {t.count} <span className="text-[10px] font-normal text-zinc-500">rows</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {t.role}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moderator Oversight Table */}
      <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
        <div className="px-4 py-3 bg-bg-panelAlt/90 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-accent" />
            <span className="text-xs font-mono font-bold text-zinc-200">
              Registered Moderator Operators (`moderator` table)
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            FK Linked: `admin_id = {adminList[0]?.admin_id}`
          </span>
        </div>

        {/* Table Columns */}
        <div className="grid grid-cols-12 px-4 py-2.5 border-b border-hairline text-[11px] font-mono text-zinc-400 uppercase tracking-wider bg-bg-main/50">
          <div className="col-span-1">ID</div>
          <div className="col-span-3">Operator Username</div>
          <div className="col-span-3">Email Address</div>
          <div className="col-span-3">Managed Accounts & Assets</div>
          <div className="col-span-2 text-right">Registered At</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-hairline">
          {moderators.map(mod => {
            const modAttackers = attackers.filter(a => a.moderator_id === mod.moderator_id).length;
            const modDefenders = defenders.filter(d => d.moderator_id === mod.moderator_id).length;
            const modChallenges = challenges.filter(c => c.moderator_id === mod.moderator_id).length;

            return (
              <div
                key={mod.moderator_id}
                className="grid grid-cols-12 px-4 py-3 items-center hover:bg-bg-subtle/40 transition-colors text-xs font-mono"
              >
                <div className="col-span-1 text-cyan-accent font-bold">
                  #{mod.moderator_id}
                </div>

                <div className="col-span-3">
                  <div className="text-zinc-100 font-semibold">{mod.username}</div>
                  <div className="text-[10px] text-zinc-500">Role: Moderator Operator</div>
                </div>

                <div className="col-span-3 text-zinc-400 text-[11px] truncate">
                  {mod.email}
                </div>

                <div className="col-span-3 flex items-center gap-3 text-[11px]">
                  <span className="text-zinc-400">
                    <strong className="text-zinc-200">{modAttackers}</strong> Atk
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">
                    <strong className="text-zinc-200">{modDefenders}</strong> Def
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">
                    <strong className="text-zinc-200">{modChallenges}</strong> Chl
                  </span>
                </div>

                <div className="col-span-2 text-right text-zinc-500 text-[11px]">
                  {mod.created_at.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provision Moderator Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-bg-panel border border-border-subtle rounded-panel shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-accent" />
                <h3 className="text-sm font-bold font-mono text-zinc-100">
                  Provision New Moderator Account
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddModerator} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  MODERATOR USERNAME
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. mod_overwatch"
                  required
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  OFFICIAL EMAIL
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. overwatch@cyberforge.local"
                  required
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-bg-main border border-hairline rounded text-[11px] font-mono text-zinc-500">
                Notice: Account is inserted into `moderator` table with foreign key `admin_id = 1`.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-hairline rounded-panel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-mono font-bold bg-cyan-accent hover:bg-cyan-hover text-bg-main rounded-panel transition-colors"
                >
                  Create Moderator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
