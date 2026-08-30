import React from 'react';
import { render } from '@testing-library/react';
import { ArgumentsRenderer, styles } from './ArgumentsRenderer.js';

const props = {
	classes: classes(styles),
};

// Arguments are keyed by name, so the fixtures need distinct names.
const args = [
	{
		name: 'Foo',
		description: 'Converts foo to bar',
		type: { type: 'NameExpression', name: 'Array' },
	},
	{
		name: 'Bar',
	},
];

it('renderer should render arguments', () => {
	const { container, getByText, queryByRole } = render(
		<ArgumentsRenderer {...props} args={args} />
	);

	expect(container.firstChild).toHaveClass('root');
	expect(container).toHaveTextContent('Foo: Array — Converts foo to bar');
	expect(getByText('Foo').tagName).toBe('CODE');
	expect(getByText('Bar').tagName).toBe('CODE');
	expect(queryByRole('heading')).not.toBeInTheDocument();
});

it('renderer should render heading', () => {
	const { getByRole } = render(<ArgumentsRenderer {...props} args={[args[1]]} heading />);

	expect(getByRole('heading', { level: 5 })).toHaveTextContent('Arguments');
});

it('renderer should render nothing for empty array', () => {
	const { container } = render(<ArgumentsRenderer {...props} args={[]} />);

	expect(container).toBeEmptyDOMElement();
});
