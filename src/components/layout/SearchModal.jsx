import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, Crosshair, ArrowRight } from 'lucide-react';
import { getDifficultyBadgeColor, getDifficultyPoints } from '../../data/mockData';

export default function SearchModal({ isOpen, onClose, onSelectChallenge }) {
  const { challenges } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = challenges.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.vulnerability_type.toLowerCase().includes(query.toLowerCase()) ||
    c.difficulty.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-xl bg-bg-panel border border-border-subtle rounded-panel shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Box */}
        <div className="flex items-center px-4 py-3 border-b border-hairline gap-3">
          <Search className="w-4 h-4 text-cyan-accent" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search challenges by title, vulnerability type, or difficulty..."
            className="flex-1 bg-transparent text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-bg-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-hairline">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              No challenges found matching "{query}"
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.challenge_id}
                onClick={() => {
                  onSelectChallenge(c);
                  onClose();
                }}
                className="p-2.5 hover:bg-bg-subtle rounded-sharp cursor-pointer flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-bg-main border border-hairline rounded text-zinc-400 group-hover:text-cyan-accent transition-colors">
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-medium text-zinc-200 group-hover:text-cyan-accent transition-colors">
                      {c.title}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500">
                      {c.vulnerability_type} • {c.dvwa_page_ref}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getDifficultyBadgeColor(c.difficulty)}`}>
                    {c.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-accent font-semibold">
                    +{getDifficultyPoints(c.difficulty)} pts
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-accent transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-hairline bg-bg-main flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>Navigate with arrow keys</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
