import React from 'react';
import { render } from '@testing-library/react';
import Img from './index.js';

describe('Markdown Img', () => {
	it('should render an image with the styled class and pass its attributes through', () => {
		const { getByAltText } = render(<Img src="pizza.png" alt="Pizza" title="A pizza" />);

		const img = getByAltText('Pizza');
		expect(img.tagName).toBe('IMG');
		expect(img.getAttribute('src')).toBe('pizza.png');
		expect(img.getAttribute('title')).toBe('A pizza');
		expect(img.className).toMatch(/^rsg--img-\d+$/);
	});
});
