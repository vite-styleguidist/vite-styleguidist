import type * as Rsg from '../typings/index.js';

/**
 * Identity function that types a style guide config.
 *
 * It returns its argument untouched: the point is that an editor knows what the object is
 * before it is ever loaded, so a mistyped option is a red squiggle in the config file
 * instead of an error the next time the style guide starts.
 *
 * ```ts
 * // styleguide.config.ts
 * import { defineConfig } from 'vite-styleguidist';
 *
 * export default defineConfig({
 *   components: 'src/components/**\/*.tsx',
 * });
 * ```
 *
 * Not generic, the way every other `defineConfig` in the ecosystem is not: the config keeps
 * the one type the documentation names, and there is nothing a config file could do with
 * the literal type of its own object anyway.
 */
export function defineConfig(config: Rsg.StyleguidistConfig): Rsg.StyleguidistConfig {
	return config;
}

export default defineConfig;
