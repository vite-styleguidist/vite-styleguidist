import React from 'react';
import { render } from '@testing-library/react';
import { TypeRenderer, styles } from './TypeRenderer.js';

const props = {
	classes: classes(styles),
};

it('renderer should render type', () => {
	const { getByText } = render(<TypeRenderer {...props}>Array</TypeRenderer>);

	const type = getByText('Array');
	expect(type.tagName).toBe('SPAN');
	expect(type).toHaveClass('type', { exact: true });
});
