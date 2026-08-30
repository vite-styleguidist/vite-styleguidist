import React from 'react';
import { render } from '@testing-library/react';
import Hr from './index.js';

describe('Markdown Hr', () => {
	it('should render a horizontal rule', () => {
		const { getByRole } = render(<Hr />);

		const hr = getByRole('separator');
		expect(hr.tagName).toBe('HR');
		expect(hr.className).toMatch(/^rsg--hr-\d+$/);
	});
});
