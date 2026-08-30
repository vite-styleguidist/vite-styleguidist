import React from 'react';
import { render } from '@testing-library/react';
import { NameRenderer, styles } from './NameRenderer.js';

const props = {
	classes: classes(styles),
};

it('renderer should render argument name', () => {
	const { getByText } = render(<NameRenderer {...props}>Foo</NameRenderer>);

	const name = getByText('Foo');
	expect(name.tagName).toBe('CODE');
	expect(name).toHaveClass('name', { exact: true });
});

it('renderer should render deprecated argument name', () => {
	const { getByText } = render(
		<NameRenderer {...props} deprecated>
			Foo
		</NameRenderer>
	);

	expect(getByText('Foo')).toHaveClass('name isDeprecated', { exact: true });
});
