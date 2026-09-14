import fs from 'node:fs';
import path from 'node:path';
import { transform } from 'sucrase';
import StyleguidistError from './error.js';
import loadModule from './loadModule.js';

/**
 * Config file extensions that have to be compiled before Node.js loads them. Node can
 * strip types itself from version 22.18 on, but not on every version this package supports,
 * and not the same way — so Styleguidist always compiles them itself.
 */
export const TYPESCRIPT_EXTENSIONS = ['.ts', '.mts', '.cts'];

/** Whether a config file has to be compiled before it can be loaded. */
export function isTypeScriptConfigFile(filepath: string): boolean {
	return TYPESCRIPT_EXTENSIONS.includes(path.extname(filepath).toLowerCase());
}

/**
 * `type` field of the package.json closest to `dir`, using Node’s own lookup: the first
 * package.json found walking up the tree wins, and CommonJS is the answer when neither the
 * file nor the field is there. This is what decides whether a plain `.ts` file is an ES
 * module — `.mts` and `.cts` say it in their extension.
 */
function nearestPackageType(dir: string): 'module' | 'commonjs' {
	let current = dir;
	for (;;) {
		const manifest = path.join(current, 'package.json');
		if (fs.existsSync(manifest)) {
			try {
				const { type } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
				return type === 'module' ? 'module' : 'commonjs';
			} catch {
				// A package.json we cannot parse is Node’s problem to report, not ours: answer
				// what Node answers when the field is missing and let the config file itself
				// fail (or not) the way it would have anyway
				return 'commonjs';
			}
		}
		const parent = path.dirname(current);
		if (parent === current) {
			return 'commonjs';
		}
		current = parent;
	}
}

// Every compiled or copied file gets a name of its own so that Node’s module caches (the
// CommonJS one, and the ES module registry, which has no invalidation API at all) can never
// hand back a previous version of the config. That is what makes `fresh` possible.
let counter = 0;

/**
 * Write `code` next to `filepath` under a name nothing has loaded before, load it with
 * `require()`, and delete it again.
 *
 * The file has to be a sibling of the original: relative imports, the nearest package.json
 * (its `"type"` and its dependencies) and the directory `import.meta.url` points at all
 * have to keep meaning what they mean in the file the user wrote. It only exists for as
 * long as Node takes to evaluate it, so a tool watching the folder sees it for a few
 * milliseconds — and a stack trace of an error thrown by the config itself names it, which
 * is why the name starts with the name of the real file.
 */
function loadFromSibling<T>(filepath: string, code: string, extension: string): T {
	const siblingPath = path.join(
		path.dirname(filepath),
		`.${path.basename(filepath)}.${process.pid}-${counter++}${extension}`
	);

	try {
		fs.writeFileSync(siblingPath, code);
	} catch (err) {
		throw new StyleguidistError(
			`Cannot load ${filepath}: writing ${siblingPath} failed with ${(err as Error).message}.\n` +
				'The file is compiled (or copied, when it is reloaded) to a temporary file next to ' +
				'the original one, so its folder has to be writable.'
		);
	}

	try {
		return loadModule<T>(siblingPath, {
			sourcePath: filepath,
			// Name a TypeScript file in the CommonJS-in-an-ES-module hint of a `.ts` config
			commonjsFilename: isTypeScriptConfigFile(filepath)
				? 'styleguide.config.cts'
				: 'styleguide.config.cjs',
		});
	} finally {
		// `require()` evaluates the file before it returns, so nothing needs it any more
		fs.rmSync(siblingPath, { force: true });
	}
}

/** Strip the types of a TypeScript config file, keeping its module system. */
function compileTypeScript(filepath: string, source: string, isEsm: boolean): string {
	try {
		return transform(source, {
			// Types only for an ES module: keeping `import`/`export` lets Node run the file as
			// the module it is. A CommonJS file needs them rewritten to `require()` calls, which
			// is also what makes `module.exports` and `__dirname` work in a `.cts` config.
			transforms: isEsm ? ['typescript'] : ['typescript', 'imports'],
			// Named in Sucrase’s own syntax errors, so that they point at the config
			filePath: filepath,
			// Every supported Node.js version understands the syntax Sucrase would downlevel
			disableESTransforms: true,
			// `import()` of an ES module must not become a `require()` call in CommonJS output
			preserveDynamicImport: true,
		}).code;
	} catch (err) {
		throw new StyleguidistError(`Cannot compile ${filepath}:\n${(err as Error).message}`);
	}
}

export interface LoadConfigFileOptions {
	/**
	 * Load the file as it is on disk right now, ignoring anything Node.js has cached from an
	 * earlier load of the same path. Used when a running dev server reloads a config file
	 * that has changed (see watchConfig.ts); the first load never needs it.
	 */
	fresh?: boolean;
}

/**
 * Synchronously load a config file — JavaScript or TypeScript — and return its default
 * export.
 *
 * A JavaScript config is `require()`d exactly as it has always been. A TypeScript one is
 * compiled first with Sucrase, which Styleguidist already ships to compile examples in the
 * browser: Node’s own type stripping only exists from Node 22.18 on, and Vite’s
 * `loadConfigFromFile()` is asynchronous, while `getConfig()` — and with it the whole
 * `styleguidist(config)` Node API — is synchronous.
 *
 * Only the config file itself is compiled. A `.ts` module it imports is left to Node, which
 * can strip types from 22.18 on; on an older Node.js, import a JavaScript module instead.
 */
export default function loadConfigFile<T = any>(
	filepath: string,
	{ fresh = false }: LoadConfigFileOptions = {}
): T {
	const isTypeScript = isTypeScriptConfigFile(filepath);
	if (!isTypeScript && !fresh) {
		return loadModule<T>(filepath);
	}

	let source: string;
	try {
		source = fs.readFileSync(filepath, 'utf8');
	} catch (err) {
		throw new StyleguidistError(`Cannot read ${filepath}: ${(err as Error).message}`);
	}

	if (!isTypeScript) {
		// Node.js can drop a CommonJS module from `require.cache`, but nothing can invalidate
		// an ES module once it has been evaluated; loading a copy under a name nothing has
		// loaded yet is the one way to re-read either kind, and it keeps both on one path
		return loadFromSibling<T>(filepath, source, path.extname(filepath));
	}

	// `.mts` is always an ES module and `.cts` always CommonJS; a plain `.ts` follows the
	// package it belongs to. Compiling to the wrong one would break `module.exports` in a
	// CommonJS project, or `import.meta.url` in an ES module.
	const extension = path.extname(filepath).toLowerCase();
	const isEsm =
		extension === '.mts' ||
		(extension !== '.cts' && nearestPackageType(path.dirname(filepath)) === 'module');

	return loadFromSibling<T>(
		filepath,
		compileTypeScript(filepath, source, isEsm),
		isEsm ? '.mjs' : '.cjs'
	);
}
