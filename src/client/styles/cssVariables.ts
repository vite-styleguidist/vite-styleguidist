import jss from './setupjss.js';
import { light, dark, cssVariableName, COLOR_SCHEME_ATTRIBUTE } from './colorSchemes.js';

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
 * attribute is absent (system setting) and the OS prefers dark.
 *
 * Every selector is wrapped in `:where()`, which has zero specificity: the three rules
 * then resolve among themselves by source order alone (light, then the toggle’s dark, then
 * the OS’s dark, which the media query limits to "no explicit light choice"), and any rule
 * a user writes (`:root { --rsg-color-link: … }` in a template or a required stylesheet)
 * outranks all of them wherever it sits in <head>. This sheet is attached by JSS at runtime,
 * after every stylesheet of the page, so without `:where()` the documented overrides
 * would lose on source order.
 */
export const createVariableStyles = (
	palettes: { light: Palette; dark: Palette } = { light, dark }
) => ({
	'@global': {
		':where(:root)': declarations(palettes.light, 'light'),
		[`:where([${COLOR_SCHEME_ATTRIBUTE}="dark"])`]: declarations(palettes.dark, 'dark'),
	},
	'@media (prefers-color-scheme: dark)': {
		'@global': {
			[`:where(:root:not([${COLOR_SCHEME_ATTRIBUTE}="light"]))`]: declarations(
				palettes.dark,
				'dark'
			),
		},
	},
});

// Attach once, next to the body sheet in styles.ts (both imported from index.ts)
jss.createStyleSheet(createVariableStyles(), { meta: 'rsg-color-schemes' }).attach();
