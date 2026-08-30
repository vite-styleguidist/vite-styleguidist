import { mergeConfig } from 'vite';
import type { InlineConfig, PluginOption, UserConfig } from 'vite';
import isFunction from 'lodash/isFunction.js';
import createLogger from 'glogg';
import type * as Rsg from '../typings/index.js';

const logger = createLogger('rsg');

/**
 * Options of the user’s Vite config that are ignored because Styleguidist owns them:
 * the entry, the output location and the dev server address are ours.
 */
export const IGNORED_OPTIONS: Record<string, string[]> = {
	'': ['root', 'base', 'appType', 'configFile'],
	// `lib`/`ssr`/`external` come from the project’s own library build and would make
	// the style guide bundle unloadable (e.g. `external: ['react']` leaves bare imports
	// in the browser bundle); `output` naming is what our index.html references.
	build: ['outDir', 'emptyOutDir', 'lib', 'ssr', 'manifest', 'ssrManifest'],
	'build.rolldownOptions': ['input', 'external', 'output', 'preserveEntrySignatures'],
	'build.rollupOptions': ['input', 'external', 'output', 'preserveEntrySignatures'],
	server: ['host', 'port', 'strictPort', 'middlewareMode'],
};

/**
 * Whether a plugin list already contains @vitejs/plugin-react (its plugins are all named `vite:react...`).
 */
export function hasReactPlugin(plugins?: PluginOption[] | PluginOption): boolean {
	if (!plugins) {
		return false;
	}
	if (Array.isArray(plugins)) {
		return plugins.some((plugin) => hasReactPlugin(plugin));
	}
	return (
		!!plugins &&
		typeof plugins === 'object' &&
		'name' in plugins &&
		typeof plugins.name === 'string' &&
		plugins.name.startsWith('vite:react')
	);
}

type MetaConfig = UserConfig | ((env: Rsg.StyleguidistEnv) => UserConfig);

/**
 * Merge the user’s Vite config into Styleguidist’s, ignoring the options
 * Styleguidist has to control.
 */
export default function mergeViteConfig(
	baseConfig: InlineConfig,
	userConfig: MetaConfig,
	env: Rsg.StyleguidistEnv
): InlineConfig {
	const userConfigObject = isFunction(userConfig) ? userConfig(env) : userConfig;
	if (!userConfigObject) {
		return baseConfig;
	}

	// Shallow-copy the objects we prune so the user’s config object is left untouched
	const safeUserConfig: Record<string, any> = { ...userConfigObject };
	const ignored: string[] = [];
	Object.entries(IGNORED_OPTIONS).forEach(([section, keys]) => {
		const sectionPath = section ? section.split('.') : [];
		let parent = safeUserConfig;
		for (const segment of sectionPath) {
			if (!parent[segment] || typeof parent[segment] !== 'object') {
				return;
			}
			parent[segment] = { ...parent[segment] };
			parent = parent[segment];
		}
		keys.forEach((key) => {
			if (key in parent) {
				ignored.push(section ? `${section}.${key}` : key);
				delete parent[key];
			}
		});
	});

	if (ignored.length > 0) {
		logger.debug(`Ignoring Vite config options: ${ignored.join(', ')}`);
	}

	return mergeConfig(baseConfig, safeUserConfig) as InlineConfig;
}
