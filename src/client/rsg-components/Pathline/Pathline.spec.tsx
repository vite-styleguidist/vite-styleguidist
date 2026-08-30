import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import copy from 'clipboard-copy';
import { PathlineRenderer, styles } from './PathlineRenderer.js';

// Vitest has no automocking: replace the module's default export with a spy explicitly
vi.mock('clipboard-copy', () => ({ default: vi.fn() }));

const pathline = 'foo/bar';
const props = {
	classes: classes(styles),
};

it('renderer should render a path line with a copy button', () => {
	const { container, getByRole } = render(
		<PathlineRenderer {...props}>{pathline}</PathlineRenderer>
	);

	const root = container.firstChild;
	expect(root).toHaveClass('pathline', { exact: true });
	expect(root).toHaveTextContent(pathline);

	const button = getByRole('button', { name: 'Copy to clipboard' });
	expect(root).toContainElement(button);
	expect(button).toHaveClass('copyButton');
	// The copy icon (react-icons renders an inline SVG)
	expect(button.querySelector('svg')).toBeInTheDocument();
});

test('should copy text on click', () => {
	const { getByRole } = render(<PathlineRenderer {...props}>{pathline}</PathlineRenderer>);
	fireEvent.click(getByRole('button'));
	expect(copy).toHaveBeenCalledWith(pathline);
});
