import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import makeViteConfig from './make-vite-config.js';
import watchConfig from './watchConfig.js';
import type * as Rsg from '../typings/index.js';

/**
 * Start the style guide dev server.
 *
 * Returns a promise resolving to the Vite dev server (already listening); the
 * optional Node-style callback is kept for API compatibility.
 */
export default async function server(
	config: Rsg.SanitizedStyleguidistConfig,
	callback?: (err?: Error, server?: ViteDevServer) => void
): Promise<ViteDevServer | undefined> {
	try {
		const viteConfig = await makeViteConfig(config, 'development');
		const devServer = await createServer(viteConfig);
		await devServer.listen();
		try {
			// Reloading a changed config file is a convenience; a style guide that is already
			// serving must not fail to start because the watch could not be set up
			watchConfig(config, devServer);
		} catch (err) {
			devServer.config.logger.warn(
				`Cannot watch the style guide config: ${(err as Error).message}`,
				{ timestamp: true }
			);
		}
		if (callback) {
			callback(undefined, devServer);
		}
		return devServer;
	} catch (err) {
		// Vite swallows the EADDRINUSE code behind a plain Error (strictPort is on);
		// restore it so callers (the CLI) can show the “change serverPort” hint.
		// The message is Vite’s untranslated text, pinned since Vite 8.
		if (err instanceof Error && /is already in use/.test(err.message)) {
			(err as NodeJS.ErrnoException).code = 'EADDRINUSE';
		}
		if (callback) {
			callback(err as Error);
			return undefined;
		}
		throw err;
	}
}
