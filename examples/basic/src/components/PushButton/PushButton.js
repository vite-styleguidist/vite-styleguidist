import React from 'react';
import PropTypes from 'prop-types';

import './PushButton.css';

/**
 * An example-less button with custom display name.
 * @visibleName Push Button 🎉
 */
// No default for `color`, so PushButton.css (which follows the colour scheme) decides.
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
