import fs from 'node:fs';
import path from 'node:path';
import isString from 'lodash/isString.js';
import isPlainObject from 'lodash/isPlainObject.js';
import schema from './schemas/config.js';
import StyleguidistError from './utils/error.js';
import {
	collectConfigProblems,
	configProblemsToError,
	type ConfigProblem,
} from './utils/sanitizeConfig.js';
import loadConfigFile from './utils/loadConfigFile.js';
import type * as Rsg from '../typings/index.js';

// Config file names looked up (in this order) in the current directory and its parents.
// The TypeScript ones come last so that a project that has both keeps loading the file it
// has always loaded.
export const CONFIG_FILENAMES = [
	'styleguide.config.js',
	'styleguide.config.mjs',
	'styleguide.config.cjs',
	'styleguide.config.ts',
	'styleguide.config.mts',
	'styleguide.config.cts',
];

/**
 * Try to find config file up the file tree.
 *
 * @return {string|boolean} Config absolute file path.
 */
function findConfigFile(): string | false {
	let dir = process.cwd();
	for (;;) {
		for (const name of CONFIG_FILENAMES) {
			const candidate = path.join(dir, name);
			if (fs.existsSync(candidate)) {
				return candidate;
			}
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			return false;
		}
		dir = parent;
	}
}

export interface LoadedConfig {
	/**
	 * The sanitized config. Options that failed validation keep whatever the user wrote, so
	 * this is only safe to *run* when `problems` has no errors in it.
	 */
	config: Rsg.SanitizedStyleguidistConfig;
	/** Everything wrong with the config, in the order the options are validated */
	problems: ConfigProblem[];
	/** Absolute path of the config file that was read, false when the config came from a caller */
	configFilepath: string | false;
}

/**
 * Read and parse a config file (or take a config object) and validate it in *collect* mode:
 * every problem is reported instead of only the first one, and none of them throws.
 *
 * This is what `styleguidist doctor` runs on; `getConfig` below is the same thing plus the
 * throw. Problems with *finding or reading* the file still throw here: without a config there
 * is nothing to validate.
 *
 * @param {object|string} [config] All config options or config file name or nothing.
 * @param {function} [update] Change config object before running validation on it.
 * @returns {object}
 */
export function loadConfig(
	config?: string | Rsg.StyleguidistConfig,
	update?: (conf: Rsg.StyleguidistConfig) => Rsg.StyleguidistConfig
): LoadedConfig {
	let configFilepath: string | false = false;
	if (isString(config)) {
		// Load config from a given file
		configFilepath = path.resolve(process.cwd(), config);
		if (!fs.existsSync(configFilepath)) {
			throw new StyleguidistError('Styleguidist config not found: ' + configFilepath + '.');
		}
		config = {};
	} else if (!isPlainObject(config)) {
		// Try to read config options from a file
		configFilepath = findConfigFile();
		config = {};
	}

	if (configFilepath) {
		config = loadConfigFile<Rsg.StyleguidistConfig>(configFilepath);
		// Anything but a config object would silently fall through to all defaults
		if (typeof config === 'function' || typeof (config as any)?.then === 'function') {
			throw new StyleguidistError(
				`Styleguidist config must export a plain object; functions and promises (async configs) are not supported: ${configFilepath}`
			);
		}
		if (!config || typeof config !== 'object') {
			throw new StyleguidistError(
				`Styleguidist config must export an object (did you forget \`export default\`?): ${configFilepath}`
			);
		}
	}

	if (!config || isString(config)) {
		return { config: {} as any, problems: [], configFilepath };
	}

	if (update) {
		config = update(config);
	}

	const configDir = configFilepath ? path.dirname(configFilepath) : process.cwd();

	const collected = collectConfigProblems(config, schema, configDir);
	return { config: collected.config as any, problems: collected.problems, configFilepath };
}

/**
 * Read, parse and validate config file or passed config.
 *
 * @param {object|string} [config] All config options or config file name or nothing.
 * @param {function} [update] Change config object before running validation on it.
 * @returns {object}
 */
function getConfig(
	config?: string | Rsg.StyleguidistConfig,
	update?: (conf: Rsg.StyleguidistConfig) => Rsg.StyleguidistConfig
): Rsg.SanitizedStyleguidistConfig {
	const loaded = loadConfig(config, update);

	const exception = configProblemsToError(loaded.problems);
	if (exception) {
		throw new StyleguidistError(
			`Something is wrong with your style guide config\n\n${exception.message}`,
			exception.extra
		);
	}

	return loaded.config;
}

export default getConfig;
