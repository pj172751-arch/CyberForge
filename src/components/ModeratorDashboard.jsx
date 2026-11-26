import React, { useState } from 'react';
import { Shield, AlertTriangle, Crosshair, Plus, LogOut, CheckCircle2, Clock, Filter, Terminal } from 'lucide-react';

const INITIAL_CHALLENGES = [
  { id: 1, title: 'Broken Login', vuln: 'Authentication Bypass', difficulty: 'Low', dvwa_page: 'vulnerabilities/brute/', payload: "' OR '1'='1" },
  { id: 2, title: 'Reflected XSS', vuln: 'Cross-Site Scripting', difficulty: 'Low', dvwa_page: 'vulnerabilities/xss_r/', payload: '<script>alert(1)</script>' },
  { id: 3, title: 'File Disclosure', vuln: 'Path Traversal', difficulty: 'Medium', dvwa_page: 'vulnerabilities/fi/?page=', payload: '../../../../etc/passwd' },
  { id: 4, title: 'Command Injection', vuln: 'OS Command Execution', difficulty: 'Medium', dvwa_page: 'vulnerabilities/exec/', payload: '127.0.0.1; cat /etc/passwd' },
  { id: 5, title: 'Privilege Escalation', vuln: 'Authorization Flaw', difficulty: 'High', dvwa_page: 'vulnerabilities/sqli_blind/', payload: '1 UNION SELECT 1, @@version' },
  { id: 6, title: 'Insecure Deserialization', vuln: 'Object Injection', difficulty: 'High', dvwa_page: 'vulnerabilities/unserialize/', payload: 'O:8:"Exploit":1:{s:4:"code";s:10:"phpinfo();";}' },
  { id: 7, title: 'Broken Access Control', vuln: 'IDOR & Role Elevation', difficulty: 'Medium', dvwa_page: 'vulnerabilities/weak_id/', payload: 'Cookie: dvwaSession=admin_token' },
  { id: 8, title: 'SSRF Explorer', vuln: 'Server-Side Request Forgery', difficulty: 'High', dvwa_page: 'vulnerabilities/ssrf/', payload: 'http://169.254.169.254/latest/meta-data/' },
  { id: 9, title: 'IDOR', vuln: 'Insecure Direct Object Ref', difficulty: 'Medium', dvwa_page: 'vulnerabilities/idor/?id=', payload: '?id=0 OR 1=1' },
  { id: 10, title: 'Web Shell Upload', vuln: 'Arbitrary File Upload', difficulty: 'High', dvwa_page: 'vulnerabilities/upload/', payload: 'polyglot-upload.php.jpg (MIME bypass sample)' },
  { id: 11, title: 'API Exploitation', vuln: 'Unauthenticated REST API', difficulty: 'Medium', dvwa_page: 'vulnerabilities/api/v1/', payload: 'GET /api/v1/users/export' },
  { id: 12, title: 'Final Breach', vuln: 'Full Chain Compromise', difficulty: 'Impossible', dvwa_page: 'vulnerabilities/audit/', payload: 'Chain: SQLi -> Shell Upload -> Root Execution' }
];

const INITIAL_ALERTS = [
  { id: 1, type: 'EXPLOIT_ATTEMPT', challenge: 'Command Injection', user: 'attacker_neo', status: 'SUCCESS', time: '2 mins ago', details: 'RCE executed: whoami -> www-data' },
  { id: 2, type: 'DEFENSE_APPLIED', challenge: 'Reflected XSS', user: 'defender_clara', status: 'VERIFIED', time: '8 mins ago', details: 'htmlspecialchars() filter enforced at security level HIGH' },
  { id: 3, type: 'EXPLOIT_ATTEMPT', challenge: 'Broken Login', user: 'attacker_zerocool', status: 'SUCCESS', time: '14 mins ago', details: 'SQL bypass string detected on login form' },
  { id: 4, type: 'DEFENSE_APPLIED', challenge: 'Command Injection', user: 'defender_marcus', status: 'VERIFIED', time: '25 mins ago', details: 'escapeshellcmd() sanitation applied and verified' },
  { id: 5, type: 'EXPLOIT_ATTEMPT', challenge: 'File Disclosure', user: 'attacker_phreak', status: 'BLOCKED', time: '38 mins ago', details: 'Null-byte traversal stopped by base path constraint' }
];

