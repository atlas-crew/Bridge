import { Router, type Request, type Response } from 'express';
import type { Config } from '@inferno-lab/shared';
import type { ProcessManager } from './process-manager.js';
import type { HealthMonitor } from './health-monitor.js';
import type { Orchestrator } from './orchestrator.js';

interface RouteDeps {
  config: Config;
  processManager: ProcessManager;
  healthMonitor: HealthMonitor;
  orchestrator: Orchestrator;
}

/** Express 5 params can be string | string[] — extract first segment. */
function param(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? '';
  return val ?? '';
}

export function createRoutes({ config, processManager, healthMonitor, orchestrator }: RouteDeps): Router {
  const router = Router();

  // Dashboard health
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now(), lab: config.lab.name });
  });

  // List all services with status
  router.get('/api/services', (_req: Request, res: Response) => {
    const statuses = processManager.getAllStatuses().map((s) => ({
      ...s,
      health: healthMonitor.getHealth(s.id),
    }));
    res.json(statuses);
  });

  // Single service detail
  router.get('/api/services/:id', (req: Request, res: Response) => {
    const id = param(req.params.id);
    if (!config.services[id]) {
      res.status(404).json({ error: `Unknown service: ${id}` });
      return;
    }
    const status = processManager.getStatus(id);
    status.health = healthMonitor.getHealth(id);
    res.json(status);
  });

  // Start a service
  router.post('/api/services/:id/start', async (req: Request, res: Response) => {
    const id = param(req.params.id);
    if (!config.services[id]) {
      res.status(404).json({ error: `Unknown service: ${id}` });
      return;
    }
    try {
      await processManager.start(id);
      res.json({ ok: true, service: processManager.getStatus(id) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Stop a service
  router.post('/api/services/:id/stop', async (req: Request, res: Response) => {
    const id = param(req.params.id);
    if (!config.services[id]) {
      res.status(404).json({ error: `Unknown service: ${id}` });
      return;
    }
    try {
      await processManager.stop(id);
      res.json({ ok: true, service: processManager.getStatus(id) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Restart a service
  router.post('/api/services/:id/restart', async (req: Request, res: Response) => {
    const id = param(req.params.id);
    if (!config.services[id]) {
      res.status(404).json({ error: `Unknown service: ${id}` });
      return;
    }
    try {
      await processManager.restart(id);
      res.json({ ok: true, service: processManager.getStatus(id) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // List profiles
  router.get('/api/profiles', (_req: Request, res: Response) => {
    res.json(config.profiles);
  });

  // Start a profile
  router.post('/api/profiles/:name/start', async (req: Request, res: Response) => {
    const name = param(req.params.name);
    if (!config.profiles[name]) {
      res.status(404).json({ error: `Unknown profile: ${name}` });
      return;
    }
    try {
      await orchestrator.startProfile(name);
      res.json({ ok: true, profile: name, services: config.profiles[name]!.services });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Stop all services
  router.post('/api/stop-all', async (_req: Request, res: Response) => {
    try {
      await processManager.stopAll();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Read-only config
  router.get('/api/config', (_req: Request, res: Response) => {
    res.json(config);
  });

  return router;
}
