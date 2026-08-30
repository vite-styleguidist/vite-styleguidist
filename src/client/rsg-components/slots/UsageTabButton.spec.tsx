import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import UsageTabButton from './UsageTabButton.js';

const props = {
	name: 'Pizza',
	onClick: vi.fn(),
};

it('should render a button', () => {
	const { getByRole } = render(<UsageTabButton {...props} props={{ props: [{ name: 'foo' }] }} />);

	const button = getByRole('button', { name: 'Props & methods' });
	expect(button).toHaveAttribute('name', 'Pizza');

	fireEvent.click(button);
	expect(props.onClick).toHaveBeenCalledTimes(1);
});

it('should render a button if there are only methods', () => {
	const { getByRole } = render(
		<UsageTabButton {...props} props={{ methods: [{ name: 'bar' }] }} />
	);

	expect(getByRole('button', { name: 'Props & methods' })).toBeInTheDocument();
});

it('should render null if there are not props or methods', () => {
	const { container } = render(<UsageTabButton {...props} props={{}} />);

	expect(container).toBeEmptyDOMElement();
});
