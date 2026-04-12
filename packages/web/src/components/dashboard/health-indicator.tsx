import type { HealthStatus } from '@inferno-lab/shared';
import { formatLatency } from '@/lib/utils';

interface HealthIndicatorProps {
  health: HealthStatus | null;
}

export function HealthIndicator({ health }: HealthIndicatorProps) {
  if (!health) {
    return (
      <span className="type-timestamp flex items-center gap-1.5 text-text-dim">
        <span className="h-2 w-2 rounded-full bg-text-dim/40" />
        NO DATA
      </span>
    );
  }

  return (
    <span className="type-timestamp flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${health.healthy ? 'bg-state-running animate-pulse' : 'bg-state-crashed'}`}
      />
      <span className={health.healthy ? 'text-state-running' : 'text-state-crashed'}>
        {health.healthy ? 'HEALTHY' : 'FAILING'}
      </span>
      <span className="type-metric-unit text-text-dim">{formatLatency(health.latencyMs)}</span>
    </span>
  );
}
