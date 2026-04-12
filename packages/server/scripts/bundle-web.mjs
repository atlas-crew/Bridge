/**
 * Copies the built Vite frontend into packages/server/web-dist/
 * for inclusion in the published npm package.
 */
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(scriptDir, '..');
const repoRoot = resolve(serverDir, '..', '..');
const sourceDir = resolve(repoRoot, 'packages', 'web', 'dist');
const targetDir = resolve(serverDir, 'web-dist');

if (!existsSync(sourceDir)) {
  console.error('Web build not found at', sourceDir);
  console.error('Run "pnpm --filter @inferno-lab/web build" first.');
  process.exit(1);
}

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`Bundled web assets into ${targetDir}`);
