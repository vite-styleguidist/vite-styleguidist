import { transparentize, modularScale } from 'polished';

const scale = (value: number) => modularScale(value, '1rem', 'majorThird');

const fontSizes = {
	xxxl: scale(5),
	xxl: scale(4),
	xl: scale(3),
	l: scale(1),
	m: scale(0),
	s: scale(-0.5),
	xs: scale(-0.75),
};

const theme = {
	fonts: {
		base: 'Helvetica Neue, Helvetica, Arial, sans-serif',
		heading: 'Helvetica Neue, Helvetica, Arial, sans-serif',
	},
	fontSizes: {
		base: fontSizes.m,
		...fontSizes,
	},
	fontWeights: {
		normal: 400,
		bold: 700,
	},
	headingFontWeights: {
		xxxl: 400,
		xxl: 400,
		xl: 400,
		l: 400,
		m: 700,
	},
	lineHeights: {
		base: 1.5,
		heading: 1.1,
	},
	/*
	 * Two kinds of colour, and they behave differently inside a style guide that has a light
	 * and a dark scheme (see src/styles.ts, where each `--sc-*` property gets its value).
	 *
	 * The neutrals — page ink, its inverse, the greys — are custom properties with one value
	 * per scheme, so a component of this library reads on the light page and on the dark one.
	 * A theme colour is a plain CSS value, so a `var()` works anywhere a hex would; the value
	 * after the comma is the light-scheme fallback for anywhere these properties are not
	 * defined (this library in an application of its own, a unit test).
	 *
	 * The identity colours — the hover pink, its ink and the focus ring — are literals,
	 * because they always paint their own background: a colour and the background it sits on,
	 * given together, do not depend on the page behind them and need no second value.
	 * `hoverText` is new, and is why the hover state is legible at all: the buttons used to
	 * keep their `bg`-coloured label on the pink, at 2.1:1.
	 */
	colors: {
		bg: 'var(--sc-bg, #fff)',
		base: 'var(--sc-base, #333)',
		primary: 'var(--sc-primary, #6f4d94)',
		secondary: 'var(--sc-secondary, #6b6b6b)',
		light: 'var(--sc-light, #ccc)',
		lighter: 'var(--sc-lighter, #efefef)',
		hover: '#ed9dc5',
		hoverText: '#42212f',
		focus: transparentize(0.4, '#ed9dc5'),
		error: 'var(--sc-error, #b8352e)',
		rating: '#f8c124',
	},
	borders: {
		none: 'none',
		thin: '1px solid',
	},
	radii: {
		base: '0.15em',
	},
	space: [
		0,
		'0.125rem', // 2px
		'0.25rem', // 4px
		'0.5rem', // 8px
		'1rem', // 16px
		'2rem', // 32px
		'4rem', // 64px
		'8rem', // 128px
		'16rem', // 256px
		'32rem', // 512px
	],
};

export default theme;

/*
 * The same theme with ink and paper swapped. Swapping the `var()` strings swaps the roles in
 * both colour schemes at once, which is the point of keeping the neutrals in properties:
 * `bg` becomes whatever the page ink is, so an inverted block stays inverted relative to the
 * page it is on rather than always being “dark on light”.
 */
export const inverted = {
	...theme,
	colors: {
		...theme.colors,
		bg: theme.colors.base,
		base: theme.colors.bg,
		primary: theme.colors.bg,
		focus: transparentize(0.1, theme.colors.hover),
		secondary: 'var(--sc-light, #ccc)',
	},
};
