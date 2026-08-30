import React from 'react';
import { render } from '@testing-library/react';
import { ErrorRenderer } from './ErrorRenderer.js';

it('renderer should render error message', () => {
	const error = { toString: () => 'error' };
	const info = { componentStack: 'info' };
	const { container, getByRole } = render(<ErrorRenderer classes={{}} error={error} info={info} />);

	// Error message followed by the component stack
	expect(container.querySelector('pre')?.textContent).toBe('errorinfo');
	expect(container).toHaveTextContent(
		'This may be due to an error in a component you are overriding, or a bug in React Styleguidist.'
	);
	expect(getByRole('link', { name: 'please submit an issue' })).toHaveAttribute(
		'href',
		'https://github.com/styleguidist/react-styleguidist/issues'
	);
});
