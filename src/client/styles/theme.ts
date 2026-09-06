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
	h1: 48,
	h2: 36,
	h3: 24,
	h4: 18,
	h5: 16,
	h6: 16,
};

// Tokens for values components used to hard-code (line heights, weights, transitions,
// shadows); the defaults are exactly those former literals, so adopting a token
// changes no output. They are here so that users can override them at all.
export const lineHeight = {
	base: 1.5,
	heading: 1.2,
};

export const fontWeight = {
	normal: 'normal',
	bold: 'bold',
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
	// Not used by any component yet: sidebar (200) + content (1000) + paddings no longer
	// fit side by side around this width, so it is the natural next breakpoint.
	medium: '@media (max-width: 1024px)',
};

export const borderRadius = 3;
export const maxWidth = 1000;
export const sidebarWidth = 200;

export const buttonTextTransform = 'uppercase';
