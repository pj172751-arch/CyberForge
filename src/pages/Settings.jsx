import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Volume2, 
  ShieldAlert, 
  Clock, 
  Server, 
  RotateCcw, 
  Check, 
  AlertTriangle,
  Database
} from 'lucide-react';

export default function Settings() {
  const { showToast } = useApp();

  const [soundEffects, setSoundEffects] = useState(true);
  const [autoVerify, setAutoVerify] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30m');
  const [fontSize, setFontSize] = useState('12px');
  const [dvwaHost, setDvwaHost] = useState('http://localhost:8081');

  const handleSave = (e) => {
    e.preventDefault();
    showToast('Console preferences saved to local profile cache', 'success');
  };

  const handleResetData = () => {
    if (window.confirm('Reset simulated attempts and defenses back to factory initial state?')) {
      window.location.reload();
    }
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
            SYSTEM PREFERENCES & ENVIRONMENT
          </span>
        </div>
        <h1 className="text-xl font-bold font-sans text-zinc-100 mt-1">
          Console & Environment Settings
        </h1>
        <p className="text-xs font-mono text-zinc-400 mt-0.5">
          Configure security console interface behaviors, audio notifications, and test bridge endpoints.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Interface */}
        <div className="bg-bg-panel border border-hairline rounded-panel p-5 space-y-4">
          <div className="pb-3 border-b border-hairline flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                <Moon className="w-4 h-4 text-cyan-accent" />
                <span>Interface Theme & Styling</span>
              </h3>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Standardized per CyberForge locked design system (Section 7).
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-bg-main border border-cyan-accent/30 text-cyan-accent rounded-sharp">
              DARK TERMINAL LOCKED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-bg-main border border-hairline rounded-panel flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-zinc-200 font-semibold">Background Hex</div>
                <div className="text-[11px] font-mono text-zinc-500">Solid `#0A0A0B` (No gradients)</div>
              </div>
              <div className="w-6 h-6 rounded bg-[#0A0A0B] border border-hairline" />
            </div>

            <div className="p-3 bg-bg-main border border-hairline rounded-panel flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-zinc-200 font-semibold">Primary Accent</div>
                <div className="text-[11px] font-mono text-cyan-accent">Electric Cyan `#00E5CC`</div>
              </div>
              <div className="w-6 h-6 rounded bg-[#00E5CC]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                CONSOLE CODE FONT SIZE
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none"
              >
                <option value="11px">11px Compact (High density)</option>
                <option value="12px">12px Standard (Recommended)</option>
                <option value="14px">14px Large (Presentation mode)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                SESSION INACTIVITY TIMEOUT
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none"
              >
                <option value="15m">15 Minutes</option>
                <option value="30m">30 Minutes (Default)</option>
                <option value="60m">60 Minutes</option>
                <option value="unlimited">Unlimited (Evaluation demo)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Runtime Options */}
        <div className="bg-bg-panel border border-hairline rounded-panel p-5 space-y-4">
          <div className="pb-3 border-b border-hairline">
            <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-accent" />
              <span>Target Environment & Execution</span>
            </h3>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              DVWA target bridge and verification automation switches.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              DVWA TARGET SERVICE ENDPOINT
            </label>
            <input
              type="text"
              value={dvwaHost}
              onChange={(e) => setDvwaHost(e.target.value)}
              className="w-full bg-bg-main border border-hairline focus:border-cyan-accent rounded-panel px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
            />
            <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
              Default docker container exposes DVWA at localhost:8081
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 bg-bg-main border border-hairline rounded-panel cursor-pointer">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-xs font-mono text-zinc-200">Terminal Notification Audio</div>
                  <div className="text-[11px] font-mono text-zinc-500">Cosmetic beep on payload submission and security verification</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="w-4 h-4 accent-cyan-accent rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-bg-main border border-hairline rounded-panel cursor-pointer">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-xs font-mono text-zinc-200">Automated Replay Verification</div>
                  <div className="text-[11px] font-mono text-zinc-500">Automatically replay `reference_payload` when security level is elevated</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoVerify}
                onChange={(e) => setAutoVerify(e.target.checked)}
                className="w-4 h-4 accent-cyan-accent rounded"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-accent hover:bg-cyan-hover text-bg-main font-mono font-bold text-xs rounded-panel transition-all shadow-[0_0_12px_rgba(0,229,204,0.25)]"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-bg-panel border border-status-red/30 rounded-panel p-5 space-y-3">
          <div className="flex items-center gap-2 text-status-red text-sm font-mono font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Danger Zone</span>
          </div>
          <p className="text-xs font-mono text-zinc-400">
            Resetting simulation state will flush all local attempts, defenses, and alerts back to baseline locked mock dataset.
          </p>
          <div>
            <button
              type="button"
              onClick={handleResetData}
              className="px-3 py-1.5 bg-status-redDim hover:bg-status-red/20 border border-status-red/40 text-status-red text-xs font-mono font-bold rounded-sharp transition-colors"
            >
              RESET TO INITIAL 8-TABLE SEED
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
