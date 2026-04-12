import type { WebSocketServer, WebSocket } from 'ws';
import type {
  Config,
  ClientCommand,
  ServerEvent,
  ServiceStatus,
  HealthStatus,
  LogEntry,
  LabState,
} from '@inferno-lab/shared';
import type { ProcessManager } from './process-manager.js';
import type { HealthMonitor } from './health-monitor.js';
import type { Orchestrator } from './orchestrator.js';

interface ClientState {
  ws: WebSocket;
  logSubscriptions: Set<string>;
}

interface WsHandlerDeps {
  config: Config;
  processManager: ProcessManager;
  healthMonitor: HealthMonitor;
  orchestrator: Orchestrator;
}

export function setupWebSocket(
  wss: WebSocketServer,
  { config, processManager, healthMonitor, orchestrator }: WsHandlerDeps,
): void {
  const clients = new Set<ClientState>();

  function broadcast(event: ServerEvent): void {
    const data = JSON.stringify(event);
    for (const client of clients) {
      if (client.ws.readyState === client.ws.OPEN) {
        client.ws.send(data);
      }
    }
  }

  function sendTo(client: ClientState, event: ServerEvent): void {
    if (client.ws.readyState === client.ws.OPEN) {
      client.ws.send(JSON.stringify(event));
    }
  }

  function buildLabState(): LabState {
    const statuses = processManager.getAllStatuses().map((s) => ({
      ...s,
      health: healthMonitor.getHealth(s.id),
    }));

    return {
      services: statuses,
      activeProfile: orchestrator.getActiveProfile(),
      profiles: config.profiles,
      labName: config.lab.name,
    };
  }

  // Forward process manager events to WS clients
  processManager.on('stateChange', (status: ServiceStatus) => {
    const enriched = { ...status, health: healthMonitor.getHealth(status.id) };
    broadcast({ type: 'SERVICE_UPDATE', payload: enriched });
  });

  processManager.on('log', (entry: LogEntry) => {
    for (const client of clients) {
      if (client.logSubscriptions.has(entry.serviceId)) {
        sendTo(client, { type: 'LOG_OUTPUT', payload: entry });
      }
    }
  });

  healthMonitor.on('health', ({ serviceId, health }: { serviceId: string; health: HealthStatus }) => {
    broadcast({ type: 'HEALTH_UPDATE', payload: { serviceId, health } });
  });

  wss.on('connection', (ws: WebSocket) => {
    const client: ClientState = { ws, logSubscriptions: new Set() };
    clients.add(client);

    // Full snapshot on connect
    sendTo(client, { type: 'LAB_STATE', payload: buildLabState() });

    ws.on('message', async (raw) => {
      let cmd: ClientCommand;
      try {
        cmd = JSON.parse(raw.toString());
      } catch {
        sendTo(client, { type: 'ERROR', payload: { message: 'Invalid JSON' } });
        return;
      }

      try {
        switch (cmd.type) {
          case 'START_SERVICE':
            await processManager.start(cmd.payload.serviceId);
            break;

          case 'STOP_SERVICE':
            await processManager.stop(cmd.payload.serviceId);
            break;

          case 'RESTART_SERVICE':
            await processManager.restart(cmd.payload.serviceId);
            break;

          case 'START_PROFILE': {
            const name = cmd.payload.profile;
            await orchestrator.startProfile(name);
            broadcast({
              type: 'PROFILE_STARTED',
              payload: { profile: name, services: config.profiles[name]!.services },
            });
            break;
          }

          case 'STOP_ALL':
            await processManager.stopAll();
            break;

          case 'SUBSCRIBE_LOGS':
            for (const id of cmd.payload.serviceIds) {
              client.logSubscriptions.add(id);
              const entries = processManager.getLogBuffer(id).getAll();
              if (entries.length > 0) {
                sendTo(client, { type: 'LOG_BATCH', payload: entries });
              }
            }
            break;

          case 'UNSUBSCRIBE_LOGS':
            for (const id of cmd.payload.serviceIds) {
              client.logSubscriptions.delete(id);
            }
            break;
        }
      } catch (err) {
        sendTo(client, {
          type: 'ERROR',
          payload: { message: (err as Error).message },
        });
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });
  });
}
