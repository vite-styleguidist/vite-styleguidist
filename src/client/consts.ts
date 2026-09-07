import type { ScrollSync } from '../typings/RsgStyleguidistConfig.js';

/**
 * Element id of the page's content region: the `<main>` StyleGuideRenderer renders, the
 * target of the skip link and of every `?id=` link (src/client/index.ts). It lives here,
 * and not in StyleGuideRenderer, because PageNav reads the rendered headings out of that
 * element and StyleGuideRenderer is a component users replace — an id both sides have to
 * agree on cannot be owned by the replaceable half.
 */
export const CONTENT_ID = 'rsg-content';

/**
 * The label of the “on this page” list, visible and as the `aria-label` of its `<nav>`.
 *
 * It lives here rather than in PageNav for the same reason CONTENT_ID does: StyleGuide has
 * to pass it as the `title` prop, and PageNav is a component users replace — a replacement
 * that reads the prop the Cookbook documents would otherwise get `undefined` and render an
 * unnamed navigation landmark.
 */
export const PAGE_NAV_TITLE = 'On this page';

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
