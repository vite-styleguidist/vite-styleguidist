import type { ScrollSync } from '../typings/RsgStyleguidistConfig.js';

export const DisplayModes = Object.freeze({
	// Show all sections and components (default)
	all: 'all',
	// Show one section
	section: 'section',
	// Show one component
	component: 'component',
	// Show one example inside component or section
	example: 'example',
	// Show error 404
	notFound: 'notFound',
});

export const ExampleModes = Object.freeze({
	hide: 'hide',
	collapse: 'collapse',
	expand: 'expand',
});

export const UsageModes = Object.freeze({
	hide: 'hide',
	collapse: 'collapse',
	expand: 'expand',
});

/**
 * Every valid `scrollSync` config value, the way COLOR_SCHEMES lists the colour schemes:
 * the type lives in the typings, the list has to be a runtime value because the config
 * schema validates against it (see docs/decisions/0015-scroll-synced-selection.md).
 */
export const SCROLL_SYNC_MODES: readonly ScrollSync[] = Object.freeze([
	false,
	'selection',
	'hash',
] as ScrollSync[]);
