import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ToolbarButtonRenderer, styles } from './ToolbarButtonRenderer.js';

const props = {
	classes: classes(styles),
	title: 'Pizza button',
};

it('should render a button', () => {
	const onClick = vi.fn();
	const { getByRole } = render(
		<ToolbarButtonRenderer {...props} onClick={onClick}>
			pizza
		</ToolbarButtonRenderer>
	);

	const button = getByRole('button', { name: 'Pizza button' });
	expect(button).toHaveAttribute('type', 'button');
	expect(button).toHaveAttribute('title', 'Pizza button');
	expect(button).toHaveClass('button', { exact: true });
	expect(button).toHaveTextContent('pizza');

	fireEvent.click(button);
	expect(onClick).toHaveBeenCalledTimes(1);
});

it('should render a link', () => {
	const { getByRole } = render(
		<ToolbarButtonRenderer {...props} href="/foo">
			pizza
		</ToolbarButtonRenderer>
	);

	const link = getByRole('link', { name: 'Pizza button' });
	expect(link).toHaveAttribute('href', '/foo');
	expect(link).toHaveAttribute('title', 'Pizza button');
	expect(link).toHaveClass('button', { exact: true });
	expect(link).toHaveTextContent('pizza');
});

it('should pass a class name to a button', () => {
	const { getByRole } = render(
		<ToolbarButtonRenderer {...props} onClick={() => {}} className="foo-class">
			pizza
		</ToolbarButtonRenderer>
	);

	expect(getByRole('button')).toHaveClass('button foo-class', { exact: true });
});

it('should pass a class name to a link', () => {
	const { getByRole } = render(
		<ToolbarButtonRenderer {...props} href="/foo" className="foo-class">
			pizza
		</ToolbarButtonRenderer>
	);

	expect(getByRole('link')).toHaveClass('button foo-class', { exact: true });
});

it('should render a button with small styles', () => {
	const { getByRole } = render(
		<ToolbarButtonRenderer {...props} onClick={() => {}} small>
			butterbrot
		</ToolbarButtonRenderer>
	);

	expect(getByRole('button')).toHaveClass('button isSmall', { exact: true });
});
