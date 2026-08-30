import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest replaces Jest. Notable mappings from the old Jest config in package.json:
// - `modulePaths: ['./src/client']` -> the `rsg-components` alias below (same alias Vite uses at runtime);
// - `setupFiles` (raf polyfill, `classes` helper, jest-dom) -> test/setup.ts;
// - `snapshotSerializers` -> test/deabsdeepSerializer.js (masks the repo root as `~`);
// - Jest ran everything in jsdom, so we keep jsdom as the default environment.
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: [
			{
				find: 'rsg-components',
				replacement: path.resolve(import.meta.dirname, 'src/client/rsg-components'),
			},
		],
	},
	test: {
		globals: true,
		environment: 'jsdom',
		environmentOptions: {
			jsdom: { url: 'http://localhost/' },
		},
		setupFiles: ['./test/setup.ts'],
		snapshotSerializers: ['./test/deabsdeepSerializer.js'],
		include: ['src/**/*.spec.{ts,tsx,js}'],
		exclude: ['**/node_modules/**', 'lib/**', 'examples/**', 'test/**', 'site/**'],
		// Several Node-side specs call `process.chdir()`, which is unsupported in worker threads.
		pool: 'forks',
		coverage: {
			provider: 'v8',
			include: ['src/**'],
			exclude: ['src/**/*.spec.*', 'src/**/__tests__/**', 'src/**/__mocks__/**', 'src/typings/**'],
		},
	},
});
