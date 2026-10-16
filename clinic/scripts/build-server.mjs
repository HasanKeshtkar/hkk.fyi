// Bundles the server and its command-line scripts into dist/*.mjs, so production runs plain
// `node` (no TypeScript at runtime). npm packages stay external: they come from node_modules.
import { build } from 'esbuild';

await build({
  entryPoints: {
    server: 'src/server/index.ts',
    migrate: 'scripts/migrate.ts',
    seed: 'scripts/seed.ts',
    backup: 'scripts/backup.ts',
    restore: 'scripts/restore.ts',
  },
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node22',
  logLevel: 'info',
});
