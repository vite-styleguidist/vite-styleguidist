import React from 'react';
import { render } from '@testing-library/react';
import Blockquote from './index.js';

describe('Markdown Blockquote', () => {
	it('should render a blockquote', () => {
		const { getByText } = render(
			<Blockquote>To be, or not to be: that is the question</Blockquote>
		);

		const blockquote = getByText('To be, or not to be: that is the question');
		expect(blockquote.tagName).toBe('BLOCKQUOTE');
		expect(blockquote.className).toMatch(/^rsg--blockquote-\d+$/);
	});

	it('should preserve custom css class', () => {
		const { getByText } = render(
			<Blockquote className="test-class">To be, or not to be: that is the question</Blockquote>
		);

		const blockquote = getByText('To be, or not to be: that is the question');
		expect(blockquote.className).toMatch(/^rsg--blockquote-\d+ test-class$/);
	});
});
