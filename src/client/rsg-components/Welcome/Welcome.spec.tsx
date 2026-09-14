import React from 'react';
import { render } from '@testing-library/react';
import { WelcomeRenderer } from './WelcomeRenderer.js';
import { DOCS_COMPONENTS } from '../../../scripts/consts.js';

it('renderer should render welcome screen', () => {
	const { getByRole, getByText } = render(
		<WelcomeRenderer classes={{}} patterns={['foo/*.js', 'bar/*.js']} />
	);

	expect(getByRole('heading', { name: 'No components found yet' })).toBeInTheDocument();
	expect(getByText(/looked for components matching these patterns/i)).toBeInTheDocument();

	// Each pattern is listed as inline code
	const patterns = getByRole('list');
	expect(patterns).toHaveTextContent('foo/*.js');
	expect(patterns).toHaveTextContent('bar/*.js');

	expect(getByText(/point it at yours with the/i)).toHaveTextContent(
		'Point it at yours with the components option in styleguide.config.js.'
	);
	expect(getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', DOCS_COMPONENTS);
});

it('renderer should not list patterns when there are none', () => {
	const { queryByRole, getByText } = render(<WelcomeRenderer classes={{}} patterns={[]} />);

	expect(queryByRole('list')).not.toBeInTheDocument();
	expect(getByText(/looked for components in your project and found none\./i)).toBeInTheDocument();
});
