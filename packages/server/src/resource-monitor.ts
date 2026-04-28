import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { ProcessManager } from './process-manager.js';

const execAsync = promisify(exec);

export interface ResourceUsage {
  cpuPercent: number;
  memoryBytes: number;
  lastUpdated: number;
}

export class ResourceMonitor extends EventEmitter {
  private processManager: ProcessManager;
  private resourcesMap = new Map<string, ResourceUsage>();
  private interval: NodeJS.Timeout | null = null;

  constructor(processManager: ProcessManager) {
    super();
    this.processManager = processManager;

    this.processManager.on('stateChange', (status) => {
      if (status.state === 'running' || status.state === 'starting' || status.state === 'unhealthy') {
        if (status.pid) {
          console.log(`[ResourceMonitor] Service ${status.id} active with PID ${status.pid}. Sampling...`);
          setTimeout(() => this.checkProcess(status.id, status.pid!), 1000);
        }
      } else {
        this.resourcesMap.delete(status.id);
      }
    });
  }

  start(intervalMs = 5000): void {
    if (this.interval) return;
    console.log(`[ResourceMonitor] Engine started (interval: ${intervalMs}ms)`);
    this.interval = setInterval(() => this.poll(), intervalMs);
    setTimeout(() => this.poll(), 2000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getResourceUsage(id: string): ResourceUsage | null {
    return this.resourcesMap.get(id) ?? null;
  }

  private async poll(): Promise<void> {
    const statuses = this.processManager.getAllStatuses();
    const active = statuses
      .filter((s) => s.state === 'running' || s.state === 'unhealthy' || s.state === 'starting')
      .filter((s) => s.pid !== null);

    if (active.length > 0) {
      console.log(`[ResourceMonitor] Polling ${active.length} active services...`);
    }

    for (const s of active) {
      await this.checkProcess(s.id, s.pid!);
    }
  }

  private async checkProcess(id: string, pid: number): Promise<void> {
    try {
      const usage = await this.getProcessUsage(pid);
      if (usage) {
        this.resourcesMap.set(id, usage);
        this.emit('resources', { serviceId: id, resources: usage });
      }
    } catch (err) {
      console.error(`[ResourceMonitor] Error checking ${id} (PID ${pid}):`, err);
      this.resourcesMap.delete(id);
    }
  }

  private async getProcessUsage(pid: number): Promise<ResourceUsage | null> {
    try {
      const cmd = `ps -p ${pid} -o %cpu=,rss=`;
      const { stdout } = await execAsync(cmd);
      const dataLine = stdout.trim();
      
      if (!dataLine) return null;

      const parts = dataLine.split(/\s+/).filter(Boolean);
      if (parts.length < 2) return null;

      const usage = {
        cpuPercent: parseFloat(parts[0]) || 0,
        memoryBytes: (parseInt(parts[1], 10) || 0) * 1024,
        lastUpdated: Date.now(),
      };

      return usage;
    } catch (err) {
      return null;
    }
  }
}
