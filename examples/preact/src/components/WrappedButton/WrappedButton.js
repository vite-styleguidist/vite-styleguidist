import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './WrappedButton.css';

/**
 * A button wrapped by a Decorator/Enhancer
 */
// No default for `color`, so WrappedButton.css decides — and that stylesheet reads the label
// colour from the style guide's colour scheme. The literal default this used to carry
// (`#333`) was 2.4:1 on a dark page, because WrappedButton.css was never imported and the
// button fell back to the browser's own dark button face. Both halves are fixed here.
const WrappedButton = ({ color, size = 'normal', children }) => {
	const styles = {
		color,
		fontSize: WrappedButton.sizes[size],
	};

	return (
		<button className="wrapped-button" style={styles}>
			{children}
		</button>
	);
};
WrappedButton.propTypes = {
	/**
	 * Button label.
	 */
	children: PropTypes.string.isRequired,
	color: PropTypes.string,
	size: PropTypes.oneOf(['small', 'normal', 'large']),
};
WrappedButton.sizes = {
	small: '10px',
	normal: '14px',
	large: '18px',
};

const Decorator = (Composed) =>
	class MyHOC extends Component {
		render() {
			return <Composed {...this.props} />;
		}
	};

export default Decorator(WrappedButton);
