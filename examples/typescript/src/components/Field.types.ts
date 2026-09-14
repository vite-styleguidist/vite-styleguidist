// The props of `Field` live in their own module, the way a design system often keeps
// shared prop types. Which parser you pick decides whether the style guide can still
// see them, see the Readme next to this example.
import type React from 'react';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
	/** Text of the `<label>`. */
	label: string;
	/** Help text shown under the input. */
	hint?: string;
	/** Turns the hint red and marks the input invalid. */
	invalid?: boolean;
}
