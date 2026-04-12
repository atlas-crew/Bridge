import { createServer } from 'http';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import type { Config } from '@inferno-lab/shared';
import { ProcessManager } from './process-manager.js';
import { HealthMonitor } from './health-monitor.js';
import { Orchestrator } from './orchestrator.js';
import { createRoutes } from './routes.js';
import { setupWebSocket } from './ws-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve web assets: packaged (web-dist/) takes priority, then dev (../web/dist/)
const WEB_DIST_PACKAGED = resolve(__dirname, '..', 'web-dist');
const WEB_DIST_DEV = resolve(__dirname, '..', '..', 'web', 'dist');
const WEB_DIST = existsSync(WEB_DIST_PACKAGED) ? WEB_DIST_PACKAGED : WEB_DIST_DEV;

export interface ServerHandle {
  processManager: ProcessManager;
  healthMonitor: HealthMonitor;
  orchestrator: Orchestrator;
  close: () => Promise<void>;
}

export async function startServer(config: Config, port: number): Promise<ServerHandle> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const processManager = new ProcessManager(config);
  const healthMonitor = new HealthMonitor(config, processManager);
  const orchestrator = new Orchestrator(config, processManager);

  const routes = createRoutes({ config, processManager, healthMonitor, orchestrator });
  app.use(routes);

  // Serve Vite production build if available (production mode)
  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    // SPA fallback — serve index.html for non-API routes
    // Express 5 requires named wildcard params
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(resolve(WEB_DIST, 'index.html'));
    });
  }

  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  setupWebSocket(wss, { config, processManager, healthMonitor, orchestrator });

  server.on('upgrade', (request, socket, head) => {
    // Accept all WebSocket upgrades on any path
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
  });

  console.log(`${config.lab.name}`);
  console.log(`  Dashboard:  http://localhost:${port}`);
  console.log(`  API:        http://localhost:${port}/api/services`);
  console.log(`  WebSocket:  ws://localhost:${port}`);
  console.log(`  Services:   ${Object.keys(config.services).join(', ')}`);
  console.log(`  Profiles:   ${Object.keys(config.profiles).join(', ')}`);

  const close = async () => {
    healthMonitor.stopAll();
    await processManager.stopAll();
    wss.close();
    server.close();
  };

  return { processManager, healthMonitor, orchestrator, close };
}
