import React from 'react';
import type { FieldProps } from './Field.types';
import './styles.css';

/**
 * A labelled text input that forwards its ref to the underlying `<input>`.
 * Its props are declared in a separate module (`Field.types.ts`).
 */
const Field = React.forwardRef<HTMLInputElement, FieldProps>(function Field(
	{ label, hint, invalid = false, ...rest },
	ref
) {
	return (
		<label className="rsg-ts-field">
			{label}
			<input ref={ref} aria-invalid={invalid || undefined} {...rest} />
			{hint && <small data-error={invalid}>{hint}</small>}
		</label>
	);
});

export default Field;
