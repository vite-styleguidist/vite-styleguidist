import React from 'react';
import { render } from '@testing-library/react';
import { TextRenderer, styles } from './TextRenderer.js';

const props = {
	classes: classes(styles),
};

describe('Text', () => {
	it('should render text', () => {
		const { getByText } = render(<TextRenderer {...props}>Pizza</TextRenderer>);

		const text = getByText('Pizza');
		expect(text.tagName).toBe('SPAN');
		expect(text).toHaveClass('text inheritSize baseColor', { exact: true });
	});

	it('should render underlined text', () => {
		const { getByText } = render(
			<TextRenderer {...props} underlined>
				Pizza
			</TextRenderer>
		);

		expect(getByText('Pizza')).toHaveClass('text inheritSize baseColor isUnderlined', {
			exact: true,
		});
	});

	it('should render sized text', () => {
		const { getByText } = render(
			<TextRenderer {...props} size="small">
				Pizza
			</TextRenderer>
		);

		expect(getByText('Pizza')).toHaveClass('text smallSize baseColor', { exact: true });
	});

	it('should render colored text', () => {
		const { getByText } = render(
			<TextRenderer {...props} color="light">
				Pizza
			</TextRenderer>
		);

		expect(getByText('Pizza')).toHaveClass('text inheritSize lightColor', { exact: true });
	});

	it('should render text with a semantic tag and styles', () => {
		const { getByText } = render(
			<TextRenderer {...props} semantic="strong">
				Pizza
			</TextRenderer>
		);

		const text = getByText('Pizza');
		expect(text.tagName).toBe('STRONG');
		expect(text).toHaveClass('text inheritSize baseColor strong', { exact: true });
	});

	it('should render text with a title', () => {
		const { getByText } = render(
			<TextRenderer {...props} title="Pasta">
				Pizza
			</TextRenderer>
		);

		expect(getByText('Pizza')).toHaveAttribute('title', 'Pasta');
	});
});
