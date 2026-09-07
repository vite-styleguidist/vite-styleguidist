import React from 'react';
import './styles.css';

/** The three visual styles a button can take. Exported so other components can reuse it. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Visual style of the button. */
	variant?: ButtonVariant;
	/** Size of the button. */
	size?: 'small' | 'medium' | 'large';
	/** Replaces the label with a placeholder and disables the button. */
	loading?: boolean;
	/** Button label. */
	children: React.ReactNode;
}

/**
 * A button in three variants and three sizes. Its props extend
 * `React.ButtonHTMLAttributes`, so every native button attribute works too.
 */
export default function Button({
	variant = 'primary',
	size = 'medium',
	loading = false,
	children,
	...rest
}: ButtonProps) {
	return (
		<button
			type="button"
			className="rsg-ts-button"
			data-variant={variant}
			data-size={size}
			{...rest}
			disabled={loading || rest.disabled}
		>
			{loading ? 'Loading…' : children}
		</button>
	);
}
