import { loadConfig } from './config.js';
import { startServer } from './server.js';

const PORT = parseInt(process.env.PORT ?? '4200', 10);
const CONFIG_PATH = process.env.CONFIG_PATH ?? undefined;

const config = loadConfig(CONFIG_PATH);
const handle = await startServer(config, PORT);

// Graceful shutdown — cascade stop-all to child processes
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await handle.close();
    process.exit(0);
  });
}
