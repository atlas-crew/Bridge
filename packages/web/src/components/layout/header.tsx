import { CircleOff, Settings, LayoutDashboard } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';
import { ProfileSelector } from '@/components/dashboard/profile-selector';
import { BridgeLockup } from '@/components/icons/brand-icons';

export function Header() {
  const labName = useLabStore((s) => s.labName);
  const wsConnected = useLabStore((s) => s.wsConnected);
  const sendCommand = useLabStore((s) => s.sendCommand);
  const activeView = useLabStore((s) => s.activeView);
  const setActiveView = useLabStore((s) => s.setActiveView);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      {/* Left: Lockup + Lab pill + Nav */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <BridgeLockup height={36} />
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-bg/40">
              <span className="type-tag text-text-dim">LAB</span>
              <span className="type-tag text-text">{labName}</span>
            </div>
            <span
              className="flex items-center gap-1.5 type-timestamp"
              title={wsConnected ? 'Connected to server' : 'Reconnecting to server'}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-state-running' : 'bg-state-crashed animate-pulse'}`}
                aria-hidden="true"
              />
              <span className={wsConnected ? 'text-text-dim' : 'text-state-crashed'}>
                {wsConnected ? 'CONNECTED' : 'RECONNECTING'}
              </span>
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-bg/50 p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'dashboard'
                ? 'bg-surface-raised text-brand-blue shadow-sm'
                : 'text-text-dim hover:text-text'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className={activeView === 'dashboard' ? 'type-nav-active' : 'type-nav'}>DASHBOARD</span>
          </button>
          <button
            onClick={() => setActiveView('config')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
              activeView === 'config'
                ? 'bg-surface-raised text-brand-blue shadow-sm'
                : 'text-text-dim hover:text-text'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className={activeView === 'config' ? 'type-nav-active' : 'type-nav'}>CONFIG</span>
          </button>
        </nav>
      </div>

      {/* Center: Profiles */}
      {activeView === 'dashboard' && <ProfileSelector />}

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
