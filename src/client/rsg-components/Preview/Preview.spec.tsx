import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import Preview from './index.js';
import Context, { StyleGuideContextContents } from '../Context/index.js';
import { DEFAULT_COMPILER_CONFIG } from '../../utils/compileCode.js';

/* eslint-disable no-console */

// Examples are evaluated as plain functions with a `require` that only knows React,
// the way the real evalInContext (src/loaders/utils/client/evalInContext.ts) works with
// the modules bundled for the style guide
const requireInExample = (name: string) => {
	if (name === 'react') {
		return React;
	}
	throw new Error(`Cannot find module '${name}'`);
};
const evalInContext = (code: string) =>
	new Function('require', 'state', 'setState', `const React = require("react");${code}`).bind(
		null,
		requireInExample
	);
const code = '<button>Code: OK</button>';
const newCode = '<button>Code: Cancel</button>';

const context = {
	config: {
		compilerConfig: DEFAULT_COMPILER_CONFIG,
	},
	codeRevision: 0,
} as StyleGuideContextContents;

const Provider = (props: Record<string, any>) => <Context.Provider value={context} {...props} />;

const console$error = console.error;
const console$clear = console.clear;

afterEach(() => {
	console.error = console$error;
	console.clear = console$clear;
});

it('should unmount Wrapper component', async () => {
	const { unmount, getByTestId } = render(
		<Provider>
			<Preview code={code} evalInContext={evalInContext} />
		</Provider>
	);

	const node = getByTestId('mountNode');

	expect(node.innerHTML).toMatch('<button');
	unmount();
	// The example root is unmounted in a setTimeout
	await waitFor(() => expect(node.innerHTML).toBe(''));
});

it('should not fail when Wrapper wasn’t mounted', async () => {
	const consoleError = vi.fn();
	console.error = consoleError;

	const { unmount, getByTestId } = render(
		<Provider>
			<Preview code="pizza" evalInContext={evalInContext} />
		</Provider>
	);

	const node = getByTestId('mountNode');

	expect(
		consoleError.mock.calls.find((call) =>
			call[0].toString().includes('ReferenceError: pizza is not defined')
		)
	).toBeTruthy();

	await waitFor(() => expect(node.innerHTML).toBe(''));
	unmount();
	expect(node.innerHTML).toBe('');
});

it('should wrap code in Fragment when it starts with <', () => {
	console.error = vi.fn();

	const { queryAllByRole } = render(
		<Provider>
			<Preview code="<button /><button />" evalInContext={evalInContext} />
		</Provider>
	);

	// If two buttons weren't wrapped in a Fragment, we'd see an error in console
	expect(console.error).not.toHaveBeenCalled();
	expect(queryAllByRole('button')).toHaveLength(2);
});

it('should update', () => {
	const { rerender, getByText } = render(
		<Provider>
			<Preview code={code} evalInContext={evalInContext} />
		</Provider>
	);

	expect(getByText('Code: OK')).toBeInTheDocument();

	rerender(
		<Provider>
			<Preview code={newCode} evalInContext={evalInContext} />
		</Provider>
	);

	expect(getByText('Code: Cancel')).toBeInTheDocument();
});

it('should handle no code', () => {
	console.error = vi.fn();
	render(
		<Provider>
			<Preview code="" evalInContext={evalInContext} />
		</Provider>
	);

	expect(console.error).not.toHaveBeenCalled();
});

it('should handle errors', async () => {
	const consoleError = vi.fn();

	console.error = consoleError;
	const { findByText } = render(
		<Provider>
			<Preview code={'<invalid code'} evalInContext={evalInContext} />
		</Provider>
	);

	// Sucrase reports the location of the error after the message, e.g. `(1:14)`
	expect(
		consoleError.mock.calls.find((call) => /^SyntaxError: .+ \(\d+:\d+\)$/.test(String(call[0])))
	).toBeTruthy();
	// The compiler error is shown to the user in place of the example; the state update
	// is deferred to a macrotask (see Preview.handleError), hence the wait
	expect(await findByText(/^SyntaxError: /)).toBeInTheDocument();
});

it('should not clear console on initial mount', () => {
	console.clear = vi.fn();
	render(
		<Provider>
			<Preview code={code} evalInContext={evalInContext} />
		</Provider>
	);
	expect(console.clear).toHaveBeenCalledTimes(0);
});

it('should clear console on second mount', () => {
	console.clear = vi.fn();
	render(
		<Provider value={{ ...context, codeRevision: 1 }}>
			<Preview code={code} evalInContext={evalInContext} />
		</Provider>
	);
	expect(console.clear).toHaveBeenCalledTimes(1);
});

it('should not show the previous code’s error once new code has rendered', () => {
	// Fake timers hold the macrotask handleError() defers the error to (and the one
	// unmountPreview() defers the unmount to), so the new code can land in between the way it
	// does with previewDelay: 0 and two edits inside one frame. Only the timeout functions are
	// faked: test/setup.ts runs requestAnimationFrame synchronously, and faking it too would
	// defer the example’s render as well.
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	console.error = vi.fn();

	try {
		const { rerender, getByTestId, queryByText } = render(
			<Provider>
				<Preview code={'<invalid code'} evalInContext={evalInContext} />
			</Provider>
		);

		// Reported to the console synchronously, not yet on screen
		expect(console.error).toHaveBeenCalled();
		expect(queryByText(/^SyntaxError: /)).toBeNull();

		rerender(
			<Provider>
				<Preview code={code} evalInContext={evalInContext} />
			</Provider>
		);

		act(() => {
			vi.runAllTimers();
		});

		// Both pending timers belonged to the previous code: the error must not be painted over
		// the healthy preview, and the deferred unmount must not blank it
		expect(queryByText(/^SyntaxError: /)).toBeNull();
		expect(getByTestId('mountNode').innerHTML).toMatch('<button');
	} finally {
		vi.useRealTimers();
	}
});
