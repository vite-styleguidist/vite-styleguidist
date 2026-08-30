import React from 'react';
import { render } from '@testing-library/react';
import Heading from './index.js';

describe('Heading', () => {
	it('should render a heading according to the level', () => {
		const { getByRole, rerender } = render(<Heading level={3}>The heading</Heading>);

		const h3 = getByRole('heading', { level: 3 });
		expect(h3).toHaveTextContent('The heading');
		expect(h3.className).toMatch(/^rsg--heading-\d+ rsg--heading3-\d+$/);

		rerender(<Heading level={5}>The heading</Heading>);

		const h5 = getByRole('heading', { level: 5 });
		expect(h5).toHaveTextContent('The heading');
		expect(h5.className).toMatch(/^rsg--heading-\d+ rsg--heading5-\d+$/);
	});

	it('should render a heading', () => {
		const { getByRole } = render(<Heading level={2}>The heading</Heading>);

		const h2 = getByRole('heading', { level: 2 });
		expect(h2).toHaveTextContent('The heading');
		expect(h2.className).toMatch(/^rsg--heading-\d+ rsg--heading2-\d+$/);
	});
});
