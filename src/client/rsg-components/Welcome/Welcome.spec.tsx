import React from 'react';
import { render } from '@testing-library/react';
import { WelcomeRenderer } from './WelcomeRenderer.js';
import { DOCS_COMPONENTS } from '../../../scripts/consts.js';

it('renderer should render welcome screen', () => {
	const { getByRole, getByText } = render(
		<WelcomeRenderer classes={{}} patterns={['foo/*.js', 'bar/*.js']} />
	);

	expect(getByRole('heading', { name: 'Welcome to Vite Styleguidist!' })).toBeInTheDocument();
	expect(getByText(/we couldn’t find any components/i)).toBeInTheDocument();

	// Each pattern is listed as inline code
	const patterns = getByRole('list');
	expect(patterns).toHaveTextContent('foo/*.js');
	expect(patterns).toHaveTextContent('bar/*.js');

	expect(getByText(/module\.exports = \{/)).toBeInTheDocument();
	expect(getByRole('link', { name: 'locating components guide' })).toHaveAttribute(
		'href',
		DOCS_COMPONENTS
	);
});
