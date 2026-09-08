import { createGlobalStyle } from 'styled-components';

/*
 * The neutral half of the palette (src/theme.ts), with a value per colour scheme.
 *
 * Styleguidist gives the page a light and a dark scheme, and declares its own colours in
 * exactly this shape: light values on `:root`, dark values under the attribute its scheme
 * toggle sets on `<html>`, and the dark values again inside `prefers-color-scheme` for
 * visitors who have made no choice. A component library that does the same follows the toggle
 * for free — and keeps working outside the style guide, where none of these are defined and
 * the fallbacks in src/theme.ts apply.
 *
 * Every text/background pair the components put together clears WCAG AA (4.5:1) in both
 * schemes: white on the light `primary` is 6.6:1 and near-black on the dark one 8.1:1, the
 * `secondary` grey is 5.2:1 and 6.9:1, and the hover ink on the hover pink is 6.9:1.
 *
 * `--sc-` for “styled-components”: use your own prefix, and do not reuse Styleguidist's
 * `--rsg-color-*` names for values of your own — those are its tokens, and it sets them.
 */
const GlobalStyle = createGlobalStyle`
	:root {
		--sc-bg: #fff;
		--sc-base: #333;
		--sc-primary: #6f4d94;
		--sc-secondary: #6b6b6b;
		--sc-light: #ccc;
		--sc-lighter: #efefef;
		--sc-error: #b8352e;
	}
	[data-rsg-theme='dark'] {
		--sc-bg: #1c1a17;
		--sc-base: #ece8e1;
		--sc-primary: #c3a6e0;
		--sc-secondary: #a8a29a;
		--sc-light: #3a3631;
		--sc-lighter: #262320;
		--sc-error: #f28b82;
	}
	@media (prefers-color-scheme: dark) {
		:root:not([data-rsg-theme='light']) {
			--sc-bg: #1c1a17;
			--sc-base: #ece8e1;
			--sc-primary: #c3a6e0;
			--sc-secondary: #a8a29a;
			--sc-light: #3a3631;
			--sc-lighter: #262320;
			--sc-error: #f28b82;
		}
	}
	body {
		margin: 0;
		padding: 0;
	}
	html {
		box-sizing: border-box;
	}
	*,
	*:before,
	*:after {
 		box-sizing: inherit;
	}
`;

export default GlobalStyle;
