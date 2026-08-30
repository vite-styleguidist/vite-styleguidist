import React from 'react';
import { render } from '@testing-library/react';
import Checkbox from './index.js';

describe('Markdown Checkbox', () => {
	it('should render a checkbox input', () => {
		const { getByRole } = render(<Checkbox />);

		const checkbox = getByRole('checkbox');
		expect(checkbox.tagName).toBe('INPUT');
		expect(checkbox.className).toMatch(/^rsg--input-\d+$/);
	});
});
