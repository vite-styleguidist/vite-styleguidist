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

export const mq = {
	small: '@media (max-width: 600px)',
};

export const borderRadius = 3;
export const maxWidth = 1000;
export const sidebarWidth = 200;

export const buttonTextTransform = 'uppercase';
