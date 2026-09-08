import React from 'react';
import { render } from '@testing-library/react';
import { ExamplePlaceholderRenderer } from './ExamplePlaceholderRenderer.js';
import { DOCS_DOCUMENTING } from '../../../scripts/consts.js';

test('should name the Markdown file to create and link to the documenting guide', () => {
	const { getByText, getByRole } = render(
		<ExamplePlaceholderRenderer classes={{}} name="Pizza" />
	);
	expect(getByText('Pizza.md').tagName).toBe('CODE');
	expect(getByText('Readme.md').tagName).toBe('CODE');
	expect(getByRole('link', { name: /how to document components/i })).toHaveAttribute(
		'href',
		DOCS_DOCUMENTING
	);
});

test('should only suggest Readme.md without a component name', () => {
	const { queryByText, getByText } = render(<ExamplePlaceholderRenderer classes={{}} />);
	expect(getByText('Readme.md')).toBeInTheDocument();
	expect(queryByText(/undefined/)).not.toBeInTheDocument();
});