export default function ModeratorDashboard({ email = 'moderator@cyberforge.dev', onSignOut }) {
  const [challenges, setChallenges] = useState(INITIAL_CHALLENGES);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [vuln, setVuln] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [dvwaPage, setDvwaPage] = useState('');
  const [referencePayload, setReferencePayload] = useState('');

  const handleAddChallenge = (e) => {
    e.preventDefault();
    if (!title || !vuln) return;

    const newChallenge = {
      id: challenges.length + 1,
      title,
      vuln,
      difficulty,
      dvwa_page: dvwaPage || 'vulnerabilities/custom/',
      payload: referencePayload || "' OR 1=1 --"
    };

    setChallenges([...challenges, newChallenge]);
    setTitle('');
    setVuln('');
    setDifficulty('Medium');
    setDvwaPage('');
    setReferencePayload('');
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 font-sans p-6 sm:p-10">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                MODERATOR HUB
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                LAB SUPERVISOR
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
              Operations & Activity Audit
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-zinc-400">{email}</div>
            <div className="text-[10px] font-mono text-amber-400">COHORT SUPERVISOR</div>
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

      <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Challenges List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0c0f18] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white">Target Challenges ({challenges.length})</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Curated deliberate vulnerabilities verified against DVWA Docker sandbox.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Challenge</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400">
                    <th className="pb-3 font-semibold">ID</th>
                    <th className="pb-3 font-semibold">TITLE</th>
                    <th className="pb-3 font-semibold">VULNERABILITY</th>
                    <th className="pb-3 font-semibold">DIFFICULTY</th>
                    <th className="pb-3 font-semibold">DVWA ENDPOINT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {challenges.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 text-zinc-500">#{c.id < 10 ? `0${c.id}` : c.id}</td>
                      <td className="py-3 font-bold text-white">{c.title}</td>
                      <td className="py-3 text-zinc-300">{c.vuln}</td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            c.difficulty === 'Low'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : c.difficulty === 'Medium'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              : 'bg-red-950 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {c.difficulty}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-400 text-[11px] truncate max-w-[150px]">{c.dvwa_page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Live Alerts & Activity Stream */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0c0f18] border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Live Security Alerts</span>
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              {alerts.map((a) => (
                <div key={a.id} className="p-3.5 rounded-xl bg-[#07080f] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={`font-bold ${
                        a.type === 'EXPLOIT_ATTEMPT' ? 'text-red-400' : 'text-[#2ab7ff]'
                      }`}
                    >
                      {a.type}
                    </span>
                    <span className="text-zinc-500">{a.time}</span>
                  </div>

                  <div className="text-xs font-semibold text-white">
                    {a.challenge} • <span className="text-zinc-400">{a.user}</span>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-400 bg-black/40 p-2 rounded border border-white/5 leading-relaxed">
                    {a.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Challenge Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0c0f18] border border-amber-500/40 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Target Challenge</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChallenge} className="mt-4 space-y-4 font-mono">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken Authentication"
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Vulnerability Type</label>
                <input
                  type="text"
                  required
                  value={vuln}
                  onChange={(e) => setVuln(e.target.value)}
                  placeholder="e.g. Session Fixation"
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Impossible">Impossible</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">DVWA Page Endpoint</label>
                <input
                  type="text"
                  value={dvwaPage}
                  onChange={(e) => setDvwaPage(e.target.value)}
                  placeholder="vulnerabilities/auth/"
                  className="w-full h-10 px-3 rounded-xl bg-[#07080f] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Reference Exploit Payload</label>
                <textarea
                  rows={2}
                  value={referencePayload}
                  onChange={(e) => setReferencePayload(e.target.value)}
                  placeholder="' OR 1=1 --"
                  className="w-full p-2.5 rounded-xl bg-[#07080f] border border-white/10 text-xs text-amber-300 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
                >
                  Save Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
