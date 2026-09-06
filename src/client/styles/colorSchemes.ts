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
 * theme.spec.ts checks. Both palettes are the designed 1.0 "quiet editorial" set: warm
 * neutrals, the docs site's teal as the single accent, and every text/surface pair the
 * components put together at 4.5:1 or better, which colorSchemes.spec.ts guards. Change
 * a value here and the guard tells you which pair it broke.
 */

import type { ColorScheme } from '../../typings/RsgTheme.js';

/*
 * The colour-scheme handshake between the generated HTML (src/vite/html.ts), the
 * global variable sheet (cssVariables.ts) and the toggle (rsg-components/ThemeToggle).
 * This module has no side effects on purpose so that the Node side can import it.
 */

/** Every valid `colorScheme` config value, in the order the toggle shows them. */
export const COLOR_SCHEMES: ColorScheme[] = ['system', 'light', 'dark'];

/**
 * `<html>` attribute holding the APPLIED scheme: `"light"`, `"dark"`, or absent to
 * follow the operating system. The variable sheet selects on it.
 */
export const COLOR_SCHEME_ATTRIBUTE = 'data-rsg-theme';

/**
 * `<html>` attribute holding the CONFIGURED scheme (the `colorScheme` option), written
 * by the inline script so the toggle knows whether the scheme is forced without the
 * config having to reach the client.
 */
export const COLOR_SCHEME_CONFIG_ATTRIBUTE = 'data-rsg-color-scheme';

/** localStorage key of the visitor’s choice (`system`, `light` or `dark`). */
export const COLOR_SCHEME_STORAGE_KEY = 'rsg-color-scheme';

/**
 * The default (light) palette. The surface a token is meant to sit on is noted next to
 * it, because that is the pair the contrast guard measures; `lightest` and `border`
 * are decorative (rules, placeholders, disabled marks) and are not held to 4.5:1.
 */
export const light = {
	// Text
	base: '#262421', // on baseBackground, sidebarBackground and selectedBackground
	light: '#625d57', // secondary text, on baseBackground and sidebarBackground
	lightest: '#a8a29a', // decorative only
	link: '#0b7285', // the single accent, on baseBackground and sidebarBackground
	linkHover: '#095c6b',
	focus: 'rgba(11, 114, 133, 0.3)', // focus ring: the accent at 30%
	border: '#e6e2da', // decorative
	name: '#4a6b1f', // prop names, on baseBackground and sidebarBackground
	type: '#8c1f5a', // prop types, on baseBackground and sidebarBackground
	error: '#b42318', // on baseBackground, sidebarBackground and errorBackground
	// Surfaces
	baseBackground: '#fcfbf9',
	codeBackground: '#f3f1ec',
	sidebarBackground: '#f4f2ee',
	selectedBackground: '#e3f1f3', // the selected sidebar item and the active tab
	errorBackground: '#fdf3f1', // the PlaygroundError surface
	ribbonBackground: '#0b7285',
	ribbonText: '#ffffff', // on ribbonBackground
	// Code tokens, all on codeBackground; the roles follow the default Prism theme
	codeBase: '#262421',
	codeComment: '#6b6660',
	codePunctuation: '#6f6961',
	codeProperty: '#8c1f5a',
	codeDeleted: '#8c1f5a',
	codeString: '#4a6b1f',
	codeInserted: '#4a6b1f',
	codeOperator: '#8a5a2b',
	codeKeyword: '#0b7285',
	codeFunction: '#b3365f',
	codeVariable: '#a15c00',
};

export type ColorToken = keyof typeof light;

/**
 * The designed dark palette: the same warm neutrals with the lightness roles swapped
 * (backgrounds near-black and warm, text off-white) and the accents lifted so they
 * keep their hue on the dark surfaces. Same token roles and surfaces as `light`.
 */
export const dark: Record<ColorToken, string> = {
	// Text
	base: '#ece8e1',
	light: '#a8a29a',
	lightest: '#6b6660', // decorative only
	link: '#5cc8d8',
	linkHover: '#8fdde8',
	focus: 'rgba(92, 200, 216, 0.35)', // focus ring: the dark accent at 35%
	border: '#3a3631', // decorative
	name: '#a3d17a',
	type: '#e59fc7',
	error: '#f28b82',
	// Surfaces
	baseBackground: '#1c1a17',
	codeBackground: '#262320',
	sidebarBackground: '#221f1b',
	selectedBackground: '#1f3236',
	errorBackground: '#2b1f1d',
	ribbonBackground: '#5cc8d8',
	ribbonText: '#1c1a17',
	// Code tokens, all on codeBackground
	codeBase: '#ece8e1',
	codeComment: '#948d84',
	codePunctuation: '#a8a29a',
	codeProperty: '#e59fc7',
	codeDeleted: '#e59fc7',
	codeString: '#a3d17a',
	codeInserted: '#a3d17a',
	codeOperator: '#d9a66b',
	codeKeyword: '#5cc8d8',
	codeFunction: '#f28fb1',
	codeVariable: '#e8b04a',
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
