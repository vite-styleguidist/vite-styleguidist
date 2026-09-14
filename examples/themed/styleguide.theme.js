/*
 * The `theme` option: a partial theme object, deep-merged into Styleguidist's own
 * (src/client/styles/theme.ts has every key).
 *
 * A colour token is a plain CSS value, so it can be a custom property of this style guide's
 * own — styleguide.colors.css gives `--themed-accent` a value per colour scheme, and the
 * value after the comma is the light-scheme fallback. A literal here (`link: '#F50'`, which
 * is what this file used to say) would replace the custom property Styleguidist publishes and
 * pin the link colour to one value in both schemes; see the comment in styleguide.colors.css.
 */
export default {
	color: {
		link: 'var(--themed-accent, #a8480d)',
		linkHover: 'var(--themed-accent-hover, #7d3409)',
	},
};
