#!/usr/bin/env node

import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { startServer } from './server.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Default to packaged config if no override
const configPath = process.env.CONFIG_PATH
  ?? (existsSync(resolve(process.cwd(), 'config.yaml'))
    ? resolve(process.cwd(), 'config.yaml')
    : resolve(packageRoot, 'config.yaml'));

const [command = 'start'] = process.argv.slice(2);

if (command === 'start' || command === 'serve') {
  const port = parseInt(process.env.PORT ?? '4200', 10);

  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    console.error('Create a config.yaml or set CONFIG_PATH environment variable.');
    process.exit(1);
  }

  const config = loadConfig(configPath);
  const handle = await startServer(config, port, configPath);

  const shutdown = () => {
    console.log('\nShutting down...');
    void handle.close().finally(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`Usage: bridge [start|serve|help]

start, serve  Start the Bridge orchestration server (default)
help          Show this help message

Environment:
  PORT          Dashboard port (default: 4200)
  CONFIG_PATH   Path to config.yaml
`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
