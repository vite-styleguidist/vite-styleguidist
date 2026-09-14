import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import Playground from './Playground.js';
import slots from '../slots/index.js';
import Context from '../Context/index.js';

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
	new Function('require', `const React = require("react");${code}`).bind(null, requireInExample);
const code = '<button>Code: OK</button>';
const newCode = '<button>Code: Not OK</button>';
const defaultProps = {
	index: 0,
	name: 'name',
	settings: {},
	exampleMode: 'collapse',
	evalInContext,
	code,
};
const context = {
	config: {
		previewDelay: 0,
	},
	codeRevision: 0,
	slots: slots(),
};

const Provider = (props: any) => <Context.Provider value={context} {...props} />;

// The editor is loaded on demand (Editor/EditorLoader.tsx): while its chunk loads, the code
// shows in a <pre> placeholder, then CodeMirror’s contenteditable takes over. “No editor”
// therefore means neither the placeholder nor the textbox is in the document.
const expectNoEditor = (container: HTMLElement) => {
	expect(container.querySelector('pre')).toBeNull();
	expect(container.querySelector('[role="textbox"]')).toBeNull();
};

it('should update code via props', () => {
	const { rerender, getByText } = render(
		<Provider>
			<Playground {...defaultProps} />
		</Provider>
	);

	expect(getByText('Code: OK')).toBeInTheDocument();

	rerender(
		<Provider>
			<Playground {...defaultProps} code={newCode} />
		</Provider>
	);

	expect(getByText('Code: Not OK')).toBeInTheDocument();
});

it('should open a code editor', async () => {
	const { container, findByRole, getByText } = render(
		<Provider>
			<Playground {...defaultProps} />
		</Provider>
	);

	expectNoEditor(container);

	fireEvent.click(getByText(/view code/i));

	expect(await findByRole('textbox')).toHaveTextContent(code);
});

it('should update the preview after the code is edited', async () => {
	const { container, findByRole, findByText, getByText } = render(
		<Provider>
			<Playground {...defaultProps} />
		</Provider>
	);
	fireEvent.click(getByText(/view code/i));
	await findByRole('textbox');

	// Drive CodeMirror through its own state API, the closest jsdom gets to typing
	const view = EditorView.findFromDOM(container);
	if (!view) {
		throw new Error('No CodeMirror view found');
	}
	view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: newCode } });

	// Playground debounces onChange by `previewDelay` (0 here) before re-rendering the preview
	expect(await findByText('Code: Not OK')).toBeInTheDocument();
});

it('should not render a code editor if noeditor option passed in example settings', () => {
	const { container, queryByText } = render(
		<Provider>
			<Playground {...defaultProps} settings={{ noeditor: true }} />
		</Provider>
	);

	expect(queryByText(/view code/i)).not.toBeInTheDocument();
	expectNoEditor(container);
});

it('should open a code editor by default if showcode=true option passed in example settings', async () => {
	const { findByRole } = render(
		<Provider>
			<Playground {...defaultProps} settings={{ showcode: true }} />
		</Provider>
	);

	expect(await findByRole('textbox')).toBeInTheDocument();
});

it('should open a code editor by default if exampleMode="expand" option specified in style guide config', async () => {
	const { findByRole } = render(
		<Provider
			value={{
				...context,
				config: {
					...context.config,
				},
			}}
		>
			<Playground {...defaultProps} exampleMode="expand" />
		</Provider>
	);

	expect(await findByRole('textbox')).toBeInTheDocument();
});

it('showcode option in example settings should overwrite style guide config option', () => {
	const { container } = render(
		<Provider
			value={{
				...context,
				config: {
					...context.config,
				},
			}}
		>
			<Playground {...defaultProps} exampleMode="expand" settings={{ showcode: false }} />
		</Provider>
	);

	expectNoEditor(container);
});

it('should not include padded class if padded option is not passed in example settings', () => {
	const { getByTestId } = render(
		<Provider>
			<Playground {...defaultProps} settings={{ padded: false }} />
		</Provider>
	);

	expect(getByTestId('preview-wrapper')).not.toHaveAttribute(
		'class',
		expect.stringContaining('rsg--padded-')
	);
});

it('should include padded class if padded option is passed in example settings', () => {
	const { getByTestId } = render(
		<Provider>
			<Playground {...defaultProps} settings={{ padded: true }} />
		</Provider>
	);

	expect(getByTestId('preview-wrapper')).toHaveAttribute(
		'class',
		expect.stringContaining('rsg--padded-')
	);
});
