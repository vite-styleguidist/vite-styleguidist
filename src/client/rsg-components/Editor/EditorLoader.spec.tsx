import React from 'react';
import { render } from '@testing-library/react';
import { EditorLoader } from './EditorLoader.js';

const code = '<button>MyAwesomeCode</button>';
const props = {
	classes: { placeholder: 'placeholder' },
	onChange() {},
	code,
};

describe('EditorLoader', () => {
	it('should show the code as plain text until the editor chunk arrives, then the editor', async () => {
		const { container, findByRole, queryByRole } = render(<EditorLoader {...props} />);

		// Suspense fallback: same text in a <pre> so the layout doesn’t jump
		const placeholder = container.querySelector('pre.placeholder');
		expect(placeholder).toHaveTextContent(code);
		expect(queryByRole('textbox')).not.toBeInTheDocument();

		expect(await findByRole('textbox')).toHaveTextContent(code);
		expect(container.querySelector('pre.placeholder')).toBeNull();
	});
});
