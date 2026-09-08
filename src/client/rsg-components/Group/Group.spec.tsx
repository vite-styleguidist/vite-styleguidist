import React from 'react';
import { render } from '@testing-library/react';
import Group from './Group.js';

/* eslint-disable no-console */

const console$error = console.error;

afterEach(() => {
	console.error = console$error;
});

it('should join items with a space by default', () => {
	const { container } = render(
		<Group>
			<code>foo</code>
			<code>bar</code>
			<code>baz</code>
		</Group>
	);
	expect(container.textContent).toBe('foo bar baz');
});

it('should join items with a string separator', () => {
	const { container } = render(
		<Group separator=", ">
			<code>foo</code>
			<code>bar</code>
		</Group>
	);
	expect(container.textContent).toBe('foo, bar');
});

it('should clone an element separator with a key for every gap', () => {
	console.error = vi.fn();
	const { container } = render(
		<Group separator={<span className="sep">|</span>}>
			<code>foo</code>
			<code>bar</code>
			<code>baz</code>
		</Group>
	);
	expect(container.textContent).toBe('foo|bar|baz');
	expect(container.querySelectorAll('.sep')).toHaveLength(2);
	// A missing key would be reported by React
	expect(console.error).not.toHaveBeenCalled();
});

it('should skip empty items', () => {
	const { container } = render(
		<Group>
			{null}
			<code>foo</code>
			{false}
			{''}
			<code>bar</code>
		</Group>
	);
	expect(container.textContent).toBe('foo bar');
});

it('should render a single item without separators', () => {
	const { container } = render(
		<Group separator=", ">
			<code>foo</code>
		</Group>
	);
	expect(container.textContent).toBe('foo');
});

it('should render nothing without children', () => {
	const { container } = render(<Group />);
	expect(container.innerHTML).toBe('');
});
