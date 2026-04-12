import { z } from 'zod';

const healthCheckSchema = z.object({
  url: z.string().url(),
  intervalMs: z.number().int().positive().default(5000),
  timeoutMs: z.number().int().positive().default(3000),
});

const serviceConfigSchema = z.object({
  name: z.string(),
  cwd: z.string(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  healthCheck: healthCheckSchema,
  ports: z.record(z.string(), z.number().int().positive()),
  env: z.record(z.string(), z.string()).default({}),
  readyPattern: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
});

const profileSchema = z.object({
  description: z.string(),
  services: z.array(z.string()),
});

const labSchema = z.object({
  name: z.string().default('Lab'),
  shutdownGracePeriodMs: z.number().int().positive().default(10000),
});

export const configSchema = z.object({
  lab: labSchema,
  services: z.record(z.string(), serviceConfigSchema),
  profiles: z.record(z.string(), profileSchema).default({}),
});

export type Config = z.infer<typeof configSchema>;
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
export type HealthCheckConfig = z.infer<typeof healthCheckSchema>;
