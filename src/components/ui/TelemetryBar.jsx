import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Volume2, 
  VolumeX, 
  Tv, 
  Activity, 
  Clock, 
  ShieldCheck, 
  Server 
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

export default function TelemetryBar({ isScanlinesActive, onToggleScanlines }) {
  const [timeStr, setTimeStr] = useState('');
  const [latency, setLatency] = useState(24);
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Subtle latency jitter
  useEffect(() => {
    const jitter = setInterval(() => {
      setLatency(20 + Math.floor(Math.random() * 9));
    }, 4000);
    return () => clearInterval(jitter);
  }, []);

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundEngine.playBlip();
    }
  };

  return (
    <div className="h-7 bg-black/90 border-b border-hairline px-4 flex items-center justify-between text-[10px] font-mono select-none overflow-x-auto whitespace-nowrap z-30">
      {/* Left: Operational telemetry indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse" />
          <span className="text-zinc-500 font-bold">NODE:</span>
          <span className="text-zinc-300">CYBERFORGE-PROD-01</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-zinc-400">
          <Server className="w-3 h-3 text-cyan-accent" />
          <span className="text-zinc-500">TARGET:</span>
          <span className="text-cyan-accent">DVWA 1.10 (PORT 8081)</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-zinc-400">
          <Wifi className="w-3 h-3 text-status-green" />
          <span className="text-zinc-500">LATENCY:</span>
          <span className="text-status-green">{latency}ms</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-zinc-400">
          <ShieldCheck className="w-3 h-3 text-cyan-accent" />
          <span className="text-zinc-500">SCHEMA:</span>
          <span className="text-zinc-300">8 TABLES LOCKED</span>
        </div>
      </div>

      {/* Right: Clock & Interactive Controls */}
      <div className="flex items-center gap-3">
        {/* Synchronized Mission Clock */}
        <div className="flex items-center gap-1.5 text-zinc-300 bg-bg-subtle/80 px-2 py-0.5 rounded border border-hairline">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span>{timeStr || '12:00:00 UTC'}</span>
        </div>

        {/* CRT Scanline Toggle */}
        <button
          onClick={onToggleScanlines}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
            isScanlinesActive
              ? 'border-cyan-accent/50 text-cyan-accent bg-cyan-dim'
              : 'border-hairline text-zinc-500 hover:text-zinc-300'
          }`}
          title="Toggle CRT Scanlines Atmosphere"
        >
          <Tv className="w-3 h-3" />
          <span className="hidden sm:inline">CRT FX</span>
        </button>

        {/* Sound FX Audio Toggle */}
        <button
          onClick={handleToggleMute}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
            !isMuted
              ? 'border-cyan-accent/50 text-cyan-accent bg-cyan-dim'
              : 'border-hairline text-zinc-500 hover:text-zinc-300'
          }`}
          title={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
        >
          {!isMuted ? (
            <>
              <Volume2 className="w-3 h-3" />
              <span className="hidden sm:inline">AUDIO ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3 h-3" />
              <span className="hidden sm:inline">MUTED</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
