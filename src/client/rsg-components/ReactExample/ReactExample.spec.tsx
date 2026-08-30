import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import noop from 'lodash/noop.js';
import ReactExample from './index.js';

// Examples are evaluated as plain functions with a `require` that only knows React,
// the way the real evalInContext (src/loaders/utils/client/evalInContext.ts) works with
// the modules bundled for the style guide
const requireInExample = (name: string) => {
	if (name === 'react') {
		return React;
	}
	throw new Error(`Cannot find module '${name}'`);
};
const evalInContext = (code: string): (() => any) =>
	new Function('require', `const React = require("react");${code}`).bind(null, requireInExample);

it('should render code', () => {
	const { getByRole } = render(
		<ReactExample code="<button>OK</button>" evalInContext={evalInContext} onError={noop} />
	);

	expect(getByRole('button')).toHaveTextContent('OK');
});

it('should wrap code in Fragment when it starts with <', () => {
	const { container } = render(
		<ReactExample code="<span /><span />" evalInContext={evalInContext} onError={noop} />
	);

	expect(container.querySelectorAll('span')).toHaveLength(2);
});

it('should handle errors', () => {
	const onError = vi.fn();

	const { container } = render(
		<ReactExample code="<invalid code" evalInContext={evalInContext} onError={onError} />
	);

	expect(onError).toHaveBeenCalledTimes(1);
	expect(onError).toHaveBeenCalledWith(expect.any(SyntaxError));
	expect(container).toBeEmptyDOMElement();
});

it('should set initial state with hooks', () => {
	const code = `
const [count, setCount] = React.useState(0);
<button>{count}</button>
	`;
	const { getByRole } = render(
		<ReactExample code={code} evalInContext={evalInContext} onError={noop} />
	);

	expect(getByRole('button').textContent).toEqual('0');
});

it('should update state with hooks', () => {
	const code = `
const [count, setCount] = React.useState(0);
<button onClick={() => setCount(count+1)}>{count}</button>
	`;
	const { getByRole } = render(
		<ReactExample code={code} evalInContext={evalInContext} onError={noop} />
	);
	fireEvent.click(getByRole('button'));

	expect(getByRole('button').textContent).toEqual('1');
});
