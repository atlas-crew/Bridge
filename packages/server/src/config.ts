import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { configSchema, type Config } from '@inferno-lab/shared';

/** Workspace root is two levels up from packages/server/src/ */
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function loadConfig(configPath?: string): Config {
  const resolvedPath = configPath
    ? resolve(configPath)
    : resolve(WORKSPACE_ROOT, 'config.yaml');
  const raw = readFileSync(resolvedPath, 'utf-8');
  const parsed = yaml.load(raw);
  return configSchema.parse(parsed);
}
