import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  Terminal, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Server, 
  Code2, 
  History,
  Copy,
  ExternalLink
} from 'lucide-react';
import { getDifficultyBadgeColor, getDifficultyPoints } from '../data/mockData';

export default function AttackerAttempt({ challenge, onBack }) {
  const { submitAttempt, attempts, currentUser } = useApp();
  const [payload, setPayload] = useState(challenge.reference_payload || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // Filter attempt history for this challenge and attacker
  const challengeAttempts = attempts.filter(
    a => a.challenge_id === challenge.challenge_id && a.attacker_id === (currentUser?.attacker_id || 201)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payload.trim()) return;

    setIsExecuting(true);
    setExecutionResult(null);

    setTimeout(() => {
      const result = submitAttempt(challenge.challenge_id, payload);
      setIsExecuting(false);

      // Generate realistic simulated HTTP response
      const isBreached = result.status === 'SUCCESS';
      const responseData = {
        statusCode: isBreached ? 200 : 403,
        statusText: isBreached ? '200 OK [EXPLOIT EXECUTED]' : '403 FORBIDDEN [INPUT SANITIZED]',
        headers: {
          'Server': 'Apache/2.4.54 (Debian)',
          'X-Powered-By': 'PHP/7.4.30',
          'Content-Type': 'text/html; charset=UTF-8',
          'X-DVWA-Endpoint': challenge.dvwa_page_ref,
        },
        output: isBreached
          ? `[+] EXPLOIT SUCCESSFUL: Target returned valid execution payload response.\n` +
            `[+] Host response captured on ${challenge.dvwa_page_ref}\n` +
            `[+] Output snippet:\n` +
            `    root:x:0:0:root:/root:/bin/bash\n` +
            `    daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n` +
            `    www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n` +
            `[+] Status recorded: SUCCESS. Awarded +${result.score_earned} points.`
          : `[-] EXPLOIT FAILED: Remote server blocked execution or sanitized input string.\n` +
            `[-] HTTP 403 / Input verification rejected payload.\n` +
            `[-] Status recorded: FAILED. 0 points awarded.`
      };

      setExecutionResult(responseData);
    }, 600);
  };

  const points = getDifficultyPoints(challenge.difficulty);

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-cyan-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO CHALLENGES FEED</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sharp border ${getDifficultyBadgeColor(challenge.difficulty)}`}>
            {challenge.difficulty}
          </span>
          <span className="text-xs font-mono text-cyan-accent font-semibold">
            +{points} PTS
          </span>
        </div>
      </div>

      {/* Challenge Title Banner */}
      <div className="bg-bg-panel border border-hairline p-4 rounded-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              TARGET CHALLENGE ID: #{challenge.challenge_id} // MODERATOR ID: #{challenge.moderator_id}
            </div>
            <h1 className="text-xl font-bold font-sans text-zinc-100 mt-0.5">
              {challenge.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-zinc-400">
              <span className="text-cyan-accent font-medium">{challenge.vulnerability_type}</span>
              <span>•</span>
              <span className="text-zinc-500">Endpoint: {challenge.dvwa_page_ref}</span>
            </div>
          </div>

          <a
            href={`http://localhost:8081${challenge.dvwa_page_ref}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-main hover:bg-bg-subtle border border-hairline text-zinc-300 font-mono text-xs rounded-panel transition-colors self-start sm:self-auto"
          >
            <span>Inspect in DVWA</span>
            <ExternalLink className="w-3 h-3 text-cyan-accent" />
          </a>
        </div>
      </div>

      {/* Main Grid: Payload Editor + Response Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Payload Editor */}
        <div className="space-y-4">
          <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
            <div className="px-4 py-2.5 bg-bg-panelAlt/80 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-cyan-accent" />
                <span className="text-xs font-mono font-medium text-zinc-200">
                  Exploit Payload Editor
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                Logged to `attempts.payload_used`
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-2">
                  TARGET INJECTION VECTOR:
                </label>
                <div className="relative">
                  <textarea
                    rows={6}
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    placeholder="Enter SQLi, XSS script, command injection separator, or traversal string..."
                    className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel p-3 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Sample payload quick selector */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-500">
                  Quick injection presets (DVWA compliant):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    challenge.reference_payload,
                    "' OR '1'='1' --",
                    "<script>alert(1)</script>",
                    "127.0.0.1; whoami",
                    "../../../../etc/passwd"
                  ].filter(Boolean).slice(0, 3).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPayload(p)}
                      className="px-2 py-0.5 bg-bg-main hover:bg-bg-subtle border border-hairline text-zinc-400 hover:text-cyan-accent font-mono text-[10px] rounded truncate max-w-xs transition-colors"
                      title={p}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isExecuting}
                className="w-full py-2.5 px-4 bg-cyan-accent hover:bg-cyan-hover text-bg-main font-mono font-bold text-xs rounded-panel flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,229,204,0.2)] disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-bg-main border-t-transparent rounded-full animate-spin" />
                    <span>DISPATCHING EXPLOIT TO DVWA...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>SUBMIT PAYLOAD FOR EXECUTION</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Historical Attempts for this challenge */}
          <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
            <div className="px-4 py-2 border-b border-hairline flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-mono font-medium text-zinc-300">
                Attempt History ({challengeAttempts.length})
              </span>
            </div>

            <div className="divide-y divide-hairline max-h-48 overflow-y-auto">
              {challengeAttempts.length === 0 ? (
                <div className="p-3 text-center text-[11px] font-mono text-zinc-600">
                  No previous attempts recorded for this challenge.
                </div>
              ) : (
                challengeAttempts.map(a => (
                  <div key={a.attempt_id} className="p-2.5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      {a.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-status-green" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-status-red" />
                      )}
                      <span className="text-zinc-200 font-mono truncate max-w-xs">{a.payload_used}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 text-[10px]">
                      <span>+{a.score_earned} pts</span>
                      <span>{a.timestamp.split(' ')[1]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Response Console Panel */}
        <div className="bg-bg-panel border border-hairline rounded-panel flex flex-col h-full overflow-hidden min-h-[380px]">
          <div className="px-4 py-2.5 bg-bg-panelAlt/80 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-mono font-medium text-zinc-200">
                DVWA Server Response Console
              </span>
            </div>
            {executionResult && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sharp border ${
                executionResult.statusCode === 200 
                  ? 'border-status-green text-status-green bg-status-greenDim' 
                  : 'border-status-red text-status-red bg-status-redDim'
              }`}>
                {executionResult.statusText}
              </span>
            )}
          </div>

          <div className="p-4 flex-1 font-mono text-xs overflow-y-auto bg-bg-main/90 text-zinc-300">
            {isExecuting ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px]">Connecting to DVWA Bridge (localhost:8081)...</span>
              </div>
            ) : executionResult ? (
              <div className="space-y-4">
                {/* Headers */}
                <div className="p-2.5 bg-bg-panel border border-hairline rounded text-[11px] text-zinc-400 space-y-0.5">
                  <div className="text-cyan-accent font-semibold mb-1">HTTP RESPONSE HEADERS:</div>
                  {Object.entries(executionResult.headers).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-zinc-500">{k}:</span> {v}
                    </div>
                  ))}
                </div>

                {/* Server output body */}
                <div>
                  <div className="text-zinc-500 text-[10px] uppercase mb-1">Captured Stdout:</div>
                  <pre className="p-3 bg-black/60 border border-hairline rounded text-[11px] text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed">
                    {executionResult.output}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-600 text-center space-y-2">
                <Terminal className="w-8 h-8 opacity-40 text-zinc-500" />
                <p className="text-xs">Console Idle. Submit a payload to execute against the target.</p>
                <p className="text-[10px] text-zinc-600">Response output is generated dynamically and recorded to `attempts` table.</p>
              </div>
            )}
          </div>

          {/* Console footer */}
          <div className="px-4 py-2 border-t border-hairline bg-bg-main flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>SOCKET: TCP/HTTP</span>
            <span>TARGET PORT: 8081</span>
          </div>
        </div>
      </div>
    </div>
  );
}
