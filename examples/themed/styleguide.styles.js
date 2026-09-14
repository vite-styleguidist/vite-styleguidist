/*
 * The `styles` option: JSS rules merged into any of the style guide's own rule keys, here the
 * `preview` box of the Playground (the frame around every rendered example).
 *
 * The colour is a custom property with a value per colour scheme (styleguide.colors.css), for
 * the same reason the theme's link colour is: a literal is stuck with whichever scheme it was
 * picked for. This slab is decorative — no text sits on it — so it only has to stay a tint of
 * the page rather than clear a contrast threshold.
 */
export default {
	Playground: {
		preview: {
			paddingLeft: 0,
			paddingRight: 0,
			borderWidth: [[0, 110, 1, 0]],
			borderRadius: 0,
			borderColor: 'var(--themed-rule, #ffc0cb)',
		},
	},
};
