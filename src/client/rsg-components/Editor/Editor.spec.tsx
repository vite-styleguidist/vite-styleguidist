import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Editor } from './Editor.js';

const code = '<button>MyAwesomeCode</button>';
const newCode = '<button>MyNewAwesomeCode</button>';
const props = {
	classes: {},
	onChange() {},
	code,
};

describe('Editor', () => {
	it('should render an editor with highlighted code', () => {
		const { container, getByRole } = render(<Editor {...props} />);

		// react-simple-code-editor renders a textarea for input and a <pre> with the highlighted copy
		expect(getByRole('textbox')).toHaveValue(code);
		expect(container.querySelector('pre .token')).not.toBeNull();
	});

	it('should update code', () => {
		const { rerender, getByRole } = render(<Editor {...props} />);

		rerender(<Editor {...props} code={newCode} />);

		expect(getByRole('textbox')).toHaveValue(newCode);
	});

	it('should call onChange when textarea value changes', () => {
		const onChange = vi.fn();
		const { getByRole } = render(<Editor {...props} onChange={onChange} />);

		fireEvent.change(getByRole('textbox'), { target: { value: newCode } });

		expect(onChange).toHaveBeenCalledWith(newCode);
	});
});
