import React from 'react';
import { render } from '@testing-library/react';
import { ArgumentRenderer, styles } from './ArgumentRenderer.js';

const name = 'Foo';
// Types are doctrine type expressions, the shape the loaders pass to the client.
const type = { type: 'NameExpression', name: 'Array' };
const description = 'Converts foo to bar';
const props = {
	classes: classes(styles),
	name: 'argname',
};

// Group (rsg-components/Group) joins the parts with a single space, so the exact text content
// captures both the parts and their order.
it('should render argument', () => {
	const { container, getByText } = render(
		<ArgumentRenderer {...props} name={name} type={type} description={description} />
	);

	expect(container.textContent).toBe('Foo: Array — Converts foo to bar');
	expect(getByText('Foo').tagName).toBe('CODE');
});

it('should render argument without type', () => {
	const { container } = render(
		<ArgumentRenderer {...props} name={name} description={description} />
	);

	expect(container.textContent).toBe('Foo Converts foo to bar');
});

it('should render optional argument', () => {
	const { container } = render(
		<ArgumentRenderer
			{...props}
			type={{ type: 'OptionalType', expression: { type: 'NameExpression', name: 'Array' } }}
			description={description}
		/>
	);

	expect(container.textContent).toBe('argname: Array? — Converts foo to bar');
});

it('should render default value of argument', () => {
	const { container } = render(
		<ArgumentRenderer
			{...props}
			type={{ type: 'NameExpression', name: 'String' }}
			default="bar"
			description={description}
		/>
	);

	expect(container.textContent).toBe('argname: String=bar — Converts foo to bar');
});

it('should render default value of optional argument', () => {
	const { container } = render(
		<ArgumentRenderer
			{...props}
			type={{ type: 'OptionalType', expression: { type: 'NameExpression', name: 'Boolean' } }}
			default="true"
			description={description}
		/>
	);

	expect(container.textContent).toBe('argname: Boolean?=true — Converts foo to bar');
});

it('should render argument without description', () => {
	const { container } = render(<ArgumentRenderer {...props} name={name} type={type} />);

	expect(container.textContent).toBe('Foo: Array');
});

it('should render return value', () => {
	const { container } = render(
		<ArgumentRenderer {...props} type={type} description={description} returns />
	);

	expect(container.textContent).toBe('Returns argname: Array — Converts foo to bar');
});

it('should render with block styles', () => {
	const { container } = render(<ArgumentRenderer {...props} block />);

	expect(container.firstChild).toHaveClass('block');
	expect(container.textContent).toBe('argname');
});
