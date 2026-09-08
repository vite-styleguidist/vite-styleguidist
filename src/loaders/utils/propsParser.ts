/**
 * The `propsParser` config option in its two forms — a function, or the path of a module
 * whose default export is that function — and the identity of whichever one is in play.
 *
 * ## Why a module path exists at all
 *
 * A function has no identity across processes. Two runs can pass two different closures
 * with the same source text, and the same closure can capture different state; nothing an
 * on-disk cache stores about it is trustworthy. That is why a function `propsParser` turns
 * the persistent docs cache off entirely (see src/vite/persistentCache.ts), which is
 * exactly the configuration that needs the cache most: a `react-docgen-typescript` parser
 * is the slowest thing a style guide does.
 *
 * A module path is identifiable: the resolved file plus its content (or, inside a package,
 * that package's version) says what the parser *is*, so a cache entry written by one run
 * can be trusted by the next. It is therefore the recommended form — see
 * docs/Cookbook.md, “Components re-exported from another package”.
 *
 * ## Why loading is synchronous
 *
 * `generatePropsModule()` is synchronous, and so is the manifest builder that calls it, so
 * the parser has to be available without an `await`. Node.js can `require()` an ES module
 * since 22.12 (the range this package supports, see `engines`), so `createRequire()` loads
 * both flavours. The one thing it cannot load is an ES module with a top-level `await`;
 * that fails with a clear message pointing at the option.
 *
 * The plugin loads the parser once at `buildStart` so a broken path fails before the first
 * component is parsed rather than in the middle of the graph; every later call is served
 * from the memo below.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import kleur from 'kleur';
import StyleguidistError from '../../scripts/utils/error.js';
import type * as Rsg from '../../typings/index.js';

/** The shape of the `propsParser` option's function form (see the typings). */
export type PropsParserFunction = Rsg.PropsParser;

/**
 * Resolve a `propsParser` module path the way an `import` from the config file would:
 * a relative path against the config folder, a package name against the project.
 *
 * Anchored on `<configDir>/package.json`, which does not have to exist — `createRequire()`
 * only uses it as a starting point for the node_modules walk, and that is the walk a
 * `require()` written in the config file would do.
 */
export function resolvePropsParserPath(request: string, configDir: string): string {
	const require_ = createRequire(path.join(configDir, 'package.json'));
	try {
		return require_.resolve(request);
	} catch (err) {
		throw new StyleguidistError(
			`${kleur.bold('propsParser')} config option points at a module that cannot be resolved ` +
				`from ${configDir}: ${JSON.stringify(request)}.\n\n` +
				`${err instanceof Error ? err.message : String(err)}`,
			'propsParser'
		);
	}
}

/**
 * Loaded parsers, keyed by resolved path. A worker (and the main thread) imports a parser
 * module once per process, which is what makes an expensive parser — one that builds a
 * TypeScript program at module scope — affordable at all.
 */
const loaded = new Map<string, PropsParserFunction>();

/** Only exported for tests: forget every loaded parser module. */
export function clearPropsParserCache(): void {
	loaded.clear();
}

/**
 * Import a `propsParser` module and return its default export, memoized per resolved path.
 *
 * Accepts `export default parser`, `module.exports = parser` and
 * `module.exports = { default: parser }` — the three shapes a config file can produce
 * without knowing which module system Node picked for it.
 */
export function loadPropsParser(request: string, configDir: string): PropsParserFunction {
	const filepath = resolvePropsParserPath(request, configDir);
	const memoized = loaded.get(filepath);
	if (memoized) {
		return memoized;
	}

	let exported: unknown;
	try {
		exported = createRequire(import.meta.url)(filepath);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		// `require(esm)` refuses a module with a top-level await, and there is nothing the
		// user can do about that except move the await — so say so instead of printing a
		// bare ERR_REQUIRE_ASYNC_MODULE.
		const isTopLevelAwait =
			(err as { code?: string })?.code === 'ERR_REQUIRE_ASYNC_MODULE' ||
			/top-level await/i.test(message);
		throw new StyleguidistError(
			`${kleur.bold('propsParser')} config option points at a module that could not be loaded:\n` +
				`${filepath}\n\n` +
				(isTopLevelAwait
					? 'The module uses a top-level await, which cannot be loaded from the parser. ' +
						'Move the await inside the parser function, or do the work at first call.'
					: message),
			'propsParser'
		);
	}

	const parser =
		typeof exported === 'function'
			? exported
			: (exported as { default?: unknown })?.default !== undefined
				? (exported as { default?: unknown }).default
				: undefined;

	if (typeof parser !== 'function') {
		throw new StyleguidistError(
			`${kleur.bold('propsParser')} config option points at a module whose default export is ` +
				`not a function:\n${filepath}\n\n` +
				'Export the parser as the default export: `module.exports = function propsParser(filePath, source, resolver, handlers) {…}`.',
			'propsParser'
		);
	}

	loaded.set(filepath, parser as PropsParserFunction);
	return parser as PropsParserFunction;
}

/**
 * The parser this config parses components with, or `undefined` for the default
 * (react-docgen, see src/vite/modules/props.ts).
 */
export function getPropsParser(
	config: Pick<Rsg.SanitizedStyleguidistConfig, 'propsParser' | 'configDir'>
): PropsParserFunction | undefined {
	const value = config.propsParser as unknown;
	if (typeof value === 'function') {
		return value as PropsParserFunction;
	}
	if (typeof value === 'string') {
		return loadPropsParser(value, config.configDir);
	}
	return undefined;
}

/** The nearest `package.json` above a file, or undefined outside any package. */
function findPackageJson(filepath: string): string | undefined {
	let dir = path.dirname(filepath);
	// `path.dirname('/')` is `/`, so the walk terminates at the file system root
	for (let previous = ''; dir !== previous; previous = dir, dir = path.dirname(dir)) {
		const candidate = path.join(dir, 'package.json');
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	return undefined;
}

/**
 * What a module-path parser *is*, as a string that changes whenever the parser could
 * produce a different answer — the piece of the cache fingerprint that a function form
 * cannot supply.
 *
 * Two cases, and they are different on purpose:
 *
 * - a parser installed as a package (`node_modules/…`) is identified by `name@version`.
 *   Hashing the file would be no better: a package is replaced as a whole, and its entry
 *   file is rarely the code that changed;
 * - a parser file of the project (`./styleguide.parser.js`) is identified by the sha256 of
 *   its own content, so editing it invalidates every cached parse.
 *
 * The limit of the second case, documented next to the option: only *that file* is hashed.
 * A parser that imports helpers of its own keeps its identity when a helper changes — run
 * with `--no-cache`, or delete the cache directory, after such an edit.
 */
export function propsParserIdentity(request: string, configDir: string): string {
	const filepath = resolvePropsParserPath(request, configDir);
	const packageJson = findPackageJson(filepath);
	if (packageJson && filepath.includes(`${path.sep}node_modules${path.sep}`)) {
		try {
			const { name, version } = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
			return `package:${name}@${version}:${path.relative(path.dirname(packageJson), filepath)}`;
		} catch {
			// Unreadable package.json: fall through to the content hash
		}
	}
	try {
		const hash = crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex');
		return `file:${filepath}:${hash.slice(0, 32)}`;
	} catch {
		// The file vanished between resolution and reading: no identity, no caching
		return `file:${filepath}:unreadable`;
	}
}
