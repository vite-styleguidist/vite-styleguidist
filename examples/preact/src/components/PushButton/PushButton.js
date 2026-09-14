import React from 'react';
import PropTypes from 'prop-types';

import './PushButton.css';

/**
 * An example-less button.
 */
// No default for `color`: an unset inline colour lets the stylesheet decide, and that
// stylesheet reads the label colour from the style guide's colour scheme. The literal
// default this used to carry (`#333`) was unreadable once dark mode arrived.
export default function PushButton({ color, size = 'normal', children }) {
	const styles = {
		color,
		fontSize: PushButton.sizes[size],
	};

	return (
		<button className="push-button" style={styles}>
			{children}
		</button>
	);
}
PushButton.propTypes = {
	/**
	 * PushButton label.
	 */
	children: PropTypes.string.isRequired,
	color: PropTypes.string,
	size: PropTypes.oneOf(['small', 'normal', 'large']),
};
PushButton.sizes = {
	small: '10px',
	normal: '14px',
	large: '18px',
};
