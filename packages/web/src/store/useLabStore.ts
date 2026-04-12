import { create } from 'zustand';
import type {
  ServiceStatus,
  HealthStatus,
  LogEntry,
  ProfileConfig,
  LabState,
  ServerEvent,
} from '@inferno-lab/shared';

interface LogFilter {
  serviceId: string | null;
  stream: 'all' | 'stdout' | 'stderr';
  search: string;
}

interface LabStore {
  // Data
  services: Map<string, ServiceStatus>;
  profiles: Record<string, ProfileConfig>;
  activeProfile: string | null;
  labName: string;

  // Logs
  logEntries: LogEntry[];
  logFilter: LogFilter;

  // UI
  wsConnected: boolean;
  error: string | null;

  // Actions — state updates
  applyLabState: (state: LabState) => void;
  updateService: (status: ServiceStatus) => void;
  updateHealth: (serviceId: string, health: HealthStatus) => void;
  appendLog: (entry: LogEntry) => void;
  appendLogBatch: (entries: LogEntry[]) => void;
  clearLogs: () => void;
  setLogFilter: (filter: Partial<LogFilter>) => void;
  setWsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  setActiveProfile: (profile: string | null) => void;

  // Actions — commands (dispatch via WS)
  sendCommand: (cmd: object) => void;

  // Dispatch incoming WS event
  dispatchEvent: (event: ServerEvent) => void;
}

const MAX_LOG_ENTRIES = 2000;

export const useLabStore = create<LabStore>((set, get) => ({
  services: new Map(),
  profiles: {},
  activeProfile: null,
  labName: 'Command Plane',
  logEntries: [],
  logFilter: { serviceId: null, stream: 'all', search: '' },
  wsConnected: false,
  error: null,

  applyLabState: (state) =>
    set({
      services: new Map(state.services.map((s) => [s.id, s])),
      profiles: state.profiles,
      activeProfile: state.activeProfile,
      labName: state.labName,
    }),

  updateService: (status) =>
    set((prev) => {
      const next = new Map(prev.services);
      next.set(status.id, { ...next.get(status.id), ...status });
      return { services: next };
    }),

  updateHealth: (serviceId, health) =>
    set((prev) => {
      const next = new Map(prev.services);
      const svc = next.get(serviceId);
      if (svc) next.set(serviceId, { ...svc, health });
      return { services: next };
    }),

  appendLog: (entry) =>
    set((prev) => ({
      logEntries: [...prev.logEntries, entry].slice(-MAX_LOG_ENTRIES),
    })),

  appendLogBatch: (entries) =>
    set((prev) => ({
      logEntries: [...prev.logEntries, ...entries].slice(-MAX_LOG_ENTRIES),
    })),

  clearLogs: () => set({ logEntries: [] }),

  setLogFilter: (filter) =>
    set((prev) => ({ logFilter: { ...prev.logFilter, ...filter } })),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  setError: (error) => set({ error }),

  setActiveProfile: (profile) => set({ activeProfile: profile }),

  sendCommand: (cmd) => {
    window.dispatchEvent(new CustomEvent('ws:send', { detail: cmd }));
  },

  dispatchEvent: (event) => {
    const store = get();
    switch (event.type) {
      case 'LAB_STATE':
        store.applyLabState(event.payload);
        break;
      case 'SERVICE_UPDATE':
        store.updateService(event.payload);
        break;
      case 'HEALTH_UPDATE':
        store.updateHealth(event.payload.serviceId, event.payload.health);
        break;
      case 'LOG_OUTPUT':
        store.appendLog(event.payload);
        break;
      case 'LOG_BATCH':
        store.appendLogBatch(event.payload);
        break;
      case 'PROFILE_STARTED':
        store.setActiveProfile(event.payload.profile);
        break;
      case 'ERROR':
        store.setError(event.payload.message);
        break;
    }
  },
}));
