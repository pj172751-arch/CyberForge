import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import SearchModal from './SearchModal';
import TelemetryBar from '../ui/TelemetryBar';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

export default function Layout({ children, currentTab, setCurrentTab, onSelectChallenge }) {
  const { toast } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScanlinesActive, setIsScanlinesActive] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-main text-slate-200 relative">
      {/* Optional CRT Scanlines Atmosphere Layer */}
      {isScanlinesActive && (
        <div className="absolute inset-0 z-50 scanlines-overlay pointer-events-none" />
      )}

      {/* Fixed Left Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global SOC Telemetry HUD Header */}
        <TelemetryBar
          isScanlinesActive={isScanlinesActive}
          onToggleScanlines={() => setIsScanlinesActive(prev => !prev)}
        />

        {/* Topbar */}
        <Topbar onOpenSearch={() => setIsSearchOpen(true)} />
        
        {/* Main View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-main">
          {children}
        </main>
      </div>

      {/* Global Quick Search (Ctrl+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectChallenge={onSelectChallenge}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-3.5 py-2.5 bg-bg-panel border border-border-subtle rounded-panel shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-status-green" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 text-status-red" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-accent" />}
          <span className="text-xs font-mono text-zinc-200">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
