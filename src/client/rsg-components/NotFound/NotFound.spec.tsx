import React from 'react';
import { render } from '@testing-library/react';
import { NotFoundRenderer } from './NotFoundRenderer.js';

it('renderer should render not found message', () => {
	const { getByRole, getByText } = render(<NotFoundRenderer classes={{}} />);

	expect(getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
	expect(
		getByText('The link you followed may be broken, or the page may have been removed.')
	).toBeInTheDocument();
});
