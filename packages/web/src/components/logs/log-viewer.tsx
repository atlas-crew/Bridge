import { useEffect, useRef, useMemo, useState } from 'react';
import { useLabStore } from '@/store/useLabStore';
import { LogToolbar } from './log-toolbar';
import { Play, GripHorizontal } from 'lucide-react';

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
  const isAutoScroll = useLabStore((s) => s.isAutoScroll);
  const setAutoScroll = useLabStore((s) => s.setAutoScroll);
  const logPanelHeight = useLabStore((s) => s.logPanelHeight);
  const setLogPanelHeight = useLabStore((s) => s.setLogPanelHeight);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const filtered = useMemo(() => {
    return logEntries.filter((entry) => {
      if (logFilter.serviceId && entry.serviceId !== logFilter.serviceId) return false;
      if (logFilter.stream !== 'all' && entry.stream !== logFilter.stream) return false;
      if (logFilter.search && !entry.data.toLowerCase().includes(logFilter.search.toLowerCase())) return false;
      return true;
    });
  }, [logEntries, logFilter]);

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    function handleMouseMove(e: MouseEvent) {
      // Calculate height from bottom of window
      const newHeight = window.innerHeight - e.clientY;
      setLogPanelHeight(newHeight);
    }

    function handleMouseUp() {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setLogPanelHeight]);

  // Auto-scroll effect
  useEffect(() => {
    const el = containerRef.current;
    if (el && isAutoScroll) {
      el.scrollTop = el.scrollHeight;
    }
  }, [filtered.length, isAutoScroll]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (!atBottom && isAutoScroll) {
      setAutoScroll(false);
    } else if (atBottom && !isAutoScroll) {
      setAutoScroll(true);
    }
  }

  return (
    <div 
      className="flex flex-col border-t border-border bg-surface relative"
      style={{ height: `${logPanelHeight}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center group z-10"
      >
        <div className="w-12 h-1 rounded-full bg-border group-hover:bg-brand-blue transition-colors flex items-center justify-center">
          <GripHorizontal className="h-3 w-3 text-bg opacity-0 group-hover:opacity-100" />
        </div>
      </div>

      <LogToolbar />
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth"
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

      {/* Paused Overlay */}
      {!isAutoScroll && filtered.length > 0 && (
        <button
          onClick={() => setAutoScroll(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-brand-blue text-bg px-4 py-1.5 rounded-full shadow-lg shadow-black/50 hover:brightness-110 transition-all animate-in fade-in slide-in-from-bottom-2"
        >
          <Play className="h-3 w-3 fill-current" />
          <span className="type-tag font-bold">RESUME SCROLLING</span>
        </button>
      )}
    </div>
  );
}
