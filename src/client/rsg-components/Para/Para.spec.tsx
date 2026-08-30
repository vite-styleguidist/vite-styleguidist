import React from 'react';
import { render } from '@testing-library/react';
import { ParaRenderer, styles } from './ParaRenderer.js';

const props = {
	classes: classes(styles),
};

it('should render paragraph as a <div>', () => {
	const { getByText } = render(<ParaRenderer {...props}>Pizza</ParaRenderer>);

	const para = getByText('Pizza');
	expect(para.tagName).toBe('DIV');
	expect(para).toHaveClass('para', { exact: true });
});

it('should render paragraph as a <p>', () => {
	const { getByText } = render(
		<ParaRenderer {...props} semantic="p">
			Pizza
		</ParaRenderer>
	);

	const para = getByText('Pizza');
	expect(para.tagName).toBe('P');
	expect(para).toHaveClass('para', { exact: true });
});
