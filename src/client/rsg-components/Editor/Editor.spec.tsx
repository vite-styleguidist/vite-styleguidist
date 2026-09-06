import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { Editor, styles } from './Editor.js';

const code = '<button>MyAwesomeCode</button>';
const newCode = '<button>MyNewAwesomeCode</button>';
const props = {
	classes: { root: 'root' },
	onChange() {},
	code,
};

// CodeMirror registers the view on its DOM, which lets tests drive it through its own
// state API (the closest thing to typing that jsdom, with no layout or IME, can offer)
const getView = (container: HTMLElement) => {
	const view = EditorView.findFromDOM(container);
	if (!view) {
		throw new Error('No CodeMirror view found');
	}
	return view;
};
const getContent = (container: HTMLElement) => {
	const content = container.querySelector<HTMLElement>('.cm-content');
	if (!content) {
		throw new Error('No CodeMirror content element found');
	}
	return content;
};

const escape = { key: 'Escape', code: 'Escape', keyCode: 27 };
const tab = { key: 'Tab', code: 'Tab', keyCode: 9 };

describe('Editor', () => {
	it('should render a CodeMirror editor with the code highlighted in Prism’s vocabulary', () => {
		const { container, getByRole } = render(<Editor {...props} />);

		expect(container.querySelector('.cm-editor')).not.toBeNull();
		expect(getByRole('textbox')).toHaveTextContent(code);
		// Token classes are Prism’s so the theme.color.code* JSS rules apply (prismHighlightStyle.ts)
		expect(container.querySelector('.cm-content .token.tag')).toHaveTextContent('button');
		expect(container.querySelector('.cm-content .token.punctuation')).not.toBeNull();
	});

	it('should colour component tags like Prism’s class-name tokens', () => {
		const { container } = render(<Editor {...props} code="<Button>x</Button>" />);

		// <button> is a tag for Prism, <Button> a class-name (see prismHighlightStyle.ts)
		expect(container.querySelector('.cm-content .token.class-name')).toHaveTextContent('Button');
		expect(container.querySelector('.cm-content .token.tag')).toBeNull();
	});

	it('should restyle CodeMirror’s tooltip and panels from the theme', () => {
		const theme = {
			color: {
				base: 'base',
				baseBackground: 'bg',
				sidebarBackground: 'sidebar',
				border: 'border',
				link: 'link',
				focus: 'focus',
				codeBase: 'code',
				codeBackground: 'codeBg',
			},
			space: [0, 4, 8],
			borderRadius: 3,
			fontFamily: { monospace: 'mono' },
			fontSize: { small: 13 },
			fontWeight: { bold: 600 },
			lineHeight: { base: 1.55, heading: 1.2, code: 1.6 },
			transition: { fast: '150ms ease-in' },
			mq: { small: '@media (max-width: 600px)' },
		} as any;
		const root = styles(theme).root as Record<string, any>;

		// The base theme paints these in fixed light colours; every selector goes through
		// .cm-editor so it outranks the base theme’s two-class rules
		expect(root['& .cm-editor .cm-tooltip']).toMatchObject({
			isolate: false,
			background: 'bg',
			color: 'base',
		});
		expect(root['& .cm-editor .cm-tooltip-autocomplete > ul > li[aria-selected]']).toMatchObject({
			background: 'sidebar',
		});
		expect(root['& .cm-editor .cm-panels']).toMatchObject({ background: 'sidebar', color: 'base' });
		expect(root['& .cm-editor .cm-textfield']).toMatchObject({ background: 'bg' });
	});

	it('should label the editor and explain how to leave it', () => {
		const { getByRole } = render(<Editor {...props} />);

		const textbox = getByRole('textbox', { name: 'Code editor' });
		expect(textbox).toHaveAttribute('aria-multiline', 'true');
		expect(textbox).toHaveAttribute('aria-description', expect.stringMatching(/Escape.*Tab/));
	});

	it('should label the editor after its example when Playground passes the name and index', () => {
		const { getByRole } = render(<Editor {...props} exampleName="Button" exampleIndex={2} />);

		expect(getByRole('textbox', { name: 'Code editor for Button example 2' })).toBeInTheDocument();
	});

	it('should replace the document when the code prop changes from outside', () => {
		const onChange = vi.fn();
		const { rerender, getByRole } = render(<Editor {...props} onChange={onChange} />);

		rerender(<Editor {...props} onChange={onChange} code={newCode} />);

		expect(getByRole('textbox')).toHaveTextContent(newCode);
		// External replacements are not reported back to the parent
		expect(onChange).not.toHaveBeenCalled();
	});

	it('should keep the cursor where it was when the prop catches up with the document', () => {
		const { container, rerender } = render(<Editor {...props} />);
		const view = getView(container);

		view.dispatch({ changes: { from: 0, insert: '/**/' }, selection: { anchor: 2 } });
		expect(view.state.selection.main.head).toBe(2);

		// Playground echoes the edited code back after the debounce: no transaction, same cursor
		rerender(<Editor {...props} code={`/**/${code}`} />);

		expect(view.state.doc.toString()).toBe(`/**/${code}`);
		expect(view.state.selection.main.head).toBe(2);
	});

	it('should clamp the cursor when an external replacement is shorter than the document', () => {
		const { container, rerender } = render(<Editor {...props} />);
		const view = getView(container);
		view.dispatch({ selection: { anchor: code.length } });

		rerender(<Editor {...props} code="<b/>" />);

		expect(view.state.doc.toString()).toBe('<b/>');
		expect(view.state.selection.main.head).toBe(4);
	});

	it('should call onChange with the whole document on every change', () => {
		const onChange = vi.fn();
		const { container } = render(<Editor {...props} onChange={onChange} />);
		const view = getView(container);

		view.dispatch({ changes: { from: 0, insert: 'a' } });
		view.dispatch({ changes: { from: 1, insert: 'b' } });

		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenNthCalledWith(1, `a${code}`);
		expect(onChange).toHaveBeenNthCalledWith(2, `ab${code}`);
	});

	it('should call onChange when text is typed into the content element', async () => {
		const onChange = vi.fn();
		const { container } = render(<Editor {...props} onChange={onChange} />);
		const line = container.querySelector('.cm-line');
		if (!line) {
			throw new Error('No line rendered');
		}

		// Editing the contenteditable DOM directly is what browsers do on keyboard input;
		// CodeMirror picks it up through its MutationObserver and turns it into a transaction
		line.textContent = newCode;

		await waitFor(() => expect(onChange).toHaveBeenCalledWith(newCode));
	});

	it('should not lose newer edits when the parent echoes an older value', () => {
		const onChange = vi.fn();
		const { container, rerender } = render(<Editor {...props} onChange={onChange} />);
		const view = getView(container);

		view.dispatch({ changes: { from: 0, insert: 'a' } });
		view.dispatch({ changes: { from: 1, insert: 'b' } });

		// The debounce fired between the two keystrokes: the parent passes the first value back
		rerender(<Editor {...props} onChange={onChange} code={`a${code}`} />);
		expect(view.state.doc.toString()).toBe(`ab${code}`);

		// …and then catches up
		rerender(<Editor {...props} onChange={onChange} code={`ab${code}`} />);
		expect(view.state.doc.toString()).toBe(`ab${code}`);

		// A value the editor never produced is an external change and does replace the text
		rerender(<Editor {...props} onChange={onChange} code={newCode} />);
		expect(view.state.doc.toString()).toBe(newCode);
	});

	it('should indent with Tab', () => {
		const onChange = vi.fn();
		const { container } = render(<Editor {...props} onChange={onChange} />);
		const content = getContent(container);

		const notHandled = fireEvent.keyDown(content, tab);

		expect(notHandled).toBe(false);
		expect(onChange).toHaveBeenCalledWith(`  ${code}`);
	});

	it('should let Tab move the focus after Escape', () => {
		const onChange = vi.fn();
		const { container } = render(<Editor {...props} onChange={onChange} />);
		const content = getContent(container);

		fireEvent.keyDown(content, escape);
		const notHandled = fireEvent.keyDown(content, tab);

		// The browser’s default (moving focus) goes through and nothing is indented
		expect(notHandled).toBe(true);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('should destroy the view on unmount', () => {
		const { container, unmount } = render(<Editor {...props} />);
		expect(container.querySelector('.cm-editor')).not.toBeNull();

		unmount();

		expect(container.querySelector('.cm-editor')).toBeNull();
	});
});
