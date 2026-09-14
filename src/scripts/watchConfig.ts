import path from 'node:path';
import type { InlineConfig, ViteDevServer } from 'vite';
import makeViteConfig from './make-vite-config.js';
import { getConfigFilepath, reloadConfig } from './config.js';
import StyleguidistError from './utils/error.js';
import type * as Rsg from '../typings/index.js';

/** What a config file change ended up doing. */
export type ConfigChangeOutcome =
	/** The dev server is running with the new config. */
	| 'restarted'
	/** The new config file is broken; the dev server keeps running with the old one. */
	| 'invalid'
	/** The config was read but the dev server could not be restarted with it. */
	| 'failed';

export interface ConfigChangeOptions {
	/** Name of the config file, as it should appear in the messages. */
	filename: string;
	/** Read the config file again. Throws when the file has become invalid. */
	reload: () => Rsg.SanitizedStyleguidistConfig;
	/** Restart the dev server with the config that was just read. */
	restart: (config: Rsg.SanitizedStyleguidistConfig) => Promise<void>;
	log: (message: string) => void;
	logError: (message: string) => void;
}

/**
 * A config error is the user’s own mistake and its message is written for them; anything
 * else is a bug (ours or a plugin’s) and only its stack says where.
 */
function describeError(err: unknown): string {
	if (err instanceof StyleguidistError) {
		return err.message;
	}
	return String((err instanceof Error && err.stack) || err);
}

/**
 * Decide what happens when the config file changes: read it, and restart the dev server
 * with what came out — unless it cannot be read, in which case the running style guide is
 * left alone. A typo saved halfway through an edit must not take the dev server down.
 *
 * Kept separate from the watching itself so that it can be tested without a server.
 */
export async function handleConfigChange({
	filename,
	reload,
	restart,
	log,
	logError,
}: ConfigChangeOptions): Promise<ConfigChangeOutcome> {
	let config: Rsg.SanitizedStyleguidistConfig;
	try {
		config = reload();
	} catch (err) {
		logError(
			`${filename} has an error, the style guide is still running with the previous config:\n${describeError(
				err
			)}`
		);
		return 'invalid';
	}

	log(`${filename} changed, restarting the style guide...`);

	try {
		await restart(config);
	} catch (err) {
		logError(`Cannot restart the style guide:\n${describeError(err)}`);
		return 'failed';
	}

	return 'restarted';
}

/**
 * Whether Vite’s dev server can be restarted the way `restartWithConfig` below does it.
 *
 * `server.restart()` builds the new server from `server.config.inlineConfig` — the very
 * object `createServer()` was given — and then copies it onto the server object the caller
 * already has. Replacing the contents of that object is therefore all it takes to restart a
 * style guide with a new config, and the dev server the Node API returned keeps working. If
 * a future Vite ever stops doing that the style guide would restart into its old config,
 * which is a silent lie, so the shape is checked before anything is watched.
 */
function canRestart(devServer: ViteDevServer): boolean {
	return (
		typeof devServer.restart === 'function' &&
		!!devServer.config.inlineConfig &&
		typeof devServer.config.inlineConfig === 'object'
	);
}

/**
 * Watch the config file a style guide was started from and restart the dev server whenever
 * it changes. Does nothing when the config was passed as an object, which is the only thing
 * a Node API caller that never wrote a config file can observe.
 */
export default function watchConfig(
	config: Rsg.SanitizedStyleguidistConfig,
	devServer: ViteDevServer
): void {
	const filepath = getConfigFilepath(config);
	if (!filepath) {
		return;
	}

	const { logger } = devServer.config;
	if (!canRestart(devServer)) {
		logger.warn(
			'Cannot watch the style guide config with this version of Vite, ' +
				'restart the dev server by hand after changing it.',
			{ timestamp: true }
		);
		return;
	}

	const restartWithConfig = async (nextConfig: Rsg.SanitizedStyleguidistConfig) => {
		const viteConfig = await makeViteConfig(nextConfig, 'development');
		const { inlineConfig } = devServer.config;
		// Empty first: an option the edited config no longer sets has to go away, not linger
		for (const key of Object.keys(inlineConfig)) {
			delete inlineConfig[key as keyof InlineConfig];
		}
		Object.assign(inlineConfig, viteConfig);
		await devServer.restart();
		// Every restart hands the server a new watcher, so the watch is set up again from
		// scratch — with the config that is now running, which is the one to reload next time
		watchConfig(nextConfig, devServer);
	};

	const filename = path.relative(process.cwd(), filepath);
	// A save can reach the watcher as more than one event, and two restarts at once would
	// fight over the same port: let each change wait for the one before it
	let queue: Promise<unknown> = Promise.resolve();

	devServer.watcher.on('change', (changedPath: string) => {
		// Everything else the style guide watches (components, examples) is already handled by
		// Vite; `path.resolve` because a watcher may report the file with `/` separators
		if (path.resolve(changedPath) !== filepath) {
			return;
		}
		queue = queue.then(() =>
			handleConfigChange({
				filename,
				reload: () => reloadConfig(config),
				restart: restartWithConfig,
				log: (message) => logger.info(message, { timestamp: true }),
				logError: (message) => logger.error(message, { timestamp: true }),
			})
		);
	});

	// The config file is usually inside the project Vite already watches, but a `--config`
	// pointing somewhere else is not
	devServer.watcher.add(filepath);
}
