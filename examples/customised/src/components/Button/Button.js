import React from 'react';
import PropTypes from 'prop-types';

import s from './Button.module.css';

/**
 * The only true button.
 */
export default function Button({ color = '#333', size = 'normal', children }) {
	const styles = {
		color,
		fontSize: Button.sizes[size],
	};

	return (
		<button className={s.root} style={styles}>
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
