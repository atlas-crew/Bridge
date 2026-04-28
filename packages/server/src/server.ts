import { createServer } from 'http';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import type { Config } from '@bridge/shared';
import { ProcessManager } from './process-manager.js';
import { HealthMonitor } from './health-monitor.js';
import { Orchestrator } from './orchestrator.js';
import { ResourceMonitor } from './resource-monitor.js';
import { createRoutes } from './routes.js';
import { setupWebSocket } from './ws-handler.js';
import { watchConfig } from './config.js';
import { loadPrefs } from './prefs.js';
import { isLocalOrigin } from './utils.js';

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

export async function startServer(
  config: Config,
  port: number,
  configPath?: string,
): Promise<ServerHandle> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Simple origin guard for personal tool framing
  app.use((req, res, next) => {
    if (!isLocalOrigin(req.headers.origin)) {
      console.warn(`[Security] Blocked request from non-local origin: ${req.headers.origin}`);
      res.status(403).json({ error: 'Forbidden: Cross-site requests blocked' });
      return;
    }
    next();
  });

  const processManager = new ProcessManager(config);
  const healthMonitor = new HealthMonitor(config, processManager);
  const orchestrator = new Orchestrator(config, processManager);
  const resourceMonitor = new ResourceMonitor(processManager);

  resourceMonitor.start();

  const routes = createRoutes({ configPath, processManager, healthMonitor, orchestrator });
  app.use(routes);

  console.log(`[Server] Mode: ${process.env.NODE_ENV || 'production'}`);
  console.log(`[Server] Web Dist: ${WEB_DIST} (${existsSync(WEB_DIST) ? 'exists' : 'MISSING'})`);

  // In development, redirect root to the Vite dev server
  if (process.env.NODE_ENV === 'development') {
    app.get('/', (_req, res) => {
      res.redirect('http://localhost:4201');
    });
  }

  // Serve Vite production build if available (production mode)
  if (process.env.NODE_ENV !== 'development' && existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    // SPA fallback — serve index.html for non-API routes
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(resolve(WEB_DIST, 'index.html'));
    });
  }

  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const wsHandler = setupWebSocket(wss, {
    config,
    processManager,
    healthMonitor,
    orchestrator,
    resourceMonitor,
  });

  server.on('upgrade', (request, socket, head) => {
    if (!isLocalOrigin(request.headers.origin)) {
      console.warn(`[Security] Blocked WS upgrade from non-local origin: ${request.headers.origin}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    // Accept all WebSocket upgrades on any path
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve());
  });

  // Load preferences and start last profile if requested
  const prefs = loadPrefs();
  if (prefs.lastProfile && config.profiles[prefs.lastProfile]) {
    console.log(`[Server] Starting last-used profile: ${prefs.lastProfile}`);
    orchestrator.startProfile(prefs.lastProfile).catch((err) => {
      console.error(`[Server] Failed to start last-used profile: ${err.message}`);
    });
  }

  const stopWatching = watchConfig(configPath, (newConfig) => {
    // Update wsHandler first so subsequent broadcasts use the new config
    wsHandler.updateConfig(newConfig);
    
    // Update others
    processManager.updateConfig(newConfig); // This emits stateChange which triggers a broadcast
    healthMonitor.updateConfig(newConfig);
    orchestrator.updateConfig(newConfig);
  });

  console.log(`${config.lab.name}`);
  console.log(`  Dashboard:  http://localhost:${port}`);
  console.log(`  API:        http://localhost:${port}/api/services`);
  console.log(`  WebSocket:  ws://localhost:${port}`);
  console.log(`  Services:   ${Object.keys(config.services).join(', ')}`);
  console.log(`  Profiles:   ${Object.keys(config.profiles).join(', ')}`);

  const close = async () => {
    stopWatching();
    healthMonitor.stopAll();
    resourceMonitor.stop();
    await processManager.stopAll();
    wss.close();
    server.close();
  };

  return { processManager, healthMonitor, orchestrator, close };
}
