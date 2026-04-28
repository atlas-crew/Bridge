import type { Config } from './config-schema.js';

// ── Service lifecycle ──────────────────────────────────────────

export type ServiceState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'unhealthy'
  | 'stopping'
  | 'crashed';

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  lastCheckedAt: number;
  consecutiveFailures: number;
  httpStatus: number | null;
}

export interface ServiceStatus {
  id: string;
  name: string;
  state: ServiceState;
  pid: number | null;
  uptime: number | null;
  restartCount: number;
  health: HealthStatus | null;
  resources: {
    cpuPercent: number;
    memoryBytes: number;
    lastUpdated: number;
  } | null;
  ports: Record<string, number>;
  dependencies: string[];
  lastError: string | null;
  recentStderr: string[];
  startedAt: number | null;
  stoppedAt: number | null;
}

// ── Logs ───────────────────────────────────────────────────────

export interface LogEntry {
  serviceId: string;
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

// ── Configuration ──────────────────────────────────────────────

export interface ProfileConfig {
  description: string;
  services: string[];
}

// ── Lab state (full snapshot) ──────────────────────────────────

export interface LabState {
  services: ServiceStatus[];
  activeProfile: string | null;
  profiles: Record<string, ProfileConfig>;
  labName: string;
  config: Config;
}

// ── WebSocket protocol ─────────────────────────────────────────

export type ServerEvent =
  | { type: 'LAB_STATE'; payload: LabState }
  | { type: 'SERVICE_UPDATE'; payload: ServiceStatus }
  | { type: 'HEALTH_UPDATE'; payload: { serviceId: string; health: HealthStatus } }
  | { type: 'RESOURCES_UPDATE'; payload: { serviceId: string; resources: { cpuPercent: number; memoryBytes: number; lastUpdated: number } } }
  | { type: 'LOG_OUTPUT'; payload: LogEntry }
  | { type: 'LOG_BATCH'; payload: LogEntry[] }
  | { type: 'PROFILE_STARTED'; payload: { profile: string; services: string[] } }
  | { type: 'CONFIG_RELOADED'; payload: { config: Config } }
  | { type: 'ERROR'; payload: { message: string; serviceId?: string } };

export type ClientCommand =
  | { type: 'START_SERVICE'; payload: { serviceId: string } }
  | { type: 'STOP_SERVICE'; payload: { serviceId: string } }
  | { type: 'FORCE_STOP_SERVICE'; payload: { serviceId: string } }
  | { type: 'RESTART_SERVICE'; payload: { serviceId: string } }
  | { type: 'START_PROFILE'; payload: { profile: string } }
  | { type: 'STOP_ALL' }
  | { type: 'SUBSCRIBE_LOGS'; payload: { serviceIds: string[] } }
  | { type: 'UNSUBSCRIBE_LOGS'; payload: { serviceIds: string[] } };
