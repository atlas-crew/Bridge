import { readFileSync, writeFileSync, watch } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { configSchema, type Config } from '@bridge/shared';

/** Workspace root is two levels up from packages/server/src/ */
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function loadConfig(configPath?: string): Config {
  const resolvedPath = getResolvedConfigPath(configPath);
  const raw = readFileSync(resolvedPath, 'utf-8');
  const parsed = yaml.load(raw);
  return configSchema.parse(parsed);
}

export function saveConfig(config: Config, configPath?: string): void {
  const resolvedPath = getResolvedConfigPath(configPath);
  const dumped = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  writeFileSync(resolvedPath, dumped, 'utf-8');
}

export function watchConfig(configPath: string | undefined, onUpdate: (config: Config) => void) {
  const resolvedPath = getResolvedConfigPath(configPath);
  const configDir = dirname(resolvedPath);
  const configFile = basename(resolvedPath);
  let debounceTimer: NodeJS.Timeout | null = null;

  const handleUpdate = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        const newConfig = loadConfig(configPath);
        onUpdate(newConfig);
        console.log(`[Config] Reloaded from ${resolvedPath}`);
      } catch (err) {
        console.error(`[Config] Failed to reload config: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 100);
  };

  const watcher = watch(configDir, (event, filename) => {
    if (filename === configFile) {
      handleUpdate();
    }
  });

  return () => watcher.close();
}

export function getResolvedConfigPath(configPath?: string): string {
  return configPath
    ? resolve(configPath)
    : resolve(WORKSPACE_ROOT, 'config.yaml');
}
