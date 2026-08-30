import React from 'react';
import { render } from '@testing-library/react';
import { Details, DetailsSummary } from './index.js';

describe('Markdown Details', () => {
	it('should render a Details', () => {
		const { container, getByText } = render(
			<Details>
				<DetailsSummary>Solution</DetailsSummary>
				This is a hidden text.
			</Details>
		);

		const details = container.firstChild as HTMLElement;
		expect(details.tagName).toBe('DETAILS');
		expect(details.className).toMatch(/^rsg--details-\d+$/);
		expect(details).toHaveTextContent('This is a hidden text.');

		const summary = getByText('Solution');
		expect(summary.tagName).toBe('SUMMARY');
		expect(summary.className).toMatch(/^rsg--summary-\d+$/);
		expect(details).toContainElement(summary);
	});
});
