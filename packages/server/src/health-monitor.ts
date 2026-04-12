import { EventEmitter } from 'events';
import type { HealthStatus, Config } from '@inferno-lab/shared';
import type { ProcessManager } from './process-manager.js';

const UNHEALTHY_THRESHOLD = 3;

export class HealthMonitor extends EventEmitter {
  private config: Config;
  private processManager: ProcessManager;
  private healthMap = new Map<string, HealthStatus>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(config: Config, processManager: ProcessManager) {
    super();
    this.config = config;
    this.processManager = processManager;

    processManager.on('stateChange', (status: { id: string; state: string }) => {
      if (status.state === 'running') {
        this.startPolling(status.id);
      } else if (status.state === 'stopped' || status.state === 'crashed') {
        this.stopPolling(status.id);
        this.healthMap.delete(status.id);
      }
    });
  }

  getHealth(id: string): HealthStatus | null {
    return this.healthMap.get(id) ?? null;
  }

  private startPolling(id: string): void {
    if (this.timers.has(id)) return;

    const svcConfig = this.config.services[id];
    if (!svcConfig) return;

    this.checkHealth(id);
    const timer = setInterval(() => this.checkHealth(id), svcConfig.healthCheck.intervalMs);
    this.timers.set(id, timer);
  }

  private stopPolling(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }

  private async checkHealth(id: string): Promise<void> {
    const svcConfig = this.config.services[id];
    if (!svcConfig) return;

    const status = this.processManager.getStatus(id);
    if (status.state !== 'running' && status.state !== 'unhealthy') return;

    const { url, timeoutMs } = svcConfig.healthCheck;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      const health: HealthStatus = {
        healthy: res.ok,
        latencyMs: Date.now() - start,
        lastCheckedAt: Date.now(),
        consecutiveFailures: res.ok ? 0 : (this.healthMap.get(id)?.consecutiveFailures ?? 0) + 1,
        httpStatus: res.status,
      };

      this.healthMap.set(id, health);
      this.emit('health', { serviceId: id, health });

      if (health.consecutiveFailures >= UNHEALTHY_THRESHOLD && status.state === 'running') {
        this.processManager.emit('stateChange', {
          ...this.processManager.getStatus(id),
          state: 'unhealthy' as const,
        });
      }
    } catch {
      const prev = this.healthMap.get(id);
      const health: HealthStatus = {
        healthy: false,
        latencyMs: Date.now() - start,
        lastCheckedAt: Date.now(),
        consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
        httpStatus: null,
      };

      this.healthMap.set(id, health);
      this.emit('health', { serviceId: id, health });

      if (health.consecutiveFailures >= UNHEALTHY_THRESHOLD && status.state === 'running') {
        this.processManager.emit('stateChange', {
          ...this.processManager.getStatus(id),
          state: 'unhealthy' as const,
        });
      }
    }
  }

  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
