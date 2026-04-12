import { Play, Square, RotateCw } from 'lucide-react';
import type { ServiceStatus, ServiceState } from '@inferno-lab/shared';
import { cn, formatUptime } from '@/lib/utils';
import { HealthIndicator } from './health-indicator';
import { useLabStore } from '@/store/useLabStore';
import { SERVICE_ICON_MAP } from '@/components/icons/service-icons';

const STATE_STYLES: Record<ServiceState, { bg: string; text: string; label: string }> = {
  running:   { bg: 'bg-state-running/15', text: 'text-state-running', label: 'RUNNING' },
  starting:  { bg: 'bg-state-starting/15', text: 'text-state-starting', label: 'STARTING' },
  stopping:  { bg: 'bg-state-stopping/15', text: 'text-state-stopping', label: 'STOPPING' },
  stopped:   { bg: 'bg-state-stopped/15', text: 'text-state-stopped', label: 'STOPPED' },
  crashed:   { bg: 'bg-state-crashed/15', text: 'text-state-crashed', label: 'CRASHED' },
  unhealthy: { bg: 'bg-state-unhealthy/15', text: 'text-state-unhealthy', label: 'UNHEALTHY' },
};

interface ServiceCardProps {
  service: ServiceStatus;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const sendCommand = useLabStore((s) => s.sendCommand);
  const style = STATE_STYLES[service.state];
  const isActive = service.state === 'running' || service.state === 'unhealthy';
  const canStart = service.state === 'stopped' || service.state === 'crashed';
  const canStop = isActive || service.state === 'starting';

  const IconComponent = SERVICE_ICON_MAP[service.id];

  return (
    <div className={cn(
      'rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 transition-colors',
      isActive && 'border-state-running/20',
    )}>
      {/* Header: icon + name + state badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          {IconComponent && <IconComponent size={22} />}
          <div>
            <h3 className="type-body text-text" style={{ fontVariationSettings: "'wght' 500, 'MONO' 0, 'CASL' 0.4, 'CRSV' 0.5, 'slnt' 0" }}>
              {service.name}
            </h3>
            <span className="type-timestamp text-text-dim">{service.id}</span>
          </div>
        </div>
        <span className={cn('type-tag rounded-full px-2 py-0.5 uppercase', style.bg, style.text)}>
          {style.label}
        </span>
      </div>

      {/* Health + Uptime */}
      <div className="flex items-center justify-between">
        <HealthIndicator health={service.health} />
        {isActive && (
          <span className="type-metric-unit text-text-dim">
            {formatUptime(service.uptime)}
          </span>
        )}
      </div>

      {/* Ports */}
      {Object.keys(service.ports).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(service.ports).map(([name, port]) => (
            <span
              key={name}
              className="type-code rounded bg-surface-overlay px-1.5 py-0.5 text-text-muted"
              style={{ fontSize: 10 }}
            >
              :{port}
            </span>
          ))}
        </div>
      )}

      {/* Dependencies */}
      {service.dependencies.length > 0 && (
        <div className="type-timestamp text-text-dim">
          DEPENDS ON: {service.dependencies.join(', ')}
        </div>
      )}

      {/* Error */}
      {service.lastError && (
        <div className="type-code rounded bg-state-crashed/10 px-2 py-1 text-state-crashed truncate" style={{ fontSize: 11 }} title={service.lastError}>
          {service.lastError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-border">
        {canStart && (
          <button
            onClick={() => sendCommand({ type: 'START_SERVICE', payload: { serviceId: service.id } })}
            className="type-link flex items-center gap-1 rounded bg-state-running/15 px-2.5 py-1.5 uppercase text-state-running hover:bg-state-running/25 transition-colors"
          >
            <Play className="h-3 w-3" /> Start
          </button>
        )}
        {canStop && (
          <button
            onClick={() => sendCommand({ type: 'STOP_SERVICE', payload: { serviceId: service.id } })}
            className="type-link flex items-center gap-1 rounded bg-surface-overlay px-2.5 py-1.5 uppercase text-text-muted hover:text-text transition-colors"
          >
            <Square className="h-3 w-3" /> Stop
          </button>
        )}
        {isActive && (
          <button
            onClick={() => sendCommand({ type: 'RESTART_SERVICE', payload: { serviceId: service.id } })}
            className="type-link flex items-center gap-1 rounded bg-surface-overlay px-2.5 py-1.5 uppercase text-text-muted hover:text-text transition-colors"
          >
            <RotateCw className="h-3 w-3" /> Restart
          </button>
        )}
      </div>
    </div>
  );
}
