import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry (for dev / programmatic use)
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    target: 'node22',
    external: ['@inferno-lab/shared'],
  },
  // CLI binary (for npm global install)
  {
    entry: ['src/bin.ts'],
    format: ['esm'],
    target: 'node22',
    // Shebang is in the source file — tsup preserves it
    noExternal: ['@inferno-lab/shared'],
  },
]);
