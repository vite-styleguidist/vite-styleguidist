import React from 'react';
import PropTypes from 'prop-types';

import './Button.css';

/**
 * The only true button.
 */
// No default for `color`: an unset inline colour lets the stylesheet decide, and that
// stylesheet reads the label colour from the style guide's colour scheme. The literal
// default this used to carry (`#333`) was unreadable once dark mode arrived.
export default function Button({ color, size = 'normal', children }) {
	const styles = {
		color,
		fontSize: Button.sizes[size],
	};

	return (
		<button className="button" style={styles}>
			{children}
		</button>
	);
}
Button.propTypes = {
	/**
	 * Button label.
	 */
	children: PropTypes.string.isRequired,
	color: PropTypes.string,
	size: PropTypes.oneOf(['small', 'normal', 'large']),
};
Button.sizes = {
	small: '10px',
	normal: '14px',
	large: '18px',
};
