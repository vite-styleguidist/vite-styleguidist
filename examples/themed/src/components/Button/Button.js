import React from 'react';
import PropTypes from 'prop-types';

import './Button.css';

/**
 * The only true button.
 */
// No default for `color`: an unset inline colour lets the stylesheet decide, and that
// stylesheet reads the label colour from the style guide's colour scheme. The literal
// default this used to carry (`#333`) was unreadable once dark mode arrived.
export default function Button({
	color,
	size = 'normal',
	onClick = (event) => {
		console.log('You have clicked me!', event.target);
	},
	disabled,
	children,
}) {
	const styles = {
		color,
		fontSize: Button.sizes[size],
	};

	return (
		<button className="button" style={styles} onClick={onClick} disabled={disabled}>
			{children}
		</button>
	);
}
Button.propTypes = {
	/** Button label */
	children: PropTypes.node.isRequired,
	/** The color for the button. Defaults to the muted text colour of the colour scheme. */
	color: PropTypes.string,
	/** The size of the button */
	size: PropTypes.oneOf(['small', 'normal', 'large']),
	/** Disable button */
	disabled: PropTypes.bool,
	/** Gets called when the user clicks on the button */
	onClick: PropTypes.func,
};
Button.sizes = {
	small: '10px',
	normal: '14px',
	large: '18px',
};
