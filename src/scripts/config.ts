import fs from 'node:fs';
import path from 'node:path';
import isString from 'lodash/isString.js';
import isPlainObject from 'lodash/isPlainObject.js';
import schema from './schemas/config.js';
import StyleguidistError from './utils/error.js';
import sanitizeConfig from './utils/sanitizeConfig.js';
import loadModule from './utils/loadModule.js';
import type * as Rsg from '../typings/index.js';

// Config file names looked up (in this order) in the current directory and its parents.
export const CONFIG_FILENAMES = [
	'styleguide.config.js',
	'styleguide.config.mjs',
	'styleguide.config.cjs',
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
		config = loadModule<Rsg.StyleguidistConfig>(configFilepath);
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
		return {} as any;
	}

	if (update) {
		config = update(config);
	}

	const configDir = configFilepath ? path.dirname(configFilepath) : process.cwd();

	try {
		return sanitizeConfig(config, schema, configDir) as any;
	} catch (exception) {
		if (exception instanceof StyleguidistError) {
			throw new StyleguidistError(
				`Something is wrong with your style guide config\n\n${exception.message}`,
				exception.extra
			);
		} else {
			throw exception;
		}
	}
}

export default getConfig;
