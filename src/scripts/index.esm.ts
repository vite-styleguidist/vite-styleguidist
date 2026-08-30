import type { InlineConfig, ViteDevServer } from 'vite';
import makeViteConfig from './make-vite-config.js';
import build from './build.js';
import type { BuildOutput } from './build.js';
import server from './server.js';
import getConfig from './config.js';
import setupLogger from './logger.js';
import type * as Rsg from '../typings/index.js';

/**
 * Initialize Styleguide API.
 *
 * @param {object} [config] Styleguidist config.
 * @returns {object} API.
 */
export default function styleguidist(configArg?: Rsg.StyleguidistConfig | string) {
	const config = getConfig(configArg, (conf) => {
		setupLogger(conf.logger as Record<string, (msg: string) => void>, conf.verbose, {});
		return conf;
	});

	return {
		/**
		 * Build style guide.
		 *
		 * @param {Function} [callback] callback(err, config, output).
		 * @return {Promise} Resolves to Vite’s build output.
		 */
		build(
			callback?: (
				err: Error | null,
				styleguidistConfig: Rsg.SanitizedStyleguidistConfig,
				output?: BuildOutput
			) => void
		) {
			return build(config, callback && ((err, output) => callback(err, config, output)));
		},

		/**
		 * Start style guide dev server.
		 *
		 * @param {Function} [callback] callback(err, config, server).
		 * @return {Promise} Resolves to the Vite dev server.
		 */
		server(
			callback?: (
				err: Error | undefined,
				styleguidistConfig: Rsg.SanitizedStyleguidistConfig,
				server?: ViteDevServer
			) => void
		) {
			return server(config, callback && ((err, devServer) => callback(err, config, devServer)));
		},

		/**
		 * Return Styleguidist Vite config.
		 *
		 * @param {string} [env=production] 'production' or 'development'.
		 * @return {Promise<object>}
		 */
		makeViteConfig(env: Rsg.StyleguidistEnv = 'production'): Promise<InlineConfig> {
			return makeViteConfig(config, env);
		},

		/**
		 * Normalized style guide config.
		 */
		config,
	};
}
