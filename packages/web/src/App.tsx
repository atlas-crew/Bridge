import { useWebSocket } from '@/hooks/useWebSocket';
import { useUptimeTicker } from '@/hooks/useUptimeTicker';
import { Header } from '@/components/layout/header';
import { ServiceGrid } from '@/components/dashboard/service-grid';
import { LogViewer } from '@/components/logs/log-viewer';
import { ConfigEditor } from '@/components/config/ConfigEditor';
import { useLabStore } from '@/store/useLabStore';

export default function App() {
  useWebSocket();
  useUptimeTicker();

  const error = useLabStore((s) => s.error);
  const setError = useLabStore((s) => s.setError);
  const activeView = useLabStore((s) => s.activeView);

  return (
    <div className="flex h-screen flex-col">
      <Header />

      {/* Error banner */}
      {error && (
        <div className="type-tag flex items-center justify-between border-b border-state-crashed/30 bg-state-crashed/10 px-6 py-2 uppercase text-state-crashed">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="type-link text-text-dim hover:text-text uppercase">
            DISMISS
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeView === 'dashboard' ? (
          <div className="h-full overflow-y-auto px-6 py-6">
            <ServiceGrid />
          </div>
        ) : (
          <div className="h-full px-6 py-6">
            <ConfigEditor />
          </div>
        )}
      </main>

      {/* Log panel */}
      {activeView === 'dashboard' && <LogViewer />}
    </div>
  );
}
