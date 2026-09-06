/**
 * Colour values per colour scheme.
 *
 * `theme.color.*` (theme.ts) no longer holds literal colours: each token is a
 * `var(--rsg-color-<name>, <light value>)` expression, and the values live here so
 * that the global variable sheet (cssVariables.ts) can define the light and dark sets
 * (ADR 0011). This is a separate module on purpose: every export of theme.ts is
 * merged into the `theme` object handed to `styles` functions, and raw palettes are
 * not theme tokens.
 *
 * Token names are the keys of `light`; `dark` must have exactly the same keys, which
 * theme.spec.ts checks.
 */

/** The default (light) palette: the values the style guide has always shipped with. */
export const light = {
	base: '#333',
	light: '#767676',
	lightest: '#ccc',
	link: '#1673b1',
	linkHover: '#e90',
	focus: 'rgba(22, 115, 177, 0.25)',
	border: '#e8e8e8',
	name: '#690',
	type: '#905',
	error: '#c00',
	baseBackground: '#fff',
	codeBackground: '#f5f5f5',
	sidebarBackground: '#f5f5f5',
	ribbonBackground: '#e90',
	ribbonText: '#fff',
	// Based on default Prism theme
	codeBase: '#333',
	codeComment: '#6d6d6d',
	codePunctuation: '#999',
	codeProperty: '#905',
	codeDeleted: '#905',
	codeString: '#690',
	codeInserted: '#690',
	codeOperator: '#9a6e3a',
	codeKeyword: '#1673b1',
	codeFunction: '#DD4A68',
	codeVariable: '#e90',
};

export type ColorToken = keyof typeof light;

/**
 * PROVISIONAL dark palette: it exists so that the colour-scheme toggle demonstrably
 * works, not because anyone chose these colours. Every value is derived mechanically
 * from the light value next to it: greys (saturation below 10%) have their lightness
 * inverted; brand colours keep their hue and saturation and get lightness
 * max(100% - l, 60%) so they stay readable on the dark greys; alpha is kept. The
 * designed palette (light and dark, every pair at 4.5:1 or better) replaces these
 * literals; names never change.
 */
export const dark: Record<ColorToken, string> = {
	base: '#cccccc', // #333, lightness inverted
	light: '#898989', // #767676, lightness inverted
	lightest: '#333333', // #ccc, lightness inverted
	link: '#4eabe9', // #1673b1, lightness 39% -> 61%
	linkHover: '#ffb633', // #e90, lightness 47% -> 60%
	focus: 'rgba(78, 171, 233, 0.25)', // rgba(22, 115, 177, 0.25), lightness 39% -> 61%
	border: '#171717', // #e8e8e8, lightness inverted
	name: '#ccff66', // #690, lightness 30% -> 70%
	type: '#ff66bb', // #905, lightness 30% -> 70%
	error: '#ff3333', // #c00, lightness 40% -> 60%
	baseBackground: '#000000', // #fff, lightness inverted
	codeBackground: '#0a0a0a', // #f5f5f5, lightness inverted
	sidebarBackground: '#0a0a0a', // #f5f5f5, lightness inverted
	ribbonBackground: '#ffb633', // #e90, lightness 47% -> 60%
	ribbonText: '#000000', // #fff, lightness inverted
	codeBase: '#cccccc', // #333, lightness inverted
	codeComment: '#929292', // #6d6d6d, lightness inverted
	codePunctuation: '#666666', // #999, lightness inverted
	codeProperty: '#ff66bb', // #905, lightness 30% -> 70%
	codeDeleted: '#ff66bb', // #905, lightness 30% -> 70%
	codeString: '#ccff66', // #690, lightness 30% -> 70%
	codeInserted: '#ccff66', // #690, lightness 30% -> 70%
	codeOperator: '#c79d6b', // #9a6e3a, lightness 42% -> 60%
	codeKeyword: '#4eabe9', // #1673b1, lightness 39% -> 61%
	codeFunction: '#df5370', // #DD4A68, lightness 58% -> 60%
	codeVariable: '#ffb633', // #e90, lightness 47% -> 60%
};

/**
 * CSS custom property backing a colour token: `baseBackground` is
 * `--rsg-color-base-background`. Kebab-case is the CSS convention, and it also keeps
 * jss-plugin-camel-case (which leaves `--*` names alone but would hyphenate anything
 * else) out of the picture.
 */
export function cssVariableName(token: string): string {
	return `--rsg-color-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}
