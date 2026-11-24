import React, { useState } from 'react';
import { Shield, Users, UserCheck, Crosshair, Server, Database, AlertCircle, Plus, LogOut, CheckCircle2, Key } from 'lucide-react';

export default function AdminDashboard({ email = 'admin@cyberforge.dev', onSignOut }) {
  const [moderators, setModerators] = useState([
    { id: 1, username: 'mod_alex', email: 'alex@cyberforge.dev', cohort: 'Cohort Alpha 2026', created_at: '2026-08-14' },
    { id: 2, username: 'mod_sarah', email: 'sarah@cyberforge.dev', cohort: 'Red Team Labs', created_at: '2026-09-02' },
    { id: 3, username: 'mod_vikram', email: 'vikram@cyberforge.dev', cohort: 'Defensive Ops', created_at: '2026-10-19' }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newCohort, setNewCohort] = useState('');

  const handleCreateModerator = (e) => {
    e.preventDefault();
    if (!newUsername || !newEmail) return;

    const newMod = {
      id: moderators.length + 1,
      username: newUsername,
      email: newEmail,
      cohort: newCohort || 'General Training',
      created_at: new Date().toISOString().split('T')[0]
    };

    setModerators([...moderators, newMod]);
    setNewUsername('');
    setNewEmail('');
    setNewPassword('');
    setNewCohort('');
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 font-sans p-6 sm:p-10">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-purple-400 uppercase">
                ADMIN CONSOLE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                ROOT PRIVILEGES
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
              CyberForge Platform Administration
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-zinc-400">{email}</div>
            <div className="text-[10px] font-mono text-emerald-400">SESSION: ACTIVE</div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0c0f18] border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider">Moderators</span>
              <UserCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{moderators.length}</div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">Supervising cohorts</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0f18] border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider">Attackers</span>
              <Crosshair className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">14</div>
            <div className="text-[11px] font-mono text-red-400/80 mt-1">48 exploits logged</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0f18] border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider">Defenders</span>
              <Shield className="w-4 h-4 text-[#2ab7ff]" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">11</div>
            <div className="text-[11px] font-mono text-[#2ab7ff]/80 mt-1">32 defenses verified</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c0f18] border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider">Challenges</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">12</div>
            <div className="text-[11px] font-mono text-emerald-400/80 mt-1">DVWA Active Target</div>
          </div>
        </div>

        {/* Infrastructure & Target Status */}
        <div className="p-6 rounded-2xl bg-[#0c0f18] border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-300">
              Infrastructure & Target Status
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              DOCKER STACK HEALTHY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#07080f] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-zinc-400">app_db (PostgreSQL 16)</div>
                <div className="text-xs font-bold text-white mt-0.5">Port 5432 // cyberforge</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                CONNECTED
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#07080f] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-zinc-400">dvwa_db (MariaDB 10.4)</div>
                <div className="text-xs font-bold text-white mt-0.5">Internal Port 3306 // dvwa</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                RUNNING
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#07080f] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-zinc-400">Target App (DVWA)</div>
                <div className="text-xs font-bold text-white mt-0.5">http://localhost:8081</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                REACHABLE
              </span>
            </div>
          </div>
        </div>

        {/* Moderator Management Section */}
        <div className="p-6 rounded-2xl bg-[#0c0f18] border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Platform Moderator Accounts</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Moderators manage day-to-day Attacker and Defender cohorts and the challenge list.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.35)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Moderator</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400">
                  <th className="pb-3 font-semibold">ID</th>
                  <th className="pb-3 font-semibold">USERNAME</th>
                  <th className="pb-3 font-semibold">EMAIL</th>
                  <th className="pb-3 font-semibold">ASSIGNED COHORT</th>
                  <th className="pb-3 font-semibold">REGISTERED</th>
                  <th className="pb-3 font-semibold text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {moderators.map((mod) => (
                  <tr key={mod.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 text-zinc-500">#{mod.id}</td>
                    <td className="py-3 font-bold text-white">{mod.username}</td>
                    <td className="py-3 text-zinc-300">{mod.email}</td>
                    <td className="py-3 text-purple-300">{mod.cohort}</td>
                    <td className="py-3 text-zinc-500">{mod.created_at}</td>
                    <td className="py-3 text-right">
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Moderator Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0c0f18] border border-purple-500/40 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Create Moderator Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateModerator} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="mod_john"
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@cyberforge.dev"
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">Assigned Cohort / Laboratory</label>
                <input
                  type="text"
                  value={newCohort}
                  onChange={(e) => setNewCohort(e.target.value)}
                  placeholder="e.g. Offensive Lab Section 3"
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-mono text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold"
                >
                  Confirm & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
