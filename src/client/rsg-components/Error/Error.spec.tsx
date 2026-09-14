import React from 'react';
import { render } from '@testing-library/react';
import { ErrorRenderer } from './ErrorRenderer.js';
import { BUGS } from '../../../scripts/consts.js';

it('renderer should render error message', () => {
	const error = { toString: () => 'error' };
	const info = { componentStack: 'info' };
	const { container, getByRole } = render(<ErrorRenderer classes={{}} error={error} info={info} />);

	const heading = getByRole('heading', { name: 'Something went wrong' });
	expect(heading).toBeInTheDocument();

	// The crash is announced, the stack is not: assistive technology reads the title and the
	// explanation, and the stack stays outside the live region (it would be read frame by frame)
	const alert = getByRole('alert');
	expect(alert).toContainElement(heading);
	expect(alert).not.toContainElement(container.querySelector('pre'));

	// Error message followed by the component stack
	expect(container.querySelector('pre')?.textContent).toBe('errorinfo');
	expect(container).toHaveTextContent(
		'This may be due to an error in a component you are overriding, or a bug in Vite Styleguidist.'
	);
	expect(getByRole('link', { name: 'please submit an issue' })).toHaveAttribute('href', BUGS);
});
