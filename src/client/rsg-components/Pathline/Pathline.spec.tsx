import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import copy from 'clipboard-copy';
import { COPIED_DURATION, PathlineRenderer, styles } from './PathlineRenderer.js';

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

	const button = getByRole('button', { name: 'Copy path' });
	expect(root).toContainElement(button);
	expect(button).toHaveClass('copyButton');
	// The copy icon (react-icons renders an inline SVG)
	expect(button.querySelector('svg')).toBeInTheDocument();

	// The confirmation is a live region that is empty until something was copied
	expect(getByRole('status')).toBeEmptyDOMElement();
});

test('should copy text on click and confirm it for a moment', async () => {
	vi.useFakeTimers();
	try {
		const { getByRole, getByText } = render(
			<PathlineRenderer {...props}>{pathline}</PathlineRenderer>
		);
		fireEvent.click(getByRole('button'));
		expect(copy).toHaveBeenCalledWith(pathline);

		// The confirmation appears once the (mocked, synchronous) copy has settled; no
		// findBy* here, RTL's waitFor does not know about Vitest's fake timers
		await act(async () => {
			await Promise.resolve();
		});
		expect(getByText('Copied to clipboard')).toHaveClass('copied');

		act(() => {
			vi.advanceTimersByTime(COPIED_DURATION);
		});
		expect(getByRole('status')).toBeEmptyDOMElement();
	} finally {
		vi.useRealTimers();
	}
});
