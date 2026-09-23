import { build } from 'esbuild';
import { mkdir, cp } from 'node:fs/promises';
await build({ entryPoints: ['scripts/worker-entry.ts'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'neutral', conditions: ['workerd', 'worker', 'browser', 'module'], mainFields: ['module', 'main'], define: { 'process.env.NODE_ENV': '"production"' }, logOverride: { 'ignored-bare-import': 'silent' }, target: 'es2022', external: ['node:*'], alias: { stream: './scripts/stream-shim.ts' }, splitting: false, sourcemap: false });
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
