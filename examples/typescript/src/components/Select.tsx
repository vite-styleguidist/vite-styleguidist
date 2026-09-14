import React from 'react';
import './styles.css';

export interface SelectProps<Option> {
	/** Text of the `<label>`. */
	label: string;
	/** The options to choose from. */
	options: Option[];
	/** Reads the visible text of an option. */
	getLabel: (option: Option) => string;
	/** Called with the option the user picked. */
	onPick?: (option: Option) => void;
}

/**
 * A generic select: `Option` is inferred from `options`, so `getLabel` and `onPick`
 * are typed against your own option type.
 */
export default function Select<Option>({ label, options, getLabel, onPick }: SelectProps<Option>) {
	return (
		<label className="rsg-ts-field">
			{label}
			<select onChange={(event) => onPick?.(options[event.target.selectedIndex])}>
				{options.map((option, index) => (
					<option key={index}>{getLabel(option)}</option>
				))}
			</select>
		</label>
	);
}
