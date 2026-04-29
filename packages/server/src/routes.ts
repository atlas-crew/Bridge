import { Router, type Request, type Response } from 'express';
import { configSchema, type Config } from '@bridge/shared';
import type { ProcessManager } from './process-manager.js';
import type { HealthMonitor } from './health-monitor.js';
import type { Orchestrator } from './orchestrator.js';
import { saveConfig } from './config.js';

interface RouteDeps {
  configPath?: string;
  processManager: ProcessManager;
  healthMonitor: HealthMonitor;
  orchestrator: Orchestrator;
}

/** Express 5 params can be string | string[] — extract first segment. */
function param(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? '';
  return val ?? '';
}

export function createRoutes({ configPath, processManager, healthMonitor, orchestrator }: RouteDeps): Router {
  const router = Router();

  // Dashboard health
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now(), lab: orchestrator.config.lab.name });
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
    if (!orchestrator.config.services[id]) {
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
    if (!orchestrator.config.services[id]) {
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
    if (!orchestrator.config.services[id]) {
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
    if (!orchestrator.config.services[id]) {
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
    res.json(orchestrator.config.profiles);
  });

  // Create or update a profile
  router.post('/api/profiles', (req: Request, res: Response) => {
    const body = req.body as {
      name?: unknown;
      description?: unknown;
      services?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name : '';
    const description = typeof body.description === 'string' ? body.description : '';
    const services = Array.isArray(body.services) ? body.services : null;

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) {
      res.status(400).json({ error: 'Profile name must be 1–64 chars of letters, digits, hyphen, or underscore' });
      return;
    }
    if (!services || services.length === 0 || !services.every((s): s is string => typeof s === 'string')) {
      res.status(400).json({ error: 'services must be a non-empty array of service ids' });
      return;
    }
    const unknown = services.filter((id) => !orchestrator.config.services[id]);
    if (unknown.length > 0) {
      res.status(400).json({ error: `Unknown service id(s): ${unknown.join(', ')}` });
      return;
    }

    const newConfig = {
      ...orchestrator.config,
      profiles: {
        ...orchestrator.config.profiles,
        [name]: {
          description: description || `Saved at ${new Date().toISOString()}`,
          services,
        },
      },
    };

    try {
      const validated = configSchema.parse(newConfig);
      saveConfig(validated, configPath);
      res.json({ ok: true, profile: name });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Start a profile
  router.post('/api/profiles/:name/start', async (req: Request, res: Response) => {
    const name = param(req.params.name);
    if (!orchestrator.config.profiles[name]) {
      res.status(404).json({ error: `Unknown profile: ${name}` });
      return;
    }
    try {
      await orchestrator.startProfile(name);
      res.json({ ok: true, profile: name, services: orchestrator.config.profiles[name]!.services });
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
    res.json(orchestrator.config);
  });

  // Update config
  router.put('/api/config', (req: Request, res: Response) => {
    try {
      const newConfig = configSchema.parse(req.body);
      saveConfig(newConfig, configPath);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}
