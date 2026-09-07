import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './WrappedButton.css';

/**
 * A button wrapped by a Decorator/Enhancer
 *
 * @version 1.0.1
 * @author [Jeremy Gayed](https://github.com/tizmagik)
 * @deprecated Use the [only true button](#button) instead
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
	/**
	 * The color for the button
	 *
	 * @see Check [Wikipedia](https://en.wikipedia.org/wiki/Web_colors#HTML_color_names) for a list of color names
	 */
	color: PropTypes.string,
	/**
	 * The size of the Button
	 *
	 * @since Version 1.0.1
	 */
	size: PropTypes.oneOf(['small', 'normal', 'large']),
	/**
	 * The width of the button
	 *
	 * @deprecated Do not use! Use size instead!
	 */
	width: PropTypes.number,
	/**
	 * Gets called when the user clicks on the button
	 *
	 * @param { SyntheticEvent } event The react `SyntheticEvent`
	 * @return { SyntheticEvent } The `onClick` `SyntheticEvent`
	 */
	onClick: PropTypes.func,
	/**
	 * A prop that should not be visible in the doc.
	 * @ignore
	 */
	ignoredProp: PropTypes.bool,
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
