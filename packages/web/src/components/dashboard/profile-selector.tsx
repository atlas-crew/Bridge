import React, { useState } from 'react';
import { Rocket, ChevronDown } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';

export function ProfileSelector() {
  const profiles = useLabStore((s) => s.profiles);
  const activeProfile = useLabStore((s) => s.activeProfile);
  const sendCommand = useLabStore((s) => s.sendCommand);

  const entries = Object.entries(profiles);
  const [selected, setSelected] = useState(entries[0]?.[0] || '');

  if (entries.length === 0) return null;

  const handleLaunch = () => {
    if (selected) {
      sendCommand({ type: 'START_PROFILE', payload: { profile: selected } });
    }
  };

  return (
    <div className="flex items-center gap-2 bg-bg/50 p-1 rounded-lg border border-border">
      <div className="relative flex items-center">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="appearance-none bg-surface-raised border border-border rounded-md px-3 py-1.5 pr-8 type-label text-text outline-none focus:border-brand-blue/50 transition-colors cursor-pointer min-w-[140px]"
        >
          {entries.map(([name, profile]) => (
            <option key={name} value={name}>
              {name.toUpperCase()} ({profile.services.length})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-text-dim pointer-events-none" />
      </div>

      <button
        onClick={handleLaunch}
        disabled={activeProfile === selected}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all font-bold ${
          activeProfile === selected
            ? 'bg-state-running/20 text-state-running border border-state-running/30 cursor-default'
            : 'bg-brand-blue text-bg hover:brightness-110 shadow-lg shadow-brand-blue/10 active:scale-95'
        }`}
      >
        <Rocket className={`h-4 w-4 ${activeProfile === selected ? '' : 'animate-pulse'}`} />
        <span className="type-nav">LAUNCH</span>
      </button>
    </div>
  );
}
