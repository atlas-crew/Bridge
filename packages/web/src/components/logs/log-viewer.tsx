import { useEffect, useRef, useMemo } from 'react';
import { useLabStore } from '@/store/useLabStore';
import { LogToolbar } from './log-toolbar';

/** Brand-aligned colors per service */
const SERVICE_COLORS: Record<string, string> = {
  apparatus: 'text-brand-blue',
  'chimera-api': 'text-brand-magenta',
  'chimera-web': 'text-brand-magenta',
  crucible: 'text-brand-amber',
};

export function LogViewer() {
  const logEntries = useLabStore((s) => s.logEntries);
  const logFilter = useLabStore((s) => s.logFilter);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScroll = useRef(true);

  const filtered = useMemo(() => {
    return logEntries.filter((entry) => {
      if (logFilter.serviceId && entry.serviceId !== logFilter.serviceId) return false;
      if (logFilter.stream !== 'all' && entry.stream !== logFilter.stream) return false;
      if (logFilter.search && !entry.data.toLowerCase().includes(logFilter.search.toLowerCase())) return false;
      return true;
    });
  }, [logEntries, logFilter]);

  useEffect(() => {
    const el = containerRef.current;
    if (el && isAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [filtered.length]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isAutoScroll.current = atBottom;
  }

  return (
    <div className="flex flex-col border-t border-border bg-surface">
      <LogToolbar />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 min-h-[200px] max-h-[400px]"
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-8 type-body text-text-dim">
            No log output yet
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div key={i} className="type-code flex gap-2 leading-5 hover:bg-surface-raised/50" style={{ fontSize: 12 }}>
              <span className={`type-label shrink-0 ${SERVICE_COLORS[entry.serviceId] ?? 'text-text-muted'}`} style={{ fontSize: 12 }}>
                [{entry.serviceId}]
              </span>
              <span className={entry.stream === 'stderr' ? 'text-state-crashed/80' : 'text-text-muted'}>
                {entry.data}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
