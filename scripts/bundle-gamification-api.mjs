import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('api/lib', { recursive: true });

await esbuild.build({
  entryPoints: ['src/gamification/services/recalculateGamification.ts'],
  outfile: 'api/lib/gamification.server.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'node20',
  logLevel: 'info',
});

console.log('Bundled api/lib/gamification.server.mjs');
