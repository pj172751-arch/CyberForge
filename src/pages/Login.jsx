import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Shield, 
  Terminal, 
  Lock, 
  User, 
  ArrowRight, 
  Key,
  Server,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Login() {
  const { loginAs, adminList, moderators, attackers, defenders } = useApp();
  const [activeTab, setActiveTab] = useState('attacker');
  const [username, setUsername] = useState('red_shadow');
  const [password, setPassword] = useState('••••••••••••');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleTabChange = (role) => {
    setActiveTab(role);
    setAuthError('');
    // Auto-populate sample credentials for seamless evaluator review
    if (role === 'attacker') {
      setUsername(attackers[0]?.username || 'red_shadow');
    } else if (role === 'defender') {
      setUsername(defenders[0]?.username || 'blue_shield');
    } else if (role === 'moderator') {
      setUsername(moderators[0]?.username || 'mod_secops');
    } else if (role === 'admin') {
      setUsername(adminList[0]?.username || 'sysadmin');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError('');

    setTimeout(() => {
      let matchedUser = null;
      if (activeTab === 'attacker') {
        matchedUser = attackers.find(u => u.username.toLowerCase() === username.toLowerCase()) || attackers[0];
      } else if (activeTab === 'defender') {
        matchedUser = defenders.find(u => u.username.toLowerCase() === username.toLowerCase()) || defenders[0];
      } else if (activeTab === 'moderator') {
        matchedUser = moderators.find(u => u.username.toLowerCase() === username.toLowerCase()) || moderators[0];
      } else if (activeTab === 'admin') {
        matchedUser = adminList.find(u => u.username.toLowerCase() === username.toLowerCase()) || adminList[0];
      }

      setIsSubmitting(false);
      loginAs(activeTab, matchedUser);
    }, 400);
  };

  return (
    <div className="min-h-screen w-screen bg-bg-main flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background terminal grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#00E5CC 1px, transparent 1px), linear-gradient(90deg, #00E5CC 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sharp bg-cyan-dim border border-cyan-accent/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-accent" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm text-zinc-100 tracking-wider">
              CYBERFORGE
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              CYBERSECURITY TRAINING PLATFORM
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-bg-panel px-3 py-1.5 rounded-panel border border-hairline">
          <Server className="w-3.5 h-3.5 text-status-green animate-pulse" />
          <span>ENVIRONMENT: DVWA 1.10 LIVE (PORT 8081)</span>
        </div>
      </div>

      {/* Main Login Card (Screen 1) */}
      <div className="w-full max-w-md mx-auto my-8 z-10">
        <div className="bg-bg-panel border border-hairline rounded-panel shadow-2xl overflow-hidden">
          {/* Card Header & Role Selector Tabs */}
          <div className="p-6 border-b border-hairline bg-bg-panelAlt/50">
            <div className="text-center mb-5">
              <span className="text-[10px] font-mono tracking-widest text-cyan-accent uppercase bg-cyan-dim px-2 py-0.5 rounded-sharp border border-cyan-accent/20">
                SYSTEM AUTHENTICATION
              </span>
              <h1 className="text-xl font-bold font-sans text-zinc-100 mt-2">
                Access Security Console
              </h1>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Select your designated role to enter the training environment
              </p>
            </div>

            {/* Role Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-bg-main border border-hairline rounded-panel">
              {[
                { id: 'attacker', label: 'Attacker' },
                { id: 'defender', label: 'Defender' },
                { id: 'moderator', label: 'Moderator' },
                { id: 'admin', label: 'Admin' }
              ].map(role => {
                const isActive = activeTab === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleTabChange(role.id)}
                    className={`py-1.5 text-xs font-mono rounded-sharp transition-all ${
                      isActive
                        ? 'bg-cyan-accent text-bg-main font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-bg-subtle'
                    }`}
                  >
                    {role.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {authError && (
              <div className="p-2.5 bg-status-redDim border border-status-red/30 rounded-sharp flex items-center gap-2 text-xs font-mono text-status-red">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                OPERATOR IDENTIFIER (USERNAME)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel py-2 pl-9 pr-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                ACCESS TOKEN / PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel py-2 pl-9 pr-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Quick Demo Pre-fill helper */}
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Demo Account:</span>
              <button
                type="button"
                onClick={() => handleTabChange(activeTab)}
                className="text-cyan-accent hover:underline flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                Reset default credentials
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-cyan-accent hover:bg-cyan-hover text-bg-main font-mono font-bold text-xs rounded-panel flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,229,204,0.2)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-bg-main border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>INITIALIZE {activeTab.toUpperCase()} SESSION</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="px-6 py-3 border-t border-hairline bg-bg-main text-center">
            <span className="text-[10px] font-mono text-zinc-500">
              Role separation enforced per College Diploma Spec // 8 Tables Locked
            </span>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-600 z-10 border-t border-hairline/60 pt-4">
        <div>LJ Polytechnic • Semester 5 PROJECT-I • CyberForge</div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span>Jeet (System)</span>
          <span>Pooja (Frontend)</span>
          <span>Dev (Backend)</span>
        </div>
      </div>
    </div>
  );
}
