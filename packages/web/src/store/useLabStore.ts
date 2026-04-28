import { create } from 'zustand';
import type {
  ServiceStatus,
  HealthStatus,
  LogEntry,
  ProfileConfig,
  LabState,
  ServerEvent,
  Config,
} from '@bridge/shared';

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
  config: Config | null;

  // UI
  wsConnected: boolean;
  error: string | null;
  activeView: 'dashboard' | 'config';
  isAutoScroll: boolean;
  logPanelHeight: number;

  // Logs
  logEntries: LogEntry[];
  logFilter: LogFilter;

  // Actions — state updates
  applyLabState: (state: LabState) => void;
  updateService: (status: ServiceStatus) => void;
  updateHealth: (serviceId: string, health: HealthStatus) => void;
  updateResources: (serviceId: string, resources: { cpuPercent: number; memoryBytes: number; lastUpdated: number }) => void;
  updateConfig: (config: Config) => void;
  setActiveView: (view: 'dashboard' | 'config') => void;
  setAutoScroll: (enabled: boolean) => void;
  setLogPanelHeight: (height: number) => void;
  saveConfig: (config: Config) => Promise<void>;
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
const DEFAULT_LOG_HEIGHT = 300;

export const useLabStore = create<LabStore>((set, get) => ({
  services: new Map(),
  profiles: {},
  activeProfile: null,
  labName: 'Command Plane',
  config: null,
  wsConnected: false,
  error: null,
  activeView: 'dashboard',
  isAutoScroll: true,
  logPanelHeight: DEFAULT_LOG_HEIGHT,
  logEntries: [],
  logFilter: { serviceId: null, stream: 'all', search: '' },

  applyLabState: (state) =>
    set({
      services: new Map(state.services.map((s) => [s.id, s])),
      profiles: state.profiles,
      activeProfile: state.activeProfile,
      labName: state.labName,
      config: state.config,
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

  updateResources: (serviceId, resources) =>
    set((prev) => {
      const next = new Map(prev.services);
      const svc = next.get(serviceId);
      if (svc) next.set(serviceId, { ...svc, resources });
      return { services: next };
    }),

  updateConfig: (config) =>
    set({
      config,
      profiles: config.profiles,
      labName: config.lab.name,
    }),

  setActiveView: (view) => set({ activeView: view }),

  setAutoScroll: (enabled) => set({ isAutoScroll: enabled }),

  setLogPanelHeight: (height) => {
    const minHeight = 100;
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 800;
    set({ logPanelHeight: Math.max(minHeight, Math.min(height, maxHeight)) });
  },

  saveConfig: async (config) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save configuration');
    }
  },

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
      case 'RESOURCES_UPDATE':
        store.updateResources(event.payload.serviceId, event.payload.resources);
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
      case 'CONFIG_RELOADED':
        store.updateConfig(event.payload.config);
        break;
      case 'ERROR':
        store.setError(event.payload.message);
        break;
    }
  },
}));
