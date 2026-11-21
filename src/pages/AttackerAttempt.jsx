import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { soundEngine } from '../utils/audio';
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
  ExternalLink,
  Binary,
  Layers,
  Cpu,
  ShieldAlert,
  Flame,
  Globe
} from 'lucide-react';
import { getDifficultyBadgeColor, getDifficultyPoints } from '../data/mockData';

export default function AttackerAttempt({ challenge, onBack }) {
  const { submitAttempt, attempts, currentUser } = useApp();
  const [payload, setPayload] = useState(challenge.reference_payload || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStage, setExecutionStage] = useState(0); // 0 to 5
  const [responseTab, setResponseTab] = useState('stdout'); // 'stdout' | 'hex' | 'headers'
  const [executionResult, setExecutionResult] = useState(null);

  const challengeAttempts = attempts.filter(
    a => a.challenge_id === challenge.challenge_id && a.attacker_id === (currentUser?.attacker_id || 201)
  );

  // Payload Quick Transformations
  const handleUrlEncode = () => {
    soundEngine.playKeyClick();
    setPayload(prev => encodeURIComponent(prev));
  };

  const handleBase64Encode = () => {
    soundEngine.playKeyClick();
    try {
      setPayload(prev => btoa(prev));
    } catch (e) {
      // fallback
    }
  };

  const handleHexEscape = () => {
    soundEngine.playKeyClick();
    const hex = payload.split('').map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    setPayload(hex);
  };

  const handleResetPayload = () => {
    soundEngine.playKeyClick();
    setPayload(challenge.reference_payload);
  };

  // Convert string to hex dump representation
  const generateHexDump = (str) => {
    const lines = [];
    const bytes = Array.from(new TextEncoder().encode(str));
    for (let i = 0; i < bytes.length; i += 16) {
      const slice = bytes.slice(i, i + 16);
      const hexPart = slice.map(b => b.toString(16).padStart(2, '0')).join(' ');
      const asciiPart = slice.map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
      const offset = i.toString(16).padStart(4, '0');
      lines.push(`${offset}  ${hexPart.padEnd(48, ' ')}  |${asciiPart}|`);
    }
    return lines.join('\n');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payload.trim() || isExecuting) return;

    soundEngine.playLaunch();
    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionStage(1);

    // 5-Stage Penetration Pipeline
    setTimeout(() => setExecutionStage(2), 200);
    setTimeout(() => setExecutionStage(3), 450);
    setTimeout(() => setExecutionStage(4), 700);

    setTimeout(() => {
      setExecutionStage(5);
      const result = submitAttempt(challenge.challenge_id, payload);
      setIsExecuting(false);

      const isBreached = result.status === 'SUCCESS';
      if (isBreached) {
        soundEngine.playSuccess();
      } else {
        soundEngine.playFailure();
      }

      const responseBody = isBreached
        ? `[+] EXPLOIT SUCCESSFUL: Remote vulnerability exploited.\n` +
          `[+] Target: http://localhost:8081${challenge.dvwa_page_ref}\n` +
          `[+] Injection Vector: ${challenge.vulnerability_type}\n` +
          `[+] Server Output:\n` +
          `    root:x:0:0:root:/root:/bin/bash\n` +
          `    www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n` +
          `    FLAG{CYBERFORGE_BREACH_${challenge.challenge_id}_VERIFIED}\n` +
          `[+] Attempt logged to \`attempts\` table. Score: +${result.score_earned} PTS.`
        : `[-] EXPLOIT FAILED: Remote server blocked execution or input sanitized.\n` +
          `[-] Target: http://localhost:8081${challenge.dvwa_page_ref}\n` +
          `[-] HTTP 403 Forbidden: WAF input inspection rejected payload pattern.\n` +
          `[-] Attempt logged to \`attempts\` table with status FAILED.`;

      setExecutionResult({
        statusCode: isBreached ? 200 : 403,
        statusText: isBreached ? '200 OK [TARGET BREACHED]' : '403 FORBIDDEN [PAYLOAD BLOCKED]',
        rawOutput: responseBody,
        hexDump: generateHexDump(responseBody),
        headers: {
          'HTTP/1.1': isBreached ? '200 OK' : '403 Forbidden',
          'Date': new Date().toUTCString(),
          'Server': 'Apache/2.4.54 (Debian)',
          'X-Powered-By': 'PHP/7.4.30',
          'Content-Type': 'text/html; charset=UTF-8',
          'Set-Cookie': 'security=low; path=/',
          'X-DVWA-Endpoint': challenge.dvwa_page_ref,
        }
      });
    }, 1000);
  };

  const points = getDifficultyPoints(challenge.difficulty);
  const stages = ['Idle', 'TCP Connect', 'Inject Probe', 'WAF Analysis', 'Exec Payload', 'Flag Captured'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <button
          onClick={() => {
            soundEngine.playBlip();
            onBack();
          }}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-cyan-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO CHALLENGES FEED</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sharp border ${getDifficultyBadgeColor(challenge.difficulty)}`}>
            {challenge.difficulty}
          </span>
          <span className="text-xs font-mono text-cyan-accent font-bold">
            +{points} PTS
          </span>
        </div>
      </div>

      {/* Target Spec HUD Card */}
      <div className="bg-bg-panel border border-hairline p-4 rounded-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-cyan-accent/5 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              <span>CVE VECTOR: #{challenge.challenge_id}</span>
              <span>•</span>
              <span className="text-cyan-accent font-semibold">MODERATOR FK #{challenge.moderator_id}</span>
            </div>
            <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1 flex items-center gap-2">
              <span>{challenge.title}</span>
              <span className="text-xs font-mono font-normal text-zinc-400 bg-bg-main px-2 py-0.5 rounded border border-hairline">
                {challenge.vulnerability_type}
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-2">
              <Globe className="w-3.5 h-3.5 text-cyan-accent" />
              <span>Target: <strong className="text-zinc-200">http://localhost:8081{challenge.dvwa_page_ref}</strong></span>
            </div>
          </div>

          <a
            href={`http://localhost:8081${challenge.dvwa_page_ref}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-main hover:bg-bg-subtle border border-hairline text-zinc-300 font-mono text-xs rounded-panel transition-colors self-start sm:self-auto"
          >
            <span>Launch in DVWA</span>
            <ExternalLink className="w-3 h-3 text-cyan-accent" />
          </a>
        </div>
      </div>

      {/* 5-Stage Penetration Pipeline Monitor */}
      <div className="bg-bg-panel border border-hairline p-3 rounded-panel">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
          <span className="flex items-center gap-1.5 font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-accent" />
            <span>5-Stage Penetration Pipeline</span>
          </span>
          <span className="text-[10px] text-zinc-500">
            {isExecuting ? `ACTIVE STAGE: ${stages[executionStage]}` : 'READY FOR PAYLOAD DISPATCH'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 text-[10px] font-mono">
          {stages.slice(1).map((stg, idx) => {
            const stepNum = idx + 1;
            const isDone = executionStage >= stepNum;
            const isCurrent = executionStage === stepNum && isExecuting;

            return (
              <div
                key={stg}
                className={`p-2 rounded-sharp border text-center transition-all ${
                  isCurrent
                    ? 'border-cyan-accent bg-cyan-dim text-cyan-accent font-bold animate-pulse'
                    : isDone
                    ? 'border-status-green/50 bg-status-greenDim text-status-green font-semibold'
                    : 'border-hairline bg-bg-main text-zinc-600'
                }`}
              >
                <div className="text-[9px] opacity-70">STEP 0{stepNum}</div>
                <div className="truncate">{stg}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Workbench Editor + Multi-Tab Response Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Exploit Code Workbench */}
        <div className="space-y-4">
          <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
            {/* Workbench Top Toolbar */}
            <div className="px-4 py-2.5 bg-bg-panelAlt/90 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-accent" />
                <span className="text-xs font-mono font-bold text-zinc-200">
                  Interactive Exploit Workbench
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {payload.length} chars • {new TextEncoder().encode(payload).length} bytes
              </span>
            </div>

            {/* Quick Encoders Toolbar */}
            <div className="px-4 py-1.5 bg-bg-main border-b border-hairline flex items-center justify-between text-[10px] font-mono overflow-x-auto">
              <span className="text-zinc-500 font-bold shrink-0 mr-2">ENCODERS:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUrlEncode}
                  className="px-2 py-0.5 bg-bg-subtle hover:bg-bg-panel border border-hairline hover:border-cyan-accent text-zinc-300 hover:text-cyan-accent rounded transition-colors"
                >
                  URL Encode
                </button>
                <button
                  type="button"
                  onClick={handleBase64Encode}
                  className="px-2 py-0.5 bg-bg-subtle hover:bg-bg-panel border border-hairline hover:border-cyan-accent text-zinc-300 hover:text-cyan-accent rounded transition-colors"
                >
                  Base64
                </button>
                <button
                  type="button"
                  onClick={handleHexEscape}
                  className="px-2 py-0.5 bg-bg-subtle hover:bg-bg-panel border border-hairline hover:border-cyan-accent text-zinc-300 hover:text-cyan-accent rounded transition-colors"
                >
                  Hex \\x
                </button>
                <button
                  type="button"
                  onClick={handleResetPayload}
                  className="px-2 py-0.5 bg-bg-subtle hover:bg-bg-panel border border-hairline text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Editor Textarea */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-2">
                  TARGET INJECTION VECTOR STRING:
                </label>
                <div className="relative">
                  <textarea
                    rows={6}
                    value={payload}
                    onChange={(e) => {
                      soundEngine.playKeyClick();
                      setPayload(e.target.value);
                    }}
                    placeholder="Enter SQL injection fragment, XSS tag, traversal sequence, or command separator..."
                    className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel p-3 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Preset Payload Chips */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-500">
                  Target presets (DVWA compliant exploits):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    challenge.reference_payload,
                    "' OR '1'='1' -- -",
                    "<script>alert(document.cookie)</script>",
                    "127.0.0.1; whoami",
                    "../../../../etc/passwd"
                  ].filter(Boolean).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyClick();
                        setPayload(p);
                      }}
                      className="px-2 py-1 bg-bg-main hover:bg-bg-subtle border border-hairline text-zinc-400 hover:text-cyan-accent font-mono text-[10px] rounded truncate max-w-xs transition-colors"
                      title={p}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispatch Action Button */}
              <button
                type="submit"
                disabled={isExecuting}
                className="w-full py-2.5 px-4 bg-cyan-accent hover:bg-cyan-hover text-bg-main font-mono font-bold text-xs rounded-panel flex items-center justify-center gap-2 transition-all shadow-[0_0_16px_rgba(0,229,204,0.3)] disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-bg-main border-t-transparent rounded-full animate-spin" />
                    <span>LAUNCHING EXPLOIT TO DVWA...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>EXECUTE PAYLOAD AGAINST TARGET</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Historical Attempts Log for this challenge */}
          <div className="bg-bg-panel border border-hairline rounded-panel overflow-hidden">
            <div className="px-4 py-2 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-mono font-bold text-zinc-300">
                  Attempt Log Records (`attempts` table)
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">{challengeAttempts.length} logged</span>
            </div>

            <div className="divide-y divide-hairline max-h-40 overflow-y-auto">
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
                      <span className="text-zinc-200 truncate max-w-xs">{a.payload_used}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 text-[10px]">
                      <span className="text-cyan-accent font-semibold">+{a.score_earned} pts</span>
                      <span>{a.timestamp.split(' ')[1]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Pro Multi-Tab Response Console */}
        <div className="bg-bg-panel border border-hairline rounded-panel flex flex-col h-full overflow-hidden min-h-[460px]">
          {/* Response Console Tab Bar */}
          <div className="px-4 py-2 bg-bg-panelAlt/90 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setResponseTab('stdout')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  responseTab === 'stdout'
                    ? 'bg-cyan-accent text-bg-main font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Stdout Stream
              </button>
              <button
                onClick={() => setResponseTab('hex')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  responseTab === 'hex'
                    ? 'bg-cyan-accent text-bg-main font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Hex Dump
              </button>
              <button
                onClick={() => setResponseTab('headers')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  responseTab === 'headers'
                    ? 'bg-cyan-accent text-bg-main font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                HTTP Headers
              </button>
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

          {/* Console Content Window */}
          <div className="p-4 flex-1 font-mono text-xs overflow-y-auto bg-bg-main text-zinc-300">
            {isExecuting ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-3">
                <div className="w-8 h-8 border-2 border-cyan-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-zinc-300">Step {executionStage}/5: {stages[executionStage]}...</span>
                <span className="text-[10px] text-zinc-500">Communicating with DVWA container on port 8081</span>
              </div>
            ) : executionResult ? (
              responseTab === 'stdout' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pb-1 border-b border-hairline">
                    <span>REMOTE HOST STDOUT:</span>
                    <span>LENGTH: {executionResult.rawOutput.length} BYTES</span>
                  </div>
                  <pre className="p-3 bg-black/80 border border-hairline rounded text-[11px] text-zinc-200 whitespace-pre-wrap leading-relaxed font-mono">
                    {executionResult.rawOutput}
                  </pre>
                </div>
              ) : responseTab === 'hex' ? (
                <div className="space-y-3">
                  <div className="text-[10px] text-zinc-500 pb-1 border-b border-hairline">
                    HEXADECIMAL PAYLOAD DUMP:
                  </div>
                  <pre className="p-3 bg-black/80 border border-hairline rounded text-[10px] text-cyan-accent/90 whitespace-pre-wrap leading-relaxed font-mono">
                    {executionResult.hexDump}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] text-zinc-500 pb-1 border-b border-hairline">
                    HTTP/1.1 PROTOCOL RESPONSE HEADERS:
                  </div>
                  <div className="p-3 bg-black/80 border border-hairline rounded text-[11px] space-y-1">
                    {Object.entries(executionResult.headers).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-cyan-accent font-bold">{k}:</span>{' '}
                        <span className="text-zinc-300">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-600 text-center space-y-2">
                <Terminal className="w-10 h-10 opacity-30 text-zinc-500" />
                <p className="text-xs font-semibold text-zinc-400">Response Console Ready</p>
                <p className="text-[11px] text-zinc-600 max-w-sm">
                  Select a test payload or preset and click execute to trigger the 5-stage exploit pipeline against the DVWA service.
                </p>
              </div>
            )}
          </div>

          {/* Console Bottom Bar */}
          <div className="px-4 py-2 border-t border-hairline bg-bg-panelAlt/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>SOCKET: ESTABLISHED (8081)</span>
            <span>DATA LOG: `attempts` TABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
