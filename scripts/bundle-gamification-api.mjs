import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('api/_lib', { recursive: true });

await esbuild.build({
  entryPoints: ['src/gamification/services/recalculateGamification.ts'],
  outfile: 'api/_lib/gamification.server.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'node20',
  logLevel: 'info',
});

console.log('Bundled api/_lib/gamification.server.mjs');
