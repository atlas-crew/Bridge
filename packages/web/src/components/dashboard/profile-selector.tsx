import { Play } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';

export function ProfileSelector() {
  const profiles = useLabStore((s) => s.profiles);
  const activeProfile = useLabStore((s) => s.activeProfile);
  const sendCommand = useLabStore((s) => s.sendCommand);

  const entries = Object.entries(profiles);
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {entries.map(([name, profile]) => {
        const isActive = activeProfile === name;
        return (
          <button
            key={name}
            onClick={() => sendCommand({ type: 'START_PROFILE', payload: { profile: name } })}
            disabled={isActive}
            className={`type-label flex items-center gap-1.5 rounded-lg border px-3 py-1.5 uppercase transition-colors ${
              isActive
                ? 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange cursor-default'
                : 'border-border bg-surface text-text-muted hover:border-text-dim hover:bg-surface-raised hover:text-text'
            }`}
            title={profile.description}
          >
            <Play className="h-3 w-3" />
            {name}
            <span className="type-timestamp text-text-dim">({profile.services.length})</span>
          </button>
        );
      })}
    </div>
  );
}
