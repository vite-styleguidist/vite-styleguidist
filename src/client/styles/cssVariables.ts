import jss from './setupjss.js';
import { light, dark, cssVariableName } from './colorSchemes.js';

/**
 * Attribute on `<html>` that holds the applied colour scheme: `"light"`, `"dark"`,
 * or absent to follow the operating system (ADR 0011). Written before the first
 * paint by the inline script in src/vite/html.ts and by the ThemeToggle component.
 */
export const COLOR_SCHEME_ATTRIBUTE = 'data-rsg-theme';

type Palette = Record<string, string>;

// `isolate: false`: these rules style the document root, not a component, so the
// jss-plugin-isolate reset (margin 0, padding 0, …) must not be attached to them.
const declarations = (palette: Palette, colorScheme: 'light' | 'dark') => ({
	isolate: false,
	// Tells the browser which scheme form controls, scrollbars and the canvas should
	// use; the <meta name="color-scheme"> in the HTML only says which ones exist.
	colorScheme,
	...Object.fromEntries(
		Object.entries(palette).map(([token, value]) => [cssVariableName(token), value])
	),
});

/**
 * The global variable sheet: `:root` carries the light values, the attribute
 * selector the dark ones, and the media query applies the dark ones when the
 * attribute is absent (system setting) and the OS prefers dark. Source order matters
 * for the first two (equal specificity, later wins), and `:root:not(...)` outranks
 * `:root`, so an explicit "light" choice beats a dark OS.
 */
export const createVariableStyles = (
	palettes: { light: Palette; dark: Palette } = { light, dark }
) => ({
	'@global': {
		':root': declarations(palettes.light, 'light'),
		[`[${COLOR_SCHEME_ATTRIBUTE}="dark"]`]: declarations(palettes.dark, 'dark'),
	},
	'@media (prefers-color-scheme: dark)': {
		'@global': {
			[`:root:not([${COLOR_SCHEME_ATTRIBUTE}="light"])`]: declarations(palettes.dark, 'dark'),
		},
	},
});

// Attach once, next to the body sheet in styles.ts (both imported from index.ts)
jss.createStyleSheet(createVariableStyles(), { meta: 'rsg-color-schemes' }).attach();
