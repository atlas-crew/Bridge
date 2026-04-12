import { Search, Trash2 } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';

export function LogToolbar() {
  const services = useLabStore((s) => s.services);
  const logFilter = useLabStore((s) => s.logFilter);
  const setLogFilter = useLabStore((s) => s.setLogFilter);
  const clearLogs = useLabStore((s) => s.clearLogs);

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
      {/* Service filter */}
      <select
        value={logFilter.serviceId ?? 'all'}
        onChange={(e) => setLogFilter({ serviceId: e.target.value === 'all' ? null : e.target.value })}
        className="type-data rounded border border-border bg-surface-raised px-2 py-1 text-text-muted outline-none focus:border-brand-blue"
        style={{ fontSize: 11 }}
      >
        <option value="all">All services</option>
        {[...services.values()].map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Stream filter */}
      <select
        value={logFilter.stream}
        onChange={(e) => setLogFilter({ stream: e.target.value as 'all' | 'stdout' | 'stderr' })}
        className="type-data rounded border border-border bg-surface-raised px-2 py-1 text-text-muted outline-none focus:border-brand-blue"
        style={{ fontSize: 11 }}
      >
        <option value="all">All streams</option>
        <option value="stdout">stdout</option>
        <option value="stderr">stderr</option>
      </select>

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          value={logFilter.search}
          onChange={(e) => setLogFilter({ search: e.target.value })}
          placeholder="Filter logs..."
          className="type-code w-full rounded border border-border bg-surface-raised py-1 pl-7 pr-2 text-text outline-none placeholder:text-text-dim focus:border-brand-blue"
          style={{ fontSize: 11 }}
        />
      </div>

      {/* Clear */}
      <button
        onClick={clearLogs}
        className="flex items-center gap-1 rounded px-2 py-1 text-text-dim hover:text-text hover:bg-surface-overlay transition-colors"
        title="Clear logs"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
