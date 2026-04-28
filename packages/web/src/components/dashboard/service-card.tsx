import { Play, Square, RotateCw, Cpu, HardDrive, Activity, Trash2, Skull, ExternalLink } from 'lucide-react';
import type { ServiceStatus, ServiceState } from '@bridge/shared';
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

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function ServiceCard({ service }: ServiceCardProps) {
  const sendCommand = useLabStore((s) => s.sendCommand);
  const config = useLabStore((s) => s.config);
  const saveConfig = useLabStore((s) => s.saveConfig);
  const setError = useLabStore((s) => s.setError);

  const style = STATE_STYLES[service.state];
  const isActive = service.state === 'running' || service.state === 'unhealthy';
  const canStart = service.state === 'stopped' || service.state === 'crashed';
  const canStop = isActive || service.state === 'starting';

  const IconComponent = SERVICE_ICON_MAP[service.id];

  const handleClearPorts = async () => {
    if (!config) return;
    try {
      const nextConfig = JSON.parse(JSON.stringify(config));
      if (nextConfig.services[service.id]) {
        nextConfig.services[service.id].ports = {};
        await saveConfig(nextConfig);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

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

      {/* Resources */}
      {isActive && (
        <div className="flex items-center gap-4 bg-bg/40 rounded-lg p-2 border border-border/50 min-h-[42px]">
          {service.resources ? (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <Cpu className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="type-tag text-text-dim/60 leading-none" style={{ fontSize: 8 }}>CPU</span>
                  <span className="type-data text-brand-blue truncate" style={{ fontSize: 11 }}>
                    {service.resources.cpuPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <HardDrive className="h-3.5 w-3.5 text-brand-amber shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="type-tag text-text-dim/60 leading-none" style={{ fontSize: 8 }}>RAM</span>
                  <span className="type-data text-brand-amber truncate" style={{ fontSize: 11 }}>
                    {formatBytes(service.resources.memoryBytes)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 px-2">
              <Activity className="h-3.5 w-3.5 text-text-dim animate-pulse" />
              <span className="type-tag text-text-dim/50">WAITING FOR SAMPLE...</span>
            </div>
          )}
        </div>
      )}

      {/* Ports */}
      {Object.keys(service.ports).length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {Object.entries(service.ports).map(([name, port]) => (
              <a
                key={name}
                href={`http://localhost:${port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="type-code rounded bg-surface-overlay px-1.5 py-0.5 text-text-muted hover:text-brand-blue hover:bg-brand-blue/10 transition-colors flex items-center gap-1 group"
                style={{ fontSize: 10 }}
                title={`Open http://localhost:${port}`}
              >
                :{port}
                <ExternalLink className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
          <button
            onClick={handleClearPorts}
            className="p-1 text-text-dim hover:text-state-crashed transition-colors rounded-md hover:bg-state-crashed/10"
            title="Clear Ports"
          >
            <Trash2 className="h-3 w-3" />
          </button>
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

      {/* Recent Stderr */}
      {(service.state === 'unhealthy' || service.state === 'crashed') && service.recentStderr.length > 0 && (
        <div className="flex flex-col gap-1 bg-black/20 rounded p-2 border border-state-crashed/20 overflow-hidden">
          <div className="type-tag text-state-crashed/60 font-bold" style={{ fontSize: 8 }}>RECENT ERROR OUTPUT</div>
          <div className="flex flex-col gap-0.5">
            {service.recentStderr.map((line, i) => (
              <div key={i} className="type-code text-state-crashed/80 truncate leading-tight" style={{ fontSize: 10 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
        {canStart && (
          <button
            onClick={() => sendCommand({ type: 'START_SERVICE', payload: { serviceId: service.id } })}
            className="type-link flex items-center gap-1 rounded bg-state-running/15 px-2.5 py-1.5 uppercase text-state-running hover:bg-state-running/25 transition-colors"
          >
            <Play className="h-3 w-3" /> Start
          </button>
        )}
        
        {service.state === 'stopping' ? (
          <button
            onClick={() => sendCommand({ type: 'FORCE_STOP_SERVICE', payload: { serviceId: service.id } })}
            className="type-link flex items-center gap-1 rounded bg-state-crashed/20 px-2.5 py-1.5 uppercase text-state-crashed hover:bg-state-crashed/30 transition-colors animate-pulse"
          >
            <Skull className="h-3 w-3" /> Force Kill
          </button>
        ) : canStop && (
          <button
            onClick={() => sendCommand({ type: 'STOP_SERVICE', payload: { serviceId: service.id } })}
            className="type-link flex items-center gap-1 rounded bg-surface-overlay px-2.5 py-1.5 uppercase text-text-muted hover:text-text transition-colors"
          >
            <Square className="h-3 w-3" /> Stop
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={() => sendCommand({ type: 'RESTART_SERVICE', payload: { serviceId: service.id } })}
              className="type-link flex items-center gap-1 rounded bg-surface-overlay px-2.5 py-1.5 uppercase text-text-muted hover:text-text transition-colors"
            >
              <RotateCw className="h-3 w-3" /> Restart
            </button>
            <button
              onClick={() => {
                if (confirm(`Force kill ${service.name}?`)) {
                  sendCommand({ type: 'FORCE_STOP_SERVICE', payload: { serviceId: service.id } });
                }
              }}
              className="p-1.5 text-text-dim hover:text-state-crashed transition-colors rounded-md hover:bg-state-crashed/10 ml-auto"
              title="Force Kill (SIGKILL)"
            >
              <Skull className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
