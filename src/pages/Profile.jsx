import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { soundEngine } from '../utils/audio';
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
  Lock,
  QrCode,
  Fingerprint,
  Radio,
  Cpu
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

    soundEngine.playSuccess();
    updateProfile(username.trim(), email.trim());
    if (newPassword) {
      showToast('Password hash updated in credential vault', 'success');
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  const renderRoleStats = () => {
    if (currentRole === 'attacker') {
      const myAtt = attempts.filter(a => a.attacker_id === (currentUser?.attacker_id || 201));
      const solved = myAtt.filter(a => a.status === 'SUCCESS').length;
      const score = myAtt.filter(a => a.status === 'SUCCESS').reduce((s, a) => s + (a.score_earned || 0), 0);
      const rate = myAtt.length > 0 ? Math.round((solved / myAtt.length) * 100) : 0;

      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Exploit Score</div>
            <div className="text-xl font-bold font-mono text-cyan-accent mt-0.5">{score} PTS</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Confirmed Breaches</div>
            <div className="text-xl font-bold font-mono text-status-green mt-0.5">{solved}</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Attempt Volume</div>
            <div className="text-xl font-bold font-mono text-zinc-200 mt-0.5">{myAtt.length}</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Penetration Rate</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{rate}%</div>
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
            <div className="text-xl font-bold font-mono text-cyan-accent mt-0.5">{score} PTS</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Verified Mitigations</div>
            <div className="text-xl font-bold font-mono text-status-green mt-0.5">{verified}</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Active Shields</div>
            <div className="text-xl font-bold font-mono text-zinc-200 mt-0.5">{myDef.length}</div>
          </div>
          <div className="p-3 bg-bg-main border border-hairline rounded-panel">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Security Posture</div>
            <div className="text-xl font-bold font-mono text-status-green mt-0.5">HARDENED</div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-bg-main border border-hairline rounded-panel">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Clearance Level</div>
          <div className="text-xl font-bold font-mono text-cyan-accent mt-0.5">LEVEL 0 SUPER</div>
        </div>
        <div className="p-3 bg-bg-main border border-hairline rounded-panel">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Cryptographic Token</div>
          <div className="text-xl font-bold font-mono text-status-green mt-0.5">VERIFIED</div>
        </div>
        <div className="p-3 bg-bg-main border border-hairline rounded-panel">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Relational Scope</div>
          <div className="text-xl font-bold font-mono text-zinc-200 mt-0.5">8 TABLES</div>
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
            CYBER OPERATOR DOSSIER
          </span>
          <span className="text-xs font-mono text-zinc-500">
            CRYPTOGRAPHIC IDENTITY & TELEMETRY
          </span>
        </div>
        <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
          Operator Profile & Clearance
        </h1>
        <p className="text-xs font-mono text-zinc-400 mt-0.5">
          View authenticated credentials and performance telemetry stored in the `{currentRole}` database table.
        </p>
      </div>

      {/* Cyber Dossier Identity Card */}
      <div className="bg-bg-panel border border-hairline rounded-panel p-5 space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-cyan-accent/5 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-panel bg-bg-main border border-hairline flex items-center justify-center font-mono text-2xl text-cyan-accent font-bold relative shadow-inner">
              {currentUser?.username?.substring(0, 2).toUpperCase() || 'CF'}
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-status-green ring-2 ring-bg-panel" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-zinc-100">
                  {currentUser?.username}
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sharp bg-cyan-dim border border-cyan-accent/30 text-cyan-accent font-semibold">
                  {currentRole} OPERATOR
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-0.5">
                {currentUser?.email}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 mt-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Enrolled: {currentUser?.created_at?.split(' ')[0] || '2026-09-01'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-cyan-accent">
                  <Fingerprint className="w-3 h-3" />
                  <span>FP: 0x9F4C...B210</span>
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">ACCESS CLEARANCE</div>
            <div className="text-xs font-mono font-bold text-status-green bg-status-greenDim px-2.5 py-1 rounded border border-status-green/30 mt-1">
              TOP SECRET // CTF-ACTIVE
            </div>
          </div>
        </div>

        {/* Derived Telemetry */}
        <div>
          <div className="text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wide">
            Operational Telemetry (Derived from Database Activity)
          </div>
          {renderRoleStats()}
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-bg-panel border border-hairline rounded-panel p-5">
        <div className="pb-4 border-b border-hairline mb-5">
          <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-accent" />
            <span>Update Account Credentials</span>
          </h3>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Modify credentials stored in the `{currentRole}` database table.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                OPERATOR IDENTIFIER (USERNAME)
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
                OFFICIAL EMAIL ADDRESS
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
                NEW ACCESS KEY / PASSWORD
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
              className="flex items-center gap-2 px-4 py-2 bg-cyan-accent hover:bg-cyan-hover text-bg-main font-mono font-bold text-xs rounded-panel transition-all shadow-[0_0_14px_rgba(0,229,204,0.25)]"
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
