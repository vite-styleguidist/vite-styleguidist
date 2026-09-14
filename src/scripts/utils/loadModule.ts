import path from 'node:path';
import nodeModule, { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import dirname from './dirname.js';
import StyleguidistError from './error.js';

// Styleguidist itself is ESM, but user config files are loaded synchronously via
// `require()` so that the public API (`styleguidist(config)`) can stay synchronous.
// Node >= 20.19 / 22.12 can `require()` ES modules too (as long as they don't use
// top-level await), so both CommonJS and ESM config files work.
const require = createRequire(import.meta.url);

/**
 * This package’s own root: this file is `lib/scripts/utils/loadModule.js` in the published
 * package and `src/scripts/utils/loadModule.ts` when running from sources, so three levels
 * up is the folder holding package.json either way (make-vite-config.ts computes the same
 * path from `lib/scripts`).
 */
const PACKAGE_DIR = path.resolve(dirname(import.meta.url), '../../..');

/**
 * A `require` anchored at this package’s own package.json. Because that file *is* the
 * package manifest, Node lets it self-reference the package by name through the `exports`
 * map — `selfRequire.resolve('vite-styleguidist')` and `.resolve('vite-styleguidist/lib/…')`
 * both answer with a file inside this very copy, whatever node_modules layout is around it.
 */
const selfRequire = createRequire(path.join(PACKAGE_DIR, 'package.json'));

/**
 * The name a config file imports us under, read from the manifest rather than written out,
 * so that renaming the package cannot leave this behind.
 */
const PACKAGE_NAME: string = (selfRequire('./package.json') as { name: string }).name;

/** `vite-styleguidist` itself, or one of its subpaths — nothing else is ever redirected. */
const isSelfSpecifier = (specifier: string): boolean =>
	specifier === PACKAGE_NAME || specifier.startsWith(`${PACKAGE_NAME}/`);

/** Node’s two “this module does not exist” codes: CommonJS resolution, and ESM resolution. */
const isModuleNotFound = (err: unknown): boolean => {
	const code = (err as NodeJS.ErrnoException | null)?.code;
	return code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND';
};

/** Absolute path of `specifier` inside this package, or undefined if it has no such file. */
function resolveSelf(specifier: string): string | undefined {
	try {
		return selfRequire.resolve(specifier);
	} catch {
		// A subpath the `exports` map does not expose (or a file that isn’t there): the
		// caller keeps the error default resolution produced, which is the honest one
		return undefined;
	}
}

/** The private CommonJS resolver, on the Node.js versions that are all we can patch. */
interface ModuleInternals {
	_resolveFilename?: (...args: any[]) => string;
}

/**
 * Run `load()` with one extra resolution rule in place: a bare `vite-styleguidist` (or
 * `vite-styleguidist/<subpath>`) specifier that Node cannot find resolves to *this* copy of
 * the package instead of failing.
 *
 * A config file is loaded **by** Styleguidist, so `import { defineConfig } from
 * 'vite-styleguidist'` in it has to work wherever that file lives — a folder with no
 * node_modules of its own (the examples in this repository), a monorepo whose hoisting put
 * the package somewhere the config’s folder cannot see, a config passed with `--config` from
 * outside the project altogether. Nothing else changes: the fallback is only consulted after
 * default resolution has already thrown, only for those two specifier shapes, and only while
 * the config is being loaded — a missing module of any other name fails exactly as before,
 * with its own error, and a project that *does* have the package installed keeps resolving
 * to its own copy.
 */
function withSelfResolution<T>(load: () => T): T {
	// `module.registerHooks()` (Node >= 22.15 / 23.5) is synchronous — which `require()`
	// needs — and covers CommonJS *and* ES module resolution, so one hook handles every
	// config file format. It is missing on 22.12–22.14, hence the feature test.
	if (typeof nodeModule.registerHooks === 'function') {
		const hooks = nodeModule.registerHooks({
			resolve(specifier, context, nextResolve) {
				try {
					return nextResolve(specifier, context);
				} catch (err) {
					if (!isSelfSpecifier(specifier) || !isModuleNotFound(err)) {
						throw err;
					}
					const filepath = resolveSelf(specifier);
					if (filepath === undefined) {
						throw err;
					}
					return { url: pathToFileURL(filepath).href, shortCircuit: true };
				}
			},
		});
		try {
			return load();
		} finally {
			hooks.deregister();
		}
	}

	// Node 22.12–22.14: wrapping the private CommonJS resolver covers a CommonJS config
	// (including a `.ts` one compiled to `.cjs` in a package without `"type": "module"`),
	// which is the common case. An *ES module* config on those three versions still needs
	// the package resolvable from its own folder — there is no synchronous ESM resolve hook
	// there to borrow. Documented in docs/Configuration.md.
	const internals = nodeModule as unknown as ModuleInternals;
	const resolveFilename = internals._resolveFilename;
	if (resolveFilename === undefined) {
		return load();
	}
	internals._resolveFilename = function (this: unknown, ...args: any[]): string {
		try {
			return resolveFilename.apply(this, args);
		} catch (err) {
			const specifier = args[0];
			if (typeof specifier === 'string' && isSelfSpecifier(specifier) && isModuleNotFound(err)) {
				const filepath = resolveSelf(specifier);
				if (filepath !== undefined) {
					return filepath;
				}
			}
			throw err;
		}
	};
	try {
		return load();
	} finally {
		internals._resolveFilename = resolveFilename;
	}
}

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
		mod = withSelfResolution(() => require(filepath));
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
