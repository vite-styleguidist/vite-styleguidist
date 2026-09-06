import { light, cssVariableName } from './colorSchemes.js';

export const spaceFactor = 8;
export const space = [
	spaceFactor / 2, // 4
	spaceFactor, // 8
	spaceFactor * 2, // 16
	spaceFactor * 3, // 24
	spaceFactor * 4, // 32
	spaceFactor * 5, // 40
	spaceFactor * 6, // 48
];

/**
 * Colour tokens are CSS custom properties (ADR 0011): each value is
 * `var(--rsg-color-<name>, <light value>)`. The light value is the fallback, so a
 * token still works where the variable sheet (cssVariables.ts) is not attached, and
 * the variable is what switches in dark mode. Overriding a token through the `theme`
 * config replaces the whole expression with a literal, which opts that token out of
 * dark mode; to keep both schemes, override the custom property instead (see
 * docs/Configuration.md). The values themselves live in colorSchemes.ts.
 */
const toCustomProperties = <T extends Record<string, string>>(
	palette: T
): { [Token in keyof T]: string } =>
	Object.fromEntries(
		Object.entries(palette).map(([token, value]) => [
			token,
			`var(${cssVariableName(token)}, ${value})`,
		])
	) as { [Token in keyof T]: string };

export const color = toCustomProperties(light);

export const fontFamily = {
	base: [
		'-apple-system',
		'BlinkMacSystemFont',
		'"Segoe UI"',
		'"Roboto"',
		'"Oxygen"',
		'"Ubuntu"',
		'"Cantarell"',
		'"Fira Sans"',
		'"Droid Sans"',
		'"Helvetica Neue"',
		'sans-serif',
	],
	monospace: ['Consolas', '"Liberation Mono"', 'Menlo', 'monospace'],
};

export const fontSize = {
	base: 15,
	text: 16,
	small: 13,
	// The 1.0 type scale: a calmer 40 / 28 / 22 for h1–h3 (48 / 36 / 24 before 1.0),
	// h4–h6 unchanged
	h1: 40,
	h2: 28,
	h3: 22,
	h4: 18,
	h5: 16,
	h6: 16,
};

// Tokens for values components used to hard-code (line heights, weights, transitions,
// shadows). They exist so that users can override them at all. `transition` and
// `shadow` still equal the former literals; `lineHeight.base` and `fontWeight` carry
// the 1.0 design values (1.55 instead of 1.5; 400 / 600 instead of 'normal' / 'bold'),
// so a component that adopts them changes output on purpose.
export const lineHeight = {
	base: 1.55,
	heading: 1.2,
	// Code is set looser than prose: the syntax colours need the air. Shared by the editor
	// and the static code blocks so both render the same height.
	code: 1.6,
};

// Numbers, not keywords: 600 (semibold) is the designed heading and label weight, and
// there is no keyword for it. Rsg.Theme types these as `string | number`, so a user
// theme can still set 'bold'.
export const fontWeight = {
	normal: 400,
	bold: 600,
};

// Duration and easing only; the property stays in the component: `color ${transition.fast}`
export const transition = {
	fast: '150ms ease-in',
	slow: '750ms ease-out',
};

// Whole shadow values. The colour is a literal for now: a translucent black works on
// both schemes, and the designed palette may route it through a colour token later.
export const shadow = {
	tooltip: '0 2px 4px rgba(0,0,0,.15)',
	ribbon: '0 -1px 0 rgba(0,0,0,.15)',
};

export const mq = {
	small: '@media (max-width: 600px)',
	// Not used by any component yet: sidebar (232) + content (1000) + paddings no longer
	// fit side by side around this width, so it is the natural next breakpoint.
	medium: '@media (max-width: 1024px)',
};

export const borderRadius = 6;
export const maxWidth = 960;
export const sidebarWidth = 232;

// Tab and toggle labels are set in sentence case since 1.0 (they were uppercase before)
export const buttonTextTransform = 'none';
