/**
 * Virtual module ids used by the Styleguidist Vite plugin.
 *
 * Vite convention: the plugin’s `resolveId` prefixes the id with `\0` so that other
 * plugins and Vite’s own resolver leave it alone; `load` then generates the source.
 *
 * - `virtual:rsg-entry`       — the entry module: `require` config items + Styleguidist’s client
 * - `virtual:rsg-styleguide`  — sections/components/config data (was `styleguide-loader`)
 * - `rsg-props:<file>`        — react-docgen documentation of one component (was `props-loader`)
 * - `rsg-examples:<file>?...` — examples parsed from one Markdown file (was `examples-loader`)
 * - `rsg-mdx:<file>?...`      — the same for an MDX file, compiled to a React component
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
export const PROPS_PREFIX = 'rsg-props:';
export const EXAMPLES_PREFIX = 'rsg-examples:';
export const MDX_PREFIX = 'rsg-mdx:';

export const NULL = '\0';

export const RESOLVED_ENTRY_ID = NULL + ENTRY_ID;
export const RESOLVED_STYLEGUIDE_ID = NULL + STYLEGUIDE_ID;

/** Normalize a file system path to forward slashes (Vite ids always use them). */
export function toPosix(filepath: string): string {
	return filepath.split(path.sep).join('/');
}

export function propsId(componentPath: string): string {
	return PROPS_PREFIX + toPosix(componentPath);
}

/** Query string shared by the examples and MDX ids (they carry the same options). */
function moduleQuery(options: Rsg.ExamplesModuleOptions): string {
	const params = new URLSearchParams();
	if (options.displayName) {
		params.set('displayName', options.displayName);
	}
	if (options.componentPath) {
		params.set('component', toPosix(options.componentPath));
	}
	if (options.shouldShowDefaultExample) {
		params.set('default', '1');
	}
	const query = params.toString();
	return query ? `?${query}` : '';
}

export function examplesId(options: Rsg.ExamplesModuleOptions): string {
	return EXAMPLES_PREFIX + toPosix(options.file) + moduleQuery(options);
}

export function mdxId(options: Rsg.ExamplesModuleOptions): string {
	return MDX_PREFIX + toPosix(options.file) + moduleQuery(options);
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

/** Extract the component path from a resolved `\0rsg-props:` id. */
export function parsePropsId(id: string): string {
	return id.slice((NULL + PROPS_PREFIX).length);
}

/** Extract the options from a resolved `\0rsg-examples:` or `\0rsg-mdx:` id. */
export function parseExamplesId(id: string): Rsg.ExamplesModuleOptions {
	const prefix = isMdxId(id) ? NULL + MDX_PREFIX : NULL + EXAMPLES_PREFIX;
	const rest = id.slice(prefix.length);
	const queryIndex = rest.indexOf('?');
	const file = queryIndex === -1 ? rest : rest.slice(0, queryIndex);
	const params = new URLSearchParams(queryIndex === -1 ? '' : rest.slice(queryIndex + 1));
	return {
		file,
		displayName: params.get('displayName') || undefined,
		componentPath: params.get('component') || undefined,
		shouldShowDefaultExample: params.get('default') === '1',
	};
}

/** Extract the options from a resolved `\0rsg-mdx:` id (same shape as the examples id). */
export const parseMdxId = parseExamplesId;
