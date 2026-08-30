import fs from 'node:fs';
import path from 'node:path';
import { build as viteBuild } from 'vite';
import type { Rolldown } from 'vite';
import makeViteConfig from './make-vite-config.js';
import type * as Rsg from '../typings/index.js';

// Spelled out via Vite’s re-exported types: inferring it from `viteBuild` would
// leak `import("rolldown")` into the published .d.ts, and consumers don’t have
// rolldown in their node_modules (vite is a dependency, so `import("vite")` is fine)
export type BuildOutput =
	Rolldown.RolldownOutput | Rolldown.RolldownOutput[] | Rolldown.RolldownWatcher;

/**
 * Build a static style guide into `config.styleguideDir`.
 *
 * Returns a promise; the optional Node-style callback is kept for API compatibility.
 */
export default async function build(
	config: Rsg.SanitizedStyleguidistConfig,
	callback?: (err: Error | null, output?: BuildOutput) => void
): Promise<BuildOutput | undefined> {
	try {
		// Like the old CleanWebpackPlugin setup, only the `build/` folder is emptied:
		// users keep other files (CNAME, .nojekyll, ...) in the style guide folder
		fs.rmSync(path.join(config.styleguideDir, 'build'), { recursive: true, force: true });

		const viteConfig = await makeViteConfig(config, 'production');
		const output = await viteBuild(viteConfig);
		if (callback) {
			callback(null, output);
		}
		return output;
	} catch (err) {
		if (callback) {
			callback(err as Error);
			return undefined;
		}
		throw err;
	}
}
