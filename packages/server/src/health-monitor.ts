import { EventEmitter } from 'events';
import type { HealthStatus, Config } from '@bridge/shared';
import type { ProcessManager } from './process-manager.js';
import { substituteEnv } from './utils.js';

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

    const { url: rawUrl, timeoutMs } = svcConfig.healthCheck;
    const url = substituteEnv(rawUrl);
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
        this.processManager.markUnhealthy(id);
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
        this.processManager.markUnhealthy(id);
      }
    }
  }

  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  updateConfig(newConfig: Config): void {
    const oldConfig = this.config;
    this.config = newConfig;

    // Check for services with changed intervals or removed services
    for (const [id, timer] of this.timers.entries()) {
      const newSvc = newConfig.services[id];
      if (!newSvc) {
        // Service removed
        clearInterval(timer);
        this.timers.delete(id);
        this.healthMap.delete(id);
        continue;
      }

      const oldSvc = oldConfig.services[id];
      if (oldSvc?.healthCheck.intervalMs !== newSvc.healthCheck.intervalMs) {
        // Interval changed, restart timer
        clearInterval(timer);
        this.timers.delete(id);
        this.startPolling(id);
      }
    }
  }
}
