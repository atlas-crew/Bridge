import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createInterface } from 'readline';
import type { ServiceState, ServiceStatus, LogEntry, Config } from '@bridge/shared';
import { LogBuffer } from './log-buffer.js';
import { substituteEnv } from './utils.js';

interface ManagedProcess {
  id: string;
  child: ChildProcess | null;
  state: ServiceState;
  pid: number | null;
  startedAt: number | null;
  stoppedAt: number | null;
  restartCount: number;
  lastError: string | null;
  logBuffer: LogBuffer;
  readyResolve: (() => void) | null;
  readyPromise: Promise<void> | null;
}

export interface ProcessManagerEvents {
  stateChange: (status: ServiceStatus) => void;
  log: (entry: LogEntry) => void;
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ManagedProcess>();
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;

    for (const [id, svc] of Object.entries(config.services)) {
      this.processes.set(id, {
        id,
        child: null,
        state: 'stopped',
        pid: null,
        startedAt: null,
        stoppedAt: null,
        restartCount: 0,
        lastError: null,
        logBuffer: new LogBuffer(1000),
        readyResolve: null,
        readyPromise: null,
      });
    }
  }

  getStatus(id: string): ServiceStatus {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);
    const svcConfig = this.config.services[id]!;

    return {
      id,
      name: svcConfig.name,
      state: proc.state,
      pid: proc.pid,
      uptime: proc.startedAt && proc.state === 'running'
        ? Date.now() - proc.startedAt
        : null,
      restartCount: proc.restartCount,
      health: null, // Populated by health monitor
      resources: null, // Populated by resource monitor
      ports: svcConfig.ports,
      dependencies: svcConfig.dependencies,
      lastError: proc.lastError,
      recentStderr: proc.logBuffer.getRecentStderr(5),
      startedAt: proc.startedAt,
      stoppedAt: proc.stoppedAt,
    };
  }

  getAllStatuses(): ServiceStatus[] {
    return [...this.processes.keys()].map((id) => this.getStatus(id));
  }

  getLogBuffer(id: string): LogBuffer {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);
    return proc.logBuffer;
  }

  async start(id: string): Promise<void> {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);

    if (proc.state === 'running' || proc.state === 'starting') {
      return;
    }

    const svcConfig = this.config.services[id]!;

    // Create ready promise for dependency gating
    proc.readyPromise = new Promise<void>((resolve) => {
      proc.readyResolve = resolve;
    });

    this.setState(proc, 'starting');

    // Substitute env vars in config values before spawning
    const command = substituteEnv(svcConfig.command);
    const args = svcConfig.args.map(substituteEnv);
    const cwd = substituteEnv(svcConfig.cwd);
    const env = { ...process.env };
    for (const [key, value] of Object.entries(svcConfig.env)) {
      env[key] = substituteEnv(value);
    }

    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    proc.child = child;
    proc.pid = child.pid ?? null;
    proc.startedAt = Date.now();
    proc.stoppedAt = null;
    proc.lastError = null;

    const readyPattern = svcConfig.readyPattern
      ? new RegExp(svcConfig.readyPattern, 'i')
      : null;

    // Pipe stdout
    if (child.stdout) {
      const rl = createInterface({ input: child.stdout });
      rl.on('line', (line) => {
        const entry: LogEntry = {
          serviceId: id,
          stream: 'stdout',
          data: line,
          timestamp: Date.now(),
        };
        proc.logBuffer.push(entry);
        this.emit('log', entry);

        // Check ready pattern
        if (readyPattern && proc.state === 'starting' && readyPattern.test(line)) {
          this.setState(proc, 'running');
          proc.readyResolve?.();
          proc.readyResolve = null;
        }
      });
    }

    // Pipe stderr
    if (child.stderr) {
      const rl = createInterface({ input: child.stderr });
      rl.on('line', (line) => {
        const entry: LogEntry = {
          serviceId: id,
          stream: 'stderr',
          data: line,
          timestamp: Date.now(),
        };
        proc.logBuffer.push(entry);
        this.emit('log', entry);
      });
    }

    child.on('error', (err) => {
      proc.lastError = err.message;
      this.setState(proc, 'crashed');
      proc.readyResolve?.();
      proc.readyResolve = null;
    });

    child.on('close', (code, signal) => {
      proc.pid = null;
      proc.child = null;
      proc.stoppedAt = Date.now();

      if (proc.state === 'stopping') {
        this.setState(proc, 'stopped');
      } else if (code !== 0) {
        proc.lastError = signal
          ? `Killed by signal ${signal}`
          : `Exited with code ${code}`;
        this.setState(proc, 'crashed');
      } else {
        this.setState(proc, 'stopped');
      }

      proc.readyResolve?.();
      proc.readyResolve = null;
    });

    // If no readyPattern, transition to running after a short delay
    // to allow the process to fail fast if it errors immediately
    if (!readyPattern) {
      setTimeout(() => {
        if (proc.state === 'starting') {
          this.setState(proc, 'running');
          proc.readyResolve?.();
          proc.readyResolve = null;
        }
      }, 2000);
    }
  }

  async stop(id: string): Promise<void> {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);
    if (!proc.child || proc.state === 'stopped' || proc.state === 'stopping') {
      return;
    }

    this.setState(proc, 'stopping');

    const gracePeriod = this.config.lab.shutdownGracePeriodMs;

    return new Promise<void>((resolve) => {
      const killTimer = setTimeout(() => {
        if (proc.pid) {
          console.log(`[ProcessManager] Grace period expired for ${id}, sending SIGKILL to process group`);
          try {
            process.kill(-proc.pid, 'SIGKILL');
          } catch (err) {
            console.error(`[ProcessManager] Failed to SIGKILL process group ${proc.pid}:`, err);
          }
        }
      }, gracePeriod);

      const onClose = () => {
        clearTimeout(killTimer);
        resolve();
      };

      proc.child!.once('close', onClose);
      
      try {
        process.kill(-proc.pid!, 'SIGTERM');
      } catch (err) {
        console.error(`[ProcessManager] Failed to SIGTERM process group ${proc.pid}:`, err);
        // If SIGTERM fails, the process might already be dead or we might not have permission,
        // but we still want the onClose logic to eventually resolve.
      }
    });
  }

  async forceStop(id: string): Promise<void> {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);
    if (!proc.pid) return;

    console.log(`[ProcessManager] Force stopping ${id} (SIGKILLing process group)`);
    try {
      process.kill(-proc.pid, 'SIGKILL');
    } catch (err) {
      console.error(`[ProcessManager] Failed to force SIGKILL process group ${proc.pid}:`, err);
    }
  }

  async restart(id: string): Promise<void> {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);

    await this.stop(id);
    proc.restartCount++;
    await this.start(id);
  }

  markUnhealthy(id: string): void {
    const proc = this.processes.get(id);
    if (proc && proc.state === 'running') {
      this.setState(proc, 'unhealthy');
    }
  }

  async stopAll(): Promise<void> {
    const ids = [...this.processes.keys()].filter((id) => {
      const p = this.processes.get(id)!;
      return p.state !== 'stopped' && p.state !== 'crashed';
    });

    // Stop in reverse dependency order
    const sorted = this.reverseTopoSort(ids);
    for (const id of sorted) {
      await this.stop(id);
    }
  }

  async updateConfig(newConfig: Config): Promise<void> {
    const oldConfig = this.config;
    const oldIds = new Set(this.processes.keys());
    const newIds = new Set(Object.keys(newConfig.services));

    // 1. Identify and stop deleted services
    const toDelete = [...oldIds].filter((id) => !newIds.has(id));
    for (const id of toDelete) {
      await this.stop(id);
      this.processes.delete(id);
    }

    // 2. Identify and initialize new services
    const toAdd = [...newIds].filter((id) => !oldIds.has(id));
    for (const id of toAdd) {
      this.processes.set(id, {
        id,
        child: null,
        state: 'stopped',
        pid: null,
        startedAt: null,
        stoppedAt: null,
        restartCount: 0,
        lastError: null,
        logBuffer: new LogBuffer(1000),
        readyResolve: null,
        readyPromise: null,
      });
    }

    // 3. Update the internal config reference before checking runtime changes
    // so that restart() uses the new config
    this.config = newConfig;

    // 4. Check for changed runtime configuration in existing services
    const toUpdate = [...oldIds].filter((id) => newIds.has(id));
    for (const id of toUpdate) {
      const oldSvc = oldConfig.services[id]!;
      const newSvc = newConfig.services[id]!;

      const runtimeChanged =
        oldSvc.command !== newSvc.command ||
        JSON.stringify(oldSvc.args) !== JSON.stringify(newSvc.args) ||
        JSON.stringify(oldSvc.env) !== JSON.stringify(newSvc.env) ||
        oldSvc.cwd !== newSvc.cwd ||
        oldSvc.readyPattern !== newSvc.readyPattern;

      if (runtimeChanged) {
        const proc = this.processes.get(id)!;
        if (proc.state === 'running' || proc.state === 'starting' || proc.state === 'unhealthy') {
          console.log(`[ProcessManager] Restarting ${id} due to configuration change`);
          await this.restart(id);
        }
      }
    }

    // 5. Emit update for all services (metadata might have changed)
    this.emit('stateChange', { id: '*' } as any);
  }

  waitForReady(id: string, timeoutMs = 60000): Promise<void> {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);

    if (proc.state === 'running') return Promise.resolve();
    if (proc.state === 'crashed' || proc.state === 'stopped') {
      return Promise.reject(new Error(`Service ${id} is ${proc.state}`));
    }

    if (!proc.readyPromise) {
      return Promise.reject(new Error(`Service ${id} has no pending ready promise`));
    }

    return Promise.race([
      proc.readyPromise,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`Service ${id} startup timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  private setState(proc: ManagedProcess, state: ServiceState): void {
    proc.state = state;
    this.emit('stateChange', this.getStatus(proc.id));
  }

  private reverseTopoSort(ids: string[]): string[] {
    const idSet = new Set(ids);
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id) || !idSet.has(id)) return;
      visited.add(id);
      // Visit dependents first (services that depend on this one)
      for (const [otherId, otherConfig] of Object.entries(this.config.services)) {
        if (otherConfig.dependencies.includes(id) && idSet.has(otherId)) {
          visit(otherId);
        }
      }
      result.push(id);
    };

    for (const id of ids) visit(id);
    return result;
  }
}
