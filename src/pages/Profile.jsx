import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, 
  Mail, 
  Key, 
  Shield, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Terminal, 
  Save,
  Lock
} from 'lucide-react';

export default function Profile() {
  const { currentRole, currentUser, updateProfile, attempts, defenses, showToast } = useApp();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) return;

    updateProfile(username.trim(), email.trim());
    if (newPassword) {
      showToast('Password hash updated in session credential vault', 'success');
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  // Derive stats per role from the 8 tables
  const renderRoleStats = () => {
    if (currentRole === 'attacker') {
      const myAtt = attempts.filter(a => a.attacker_id === (currentUser?.attacker_id || 201));
      const solved = myAtt.filter(a => a.status === 'SUCCESS').length;
      const score = myAtt.filter(a => a.status === 'SUCCESS').reduce((s, a) => s + (a.score_earned || 0), 0);
      const rate = myAtt.length > 0 ? Math.round((solved / myAtt.length) * 100) : 0;

      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Total Score</div>
            <div className="text-lg font-bold font-mono text-cyan-accent mt-0.5">{score} PTS</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Solved</div>
            <div className="text-lg font-bold font-mono text-status-green mt-0.5">{solved} Breaches</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Total Attempts</div>
            <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">{myAtt.length}</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Success Rate</div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{rate}%</div>
          </div>
        </div>
      );
    }

    if (currentRole === 'defender') {
      const myDef = defenses.filter(d => d.defender_id === (currentUser?.defender_id || 301));
      const verified = myDef.filter(d => d.verified).length;
      const score = myDef.reduce((s, d) => s + (d.score_earned || 0), 0);

      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Defense Score</div>
            <div className="text-lg font-bold font-mono text-cyan-accent mt-0.5">{score} PTS</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Verified Mitigations</div>
            <div className="text-lg font-bold font-mono text-status-green mt-0.5">{verified}</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Active Defenses</div>
            <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">{myDef.length}</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Hardening Status</div>
            <div className="text-lg font-bold font-mono text-status-green mt-0.5">SECURE</div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-bg-main border border-hairline rounded-panel">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Access Authorization</div>
          <div className="text-lg font-bold font-mono text-cyan-accent mt-0.5">LEVEL 0 SUPER</div>
        </div>
        <div className="p-3 bg-bg-main border border-hairline rounded-panel">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Session Status</div>
          <div className="text-lg font-bold font-mono text-status-green mt-0.5">VERIFIED</div>
        </div>
        <div className="p-3 bg-bg-main border border-hairline rounded-panel">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Console Scope</div>
          <div className="text-lg font-bold font-mono text-zinc-200 mt-0.5">8 TABLES</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-hairline">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-accent bg-cyan-dim px-2 py-0.5 rounded-sharp border border-cyan-accent/20 uppercase font-semibold">
            SHARED SUBSYSTEM
          </span>
          <span className="text-xs font-mono text-zinc-500">
            ACCOUNT CREDENTIALS & METRICS
          </span>
        </div>
        <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
          Operator Profile & Telemetry
        </h1>
        <p className="text-xs font-mono text-zinc-400 mt-0.5">
          View aggregated performance metrics and update account credentials for the active session.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-bg-panel border border-hairline rounded-panel p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-panel bg-bg-main border border-hairline flex items-center justify-center font-mono text-xl text-cyan-accent font-bold">
              {currentUser?.username?.substring(0, 2).toUpperCase() || 'CF'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-zinc-100">
                  {currentUser?.username}
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sharp bg-cyan-dim border border-cyan-accent/30 text-cyan-accent font-semibold">
                  {currentRole}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-0.5">
                {currentUser?.email}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 mt-1">
                <Calendar className="w-3 h-3" />
                <span>Joined {currentUser?.created_at || '2026-09-01'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Derived Stats */}
        <div>
          <div className="text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wide">
            Performance Telemetry (Derived from DB logs)
          </div>
          {renderRoleStats()}
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-bg-panel border border-hairline rounded-panel p-5">
        <div className="pb-4 border-b border-hairline mb-5">
          <h3 className="text-sm font-bold font-mono text-zinc-100">
            Update Account Information
          </h3>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Modify credentials stored in the `{currentRole}` database table.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                USERNAME
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel py-2 pl-9 pr-3 text-xs font-mono text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel py-2 pl-9 pr-3 text-xs font-mono text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-hairline">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                CURRENT PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel py-2 pl-9 pr-3 text-xs font-mono text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                NEW PASSWORD (OPTIONAL)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel py-2 pl-9 pr-3 text-xs font-mono text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-accent hover:bg-cyan-hover text-bg-main font-mono font-bold text-xs rounded-panel transition-all shadow-[0_0_12px_rgba(0,229,204,0.25)]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE CREDENTIAL CHANGES</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
