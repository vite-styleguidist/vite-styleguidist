/**
 * Virtual module ids used by the Styleguidist Vite plugin.
 *
 * Vite convention: the plugin’s `resolveId` prefixes the id with `\0` so that other
 * plugins and Vite’s own resolver leave it alone; `load` then generates the source.
 *
 * - `virtual:rsg-entry`                    — the entry module: `require` config items + Styleguidist’s client
 * - `virtual:rsg-styleguide`               — sections/components/config data (was `styleguide-loader`)
 * - `virtual:rsg-props?file=…&rsg`         — react-docgen documentation of one component (was `props-loader`)
 * - `virtual:rsg-examples?file=…&rsg`      — examples parsed from one Markdown file (was `examples-loader`)
 * - `virtual:rsg-mdx?file=…&rsg`           — the same for an MDX file, compiled to a React component
 *
 * ## Why the source path is a query parameter, and why every id ends with `&rsg`
 *
 * These ids used to *end* with the source file — `\0rsg-props:/abs/Button.tsx`, and
 * `\0rsg-examples:/abs/Readme.md?displayName=Button&component=…%2FButton.tsx`. Plugins pick
 * the modules they transform with an id filter, and the usual filter is an *unanchored*
 * extension search: `/\.(?:[jt]sx?|[cm][jt]s)(?:$|\?)/` is @rolldown/plugin-babel’s default
 * `include` and the same regex shape appears all over the ecosystem. Both id shapes matched
 * it, so a project’s Babel plugins parsed and traversed every module we generate — at 350
 * components, two thirds of all Babel calls, spent on modules that contain no user code.
 *
 * So the shape now obeys one rule: **no id ever ends with a source extension, and no id has
 * one directly before its `?`.**
 *
 * - The file is a query parameter, so the only thing before the `?` is our own name, which
 *   has no extension at all. That covers the many filters that strip the query first
 *   (`id.split('?')[0]`) as well as the ones that match the whole id.
 * - A valueless `rsg` flag is always the *last* parameter, so the extension of `file` — or
 *   of the `component` path an examples id carries — is always followed by `&`. A valueless
 *   query flag is the same idiom as Vite’s own `?raw`, `?url` and `?worker`.
 *
 * The ids stay unique and stable across runs (they are ParseCache and HMR keys) and still
 * carry the source path in plain sight, for error messages and for the dev tools: `/` and
 * `:` are deliberately left unescaped in the query, so a path reads as a path.
 *
 * Plugins that filter by id should not match these modules at all; `exclude: [/^\0/]` is the
 * one-liner for a filter that still does. See docs/Cookbook.md,
 * “How to keep a Vite plugin from processing Styleguidist’s own modules?”.
 *
 * MDX deliberately gets its own prefix instead of a flag on the examples id: `isExamplesId`
 * drives the plugin’s `load`, its bare-specifier fallback, `hotUpdate` and the
 * machine-readable docs, and a separate prefix means none of those Markdown code paths
 * change at all.
 */
import path from 'node:path';
import type * as Rsg from '../typings/index.js';

export const ENTRY_ID = 'virtual:rsg-entry';
export const STYLEGUIDE_ID = 'virtual:rsg-styleguide';

/**
 * The prefixes are the full head of the id, `?` included, so that `isPropsId()` and friends
 * are exact string checks and can never match a longer name (`rsg-props-something`).
 */
export const PROPS_PREFIX = 'virtual:rsg-props?';
export const EXAMPLES_PREFIX = 'virtual:rsg-examples?';
export const MDX_PREFIX = 'virtual:rsg-mdx?';

/** The valueless query flag that ends every generated id — see the note above. */
export const MARKER = 'rsg';

export const NULL = '\0';

export const RESOLVED_ENTRY_ID = NULL + ENTRY_ID;
export const RESOLVED_STYLEGUIDE_ID = NULL + STYLEGUIDE_ID;

/** Normalize a file system path to forward slashes (Vite ids always use them). */
export function toPosix(filepath: string): string {
	return filepath.split(path.sep).join('/');
}

/**
 * Percent-encode one query value, but keep `/` and `:` readable: both are legal in a query
 * (RFC 3986 `pchar`), `URLSearchParams` parses them back verbatim, and a path that reads
 * like a path is the whole point of carrying it in the id.
 */
function encodeValue(value: string): string {
	return encodeURIComponent(value).replace(/%2F/g, '/').replace(/%3A/g, ':');
}

/** Build an id: the prefix, the parameters that have a value, and the marker last. */
function buildId(prefix: string, params: [name: string, value: string | undefined][]): string {
	const query = params
		.filter((entry): entry is [string, string] => entry[1] !== undefined)
		.map(([name, value]) => `${name}=${encodeValue(value)}`);
	// The marker goes last, always: it is what keeps a source extension from ending the id
	return prefix + [...query, MARKER].join('&');
}

/** The query parameters of one of our ids, resolved (`\0…`) or not. */
function paramsOf(id: string): URLSearchParams {
	const start = id.indexOf('?');
	return new URLSearchParams(start === -1 ? '' : id.slice(start + 1));
}

export function propsId(componentPath: string): string {
	return buildId(PROPS_PREFIX, [['file', toPosix(componentPath)]]);
}

/** Parameters shared by the examples and MDX ids (they carry the same options). */
function moduleParams(
	options: Rsg.ExamplesModuleOptions
): [name: string, value: string | undefined][] {
	return [
		['file', toPosix(options.file)],
		['displayName', options.displayName || undefined],
		['component', options.componentPath ? toPosix(options.componentPath) : undefined],
		['default', options.shouldShowDefaultExample ? '1' : undefined],
	];
}

export function examplesId(options: Rsg.ExamplesModuleOptions): string {
	return buildId(EXAMPLES_PREFIX, moduleParams(options));
}

export function mdxId(options: Rsg.ExamplesModuleOptions): string {
	return buildId(MDX_PREFIX, moduleParams(options));
}

export function isPropsId(id: string): boolean {
	return id.startsWith(NULL + PROPS_PREFIX);
}

export function isExamplesId(id: string): boolean {
	return id.startsWith(NULL + EXAMPLES_PREFIX);
}

export function isMdxId(id: string): boolean {
	return id.startsWith(NULL + MDX_PREFIX);
}

/** Extract the component path from a resolved `\0virtual:rsg-props?` id. */
export function parsePropsId(id: string): string {
	return paramsOf(id).get('file') || '';
}

/** Extract the options from a resolved `\0virtual:rsg-examples?` or `\0virtual:rsg-mdx?` id. */
export function parseExamplesId(id: string): Rsg.ExamplesModuleOptions {
	const params = paramsOf(id);
	return {
		file: params.get('file') || '',
		displayName: params.get('displayName') || undefined,
		componentPath: params.get('component') || undefined,
		shouldShowDefaultExample: params.get('default') === '1',
	};
}

/** Extract the options from a resolved `\0virtual:rsg-mdx?` id (same shape as the examples id). */
export const parseMdxId = parseExamplesId;
