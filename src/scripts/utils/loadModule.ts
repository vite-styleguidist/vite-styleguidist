import { createRequire } from 'node:module';
import StyleguidistError from './error.js';

// Styleguidist itself is ESM, but user config files are loaded synchronously via
// `require()` so that the public API (`styleguidist(config)`) can stay synchronous.
// Node >= 20.19 / 22.12 can `require()` ES modules too (as long as they don't use
// top-level await), so both CommonJS and ESM config files work.
const require = createRequire(import.meta.url);

export interface LoadModuleOptions {
	/**
	 * Path to name in error messages when it isn’t the file being required. A TypeScript
	 * config is transpiled to a temporary sibling file (see loadTypeScriptModule.ts) that the
	 * user has never seen, so the errors have to point at the original `.ts` file instead.
	 */
	sourcePath?: string;
	/** File name the CommonJS-in-an-ES-module hint tells the user to rename their config to. */
	commonjsFilename?: string;
}

/**
 * Synchronously load a user module (CommonJS or ESM) and return its default export.
 */
export default function loadModule<T = any>(
	filepath: string,
	{ sourcePath = filepath, commonjsFilename = 'styleguide.config.cjs' }: LoadModuleOptions = {}
): T {
	let mod: any;
	try {
		mod = require(filepath);
	} catch (err: any) {
		if (err && err.code === 'ERR_REQUIRE_ASYNC_MODULE') {
			throw new StyleguidistError(
				`Cannot load ${sourcePath}: ES modules using top-level await are not supported in Styleguidist config files.`
			);
		}
		// A CommonJS file in a `"type": "module"` project is parsed as ESM, so the first
		// CommonJS-only global it touches throws a bare ReferenceError with a Node internals
		// stack and no hint about the config file. Which global comes first depends on the
		// file: `require` on line 1 of the Cookbook recipe, `module.exports` at the end of a
		// plain config, `__dirname`/`__filename` in a path expression. Node >= 22 appends
		// “in ES module scope”, older versions do not — match the common prefix of all of them.
		const commonjsGlobal =
			err instanceof ReferenceError &&
			/\b(require|module|exports|__dirname|__filename) is not defined/.exec(err.message)?.[1];
		if (commonjsGlobal) {
			throw new StyleguidistError(
				`Cannot load ${sourcePath}: the file uses the CommonJS \`${commonjsGlobal}\` but your ` +
					'project is an ES module (package.json has "type": "module").\n' +
					'Either write the config as an ES module (`import`, `export default {...}`, and ' +
					'`fileURLToPath(import.meta.url)` instead of `__dirname`) or rename the file to ' +
					`${commonjsFilename}.`
			);
		}
		throw err;
	}

	// ESM namespaces (and Babel/TypeScript-compiled CommonJS) keep the value on `default`.
	return mod && typeof mod === 'object' && 'default' in mod && mod.__esModule !== false
		? mod.default
		: mod;
}
