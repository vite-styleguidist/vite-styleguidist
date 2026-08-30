import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

/**
 * The only true button.
 */
export default function Button({
	variant = 'default',
	size = 'medium',
	disabled = false,
	onClick,
	children,
}) {
	return (
		<button
			type="button"
			className={`button button--${variant} button--${size}`}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

Button.propTypes = {
	/** Button label */
	children: PropTypes.node.isRequired,
	/** Visual style of the button */
	variant: PropTypes.oneOf(['default', 'primary', 'danger']),
	/** Size of the button */
	size: PropTypes.oneOf(['small', 'medium', 'large']),
	/** Disables the button */
	disabled: PropTypes.bool,
	/** Gets called when the user clicks on the button */
	onClick: PropTypes.func,
};
