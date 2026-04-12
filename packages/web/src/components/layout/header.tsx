import { CircleOff } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';
import { ProfileSelector } from '@/components/dashboard/profile-selector';
import { InfernoLabIcon } from '@/components/icons/service-icons';

export function Header() {
  const labName = useLabStore((s) => s.labName);
  const wsConnected = useLabStore((s) => s.wsConnected);
  const sendCommand = useLabStore((s) => s.sendCommand);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-3">
        <InfernoLabIcon size={28} />
        <h1 className="type-subhead text-text uppercase">{labName}</h1>
        <span className="flex items-center gap-1.5 type-timestamp">
          <span
            className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-state-running' : 'bg-state-crashed animate-pulse'}`}
          />
          <span className={wsConnected ? 'text-text-dim' : 'text-state-crashed'}>
            {wsConnected ? 'CONNECTED' : 'RECONNECTING'}
          </span>
        </span>
      </div>

      {/* Center: Profiles */}
      <ProfileSelector />

      {/* Right: Stop All */}
      <button
        onClick={() => sendCommand({ type: 'STOP_ALL' })}
        className="type-link flex items-center gap-1.5 rounded-lg border border-state-crashed/30 bg-state-crashed/10 px-3 py-1.5 uppercase text-state-crashed hover:bg-state-crashed/20 transition-colors"
      >
        <CircleOff className="h-3.5 w-3.5" />
        Stop All
      </button>
    </header>
  );
}
