import { createRequire } from 'node:module';
import StyleguidistError from './error.js';

// Styleguidist itself is ESM, but user config files are loaded synchronously via
// `require()` so that the public API (`styleguidist(config)`) can stay synchronous.
// Node >= 20.19 / 22.12 can `require()` ES modules too (as long as they don't use
// top-level await), so both CommonJS and ESM config files work.
const require = createRequire(import.meta.url);

/**
 * Synchronously load a user module (CommonJS or ESM) and return its default export.
 */
export default function loadModule<T = any>(filepath: string): T {
	let mod: any;
	try {
		mod = require(filepath);
	} catch (err: any) {
		if (err && err.code === 'ERR_REQUIRE_ASYNC_MODULE') {
			throw new StyleguidistError(
				`Cannot load ${filepath}: ES modules using top-level await are not supported in Styleguidist config files.`
			);
		}
		// Node >= 22 says “module is not defined in ES module scope”, older versions
		// just “module is not defined” — match the common prefix
		if (err instanceof ReferenceError && /module is not defined/.test(err.message)) {
			throw new StyleguidistError(
				`Cannot load ${filepath}: the file uses CommonJS (module.exports) but your package.json has "type": "module".\n` +
					'Either use `export default {...}` or rename the file to use the .cjs extension.'
			);
		}
		throw err;
	}

	// ESM namespaces (and Babel/TypeScript-compiled CommonJS) keep the value on `default`.
	return mod && typeof mod === 'object' && 'default' in mod && mod.__esModule !== false
		? mod.default
		: mod;
}
