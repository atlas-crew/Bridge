import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createInterface } from 'readline';
import type { ServiceState, ServiceStatus, LogEntry, Config } from '@inferno-lab/shared';
import { LogBuffer } from './log-buffer.js';

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
      ports: svcConfig.ports,
      dependencies: svcConfig.dependencies,
      lastError: proc.lastError,
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

    const env = { ...process.env, ...svcConfig.env };

    const child = spawn(svcConfig.command, svcConfig.args, {
      cwd: svcConfig.cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
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
        if (proc.child) {
          proc.child.kill('SIGKILL');
        }
      }, gracePeriod);

      const onClose = () => {
        clearTimeout(killTimer);
        resolve();
      };

      proc.child!.once('close', onClose);
      proc.child!.kill('SIGTERM');
    });
  }

  async restart(id: string): Promise<void> {
    const proc = this.processes.get(id);
    if (!proc) throw new Error(`Unknown service: ${id}`);

    await this.stop(id);
    proc.restartCount++;
    await this.start(id);
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
