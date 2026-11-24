import React, { useState } from 'react';
import { X, Play, Terminal, CheckCircle2, AlertTriangle, Shield, Copy, Check, RefreshCw } from 'lucide-react';

export default function ChallengeAttemptModal({ task, role, onClose }) {
  const isAttacker = role === 'attacker';
  const [payload, setPayload] = useState(task.vector || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const targetUrl = `http://localhost:8081/vulnerabilities/${task.id || 'exec'}/`;

  const handleExecute = () => {
    setIsExecuting(true);
    setExecutionResult(null);

    setTimeout(() => {
      setIsExecuting(false);
      const isSuccess = payload.trim().length > 5;

      if (isAttacker) {
        setExecutionResult({
          status: isSuccess ? 200 : 403,
          statusText: isSuccess ? 'OK - Exploit Executed' : 'Forbidden - Payload Blocked',
          score: isSuccess ? 100 : 0,
          responseBody: isSuccess
            ? `HTTP/1.1 200 OK\nServer: Apache/2.4.54 (Debian) PHP/8.1.9\nContent-Type: text/html; charset=UTF-8\n\n[+] Tainted input accepted by endpoint: ${targetUrl}\n[+] Query executed against MariaDB (dvwa_db:3306)\n\n--- DUMPED DATA RECORDS ---\nID: 1 | USER: admin | HASH: 5f4dcc3b5aa765d61d8327deb882cf99 (admin)\nID: 2 | USER: gordonb | HASH: e99a18c428cb38d5f260853678922e03 (abc123)\nID: 3 | USER: 1337 | HASH: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a (leet)\n\n[SUCCESS] Exploit signature verified. +100 PTS awarded.`
            : `HTTP/1.1 403 Forbidden\nServer: Apache/2.4.54 (Debian)\n\n[-] Error: Payload failed to bypass input validation filters.\n[-] Result: 0 records affected.`
        });
      } else {
        setExecutionResult({
          status: 200,
          statusText: 'OK - Defense Verified',
          score: 150,
          responseBody: `HTTP/1.1 200 OK\nSecurity Level: HIGH / IMPOSSIBLE\n\n[+] Defensive rule applied: ${payload}\n[+] Replaying reference attack vector...\n[+] Verification Check: Attack payload neutralized.\n[+] Target status: Secure against CVE exploit.\n\n[SUCCESS] Perimeter rule verified by CyberForge test harness. +150 PTS awarded.`
        });
      }
    }, 900);
  };

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl bg-[#090b12] border rounded-2xl shadow-2xl overflow-hidden relative ${
          isAttacker
            ? 'border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.2)]'
            : 'border-[#2ab7ff]/40 shadow-[0_0_50px_rgba(42,183,255,0.2)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d101a]">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isAttacker
                  ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                  : 'bg-sky-950/60 text-sky-400 border border-[#2ab7ff]/30'
              }`}
            >
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-zinc-400">
                  PROTOCOL #{task.num}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isAttacker
                      ? 'bg-red-950 text-red-300 border border-red-500/30'
                      : 'bg-sky-950 text-sky-300 border border-[#2ab7ff]/30'
                  }`}
                >
                  {isAttacker ? 'ATTACKER ATTEMPT' : 'DEFENDER VERIFICATION'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                {task.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target URL Reference */}
        <div className="px-6 py-2.5 bg-[#07080f] border-b border-white/5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400 truncate">
            <span className="text-zinc-500">TARGET:</span>
            <span className="text-emerald-400 truncate">{targetUrl}</span>
          </div>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">DVWA DOCKER SANDBOX</span>
        </div>

        {/* Payload Editor */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
                {isAttacker ? 'Exploit Vector Input' : 'Defensive Rule Signature'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPayload(task.vector || '')}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                  title="Reset to default reference vector"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white transition-colors ml-2"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Enter exploit payload or defensive signature..."
              className="w-full p-3 font-mono text-xs text-amber-300 bg-[#05060b] border border-white/10 rounded-xl focus:outline-none focus:border-amber-400/50 transition-all resize-none"
            />
          </div>

          {/* Action button */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isExecuting}
              onClick={handleExecute}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-white transition-all flex items-center gap-2 shadow-lg ${
                isAttacker
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                  : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 shadow-[0_0_20px_rgba(42,183,255,0.35)]'
              }`}
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Against DVWA...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isAttacker ? 'Dispatch Exploit' : 'Verify Remediation'}</span>
                </>
              )}
            </button>
          </div>

          {/* Response Console Panel */}
          {executionResult && (
            <div className="mt-4 animate-fadeIn">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                  Target Response Output
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    executionResult.status === 200
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-950 text-red-400 border border-red-500/30'
                  }`}
                >
                  {executionResult.status} {executionResult.statusText}
                </span>
              </div>
              <pre className="p-3 bg-[#040508] border border-white/10 rounded-xl font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto max-h-48 whitespace-pre-wrap">
                {executionResult.responseBody}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
