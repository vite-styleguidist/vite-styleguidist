import React from 'react';
import { render } from '@testing-library/react';
import MarkdownHeading from './index.js';

describe('Markdown Heading', () => {
	it('should render a heading with a wrapper that provides margin and an id', () => {
		const { container, getByRole } = render(
			<MarkdownHeading id="the-markdown-heading" level={2}>
				The markdown heading
			</MarkdownHeading>
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.tagName).toBe('DIV');
		expect(wrapper.className).toMatch(/^rsg--spacing-\d+$/);

		const heading = getByRole('heading', { level: 2 });
		expect(heading).toHaveAttribute('id', 'the-markdown-heading');
		expect(heading).toHaveTextContent('The markdown heading');
		expect(wrapper).toContainElement(heading);
	});
});
