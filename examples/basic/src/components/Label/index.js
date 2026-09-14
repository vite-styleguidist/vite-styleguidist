import React from 'react';
import PropTypes from 'prop-types';

/**
 * The only true label.
 */
// The defaults are the style guide's own colours, read through the custom properties it
// publishes for every `theme.color.*` token (`--rsg-color-<kebab-name>`), so an unstyled label
// follows the light/dark toggle. An inline style takes a `var()` like any other CSS value;
// the second argument is the light-scheme fallback for anywhere the style guide is not around.
// The literals this used to carry (`#333` on `white`) stayed light on the dark page.
// See docs/Cookbook.md, "How to make my components follow the style guide’s colour scheme?".
export default function Label({
	color = 'var(--rsg-color-base, #262421)',
	background = 'var(--rsg-color-code-background, #f3f1ec)',
	children,
}) {
	const styles = {
		color,
		background,
		padding: '.5em 1em',
		borderRadius: '0.3em',
		fontFamily: 'arial',
	};

	return <label style={styles}>{children}</label>;
}
Label.propTypes = {
	/**
	 * Label text.
	 */
	children: PropTypes.string.isRequired,
	color: PropTypes.string,
	background: PropTypes.string,
};
