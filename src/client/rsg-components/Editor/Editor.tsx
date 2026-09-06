import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Annotation, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import {
	autocompletion,
	closeBrackets,
	closeBracketsKeymap,
	completionKeymap,
} from '@codemirror/autocomplete';
import { searchKeymap } from '@codemirror/search';
import { javascript } from '@codemirror/lang-javascript';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import prismTheme from '../../styles/prismTheme.js';
import prismHighlightStyle from './prismHighlightStyle.js';
import editorFrame from './editorFrameStyles.js';
import type * as Rsg from '../../../typings/index.js';

/**
 * All of the editor’s look comes from JSS rather than from `EditorView.theme`: JSS already
 * merges the user’s `theme` over the defaults, applies the `styles` option (`styles.Editor`)
 * and swaps stylesheets on hot reload, and a CodeMirror theme extension would have to
 * duplicate all three. CodeMirror’s own base theme only supplies layout defaults and a light
 * palette for its chrome; the rules below override its colours and metrics. Every selector
 * goes through `.cm-editor`, so each rule has at least one class more than the base theme’s
 * (`.ͼ1 .cm-line`, `.ͼ2 .cm-tooltip`) and wins by specificity, not by the order of the
 * stylesheets in <head>. Every nested rule needs `isolate: false`, otherwise
 * jss-plugin-isolate resets inherited properties on CodeMirror’s elements.
 */
export const styles = (theme: Rsg.Theme): Styles => {
	const { color, space, borderRadius } = theme;
	return {
		root: {
			...editorFrame(theme),
			'& .cm-editor': {
				isolate: false,
				border: [[1, color.border, 'solid']],
				borderRadius,
				transition: 'border-color ease-in-out .1s, box-shadow ease-in-out .1s',
			},
			// Same focus ring as the rest of the UI (TabButton, links): the border takes the link
			// colour and a translucent halo is drawn around it. CodeMirror’s default is a dotted
			// outline, replaced here rather than removed so the focus stays visible.
			'& .cm-editor.cm-focused': {
				isolate: false,
				outline: 0,
				borderColor: color.link,
				boxShadow: [[0, 0, 0, 2, color.focus]],
			},
			'& .cm-editor .cm-scroller': {
				isolate: false,
				// The base theme hardcodes `monospace` and a 1.4 line height; inherit ours instead
				fontFamily: 'inherit',
				lineHeight: 'inherit',
			},
			'& .cm-editor .cm-content': {
				isolate: false,
				padding: space[2],
				color: color.codeBase,
				// The base theme hardcodes a black caret, invisible on a dark `codeBackground`
				caretColor: color.codeBase,
			},
			'& .cm-editor .cm-line': {
				isolate: false,
				padding: 0,
			},
			// The autocompletion tooltip and the search panel: the base theme paints them in fixed
			// light colours, which are unreadable on the dark scheme. Theme tokens are CSS
			// variables, so one rule set covers both schemes.
			'& .cm-editor .cm-tooltip': {
				isolate: false,
				border: [[1, color.border, 'solid']],
				borderRadius,
				background: color.baseBackground,
				color: color.base,
			},
			'& .cm-editor .cm-tooltip-autocomplete > ul > li[aria-selected]': {
				isolate: false,
				background: color.sidebarBackground,
				color: color.base,
			},
			'& .cm-editor .cm-completionMatchedText': {
				isolate: false,
				color: color.link,
				textDecoration: 'none',
				fontWeight: 'bold',
			},
			'& .cm-editor .cm-panels': {
				isolate: false,
				background: color.sidebarBackground,
				color: color.base,
				borderColor: color.border,
			},
			'& .cm-editor .cm-textfield': {
				isolate: false,
				background: color.baseBackground,
				color: color.base,
				border: [[1, color.border, 'solid']],
				borderRadius,
			},
			'& .cm-editor .cm-button': {
				isolate: false,
				background: color.baseBackground,
				backgroundImage: 'none',
				color: color.base,
				border: [[1, color.border, 'solid']],
				borderRadius,
			},
			// Token colours: CodeMirror emits Prism’s class names (see prismHighlightStyle.ts),
			// so this is the very same rule set that styles static code blocks
			...prismTheme({ color }),
		},
	};
};

// Marks transactions that replace the document because the `code` prop changed, so the
// update listener doesn’t report them back through `onChange`
const externalChange = Annotation.define<boolean>();

/**
 * How many of the editor’s own recent values to remember while waiting for Playground to
 * echo one of them back as the `code` prop (see the `code` effect below). The debounce is
 * 500 ms, so the echo is at most a keystroke or two behind; twenty is a generous bound that
 * keeps memory flat when a custom parent never echoes at all.
 */
const MAX_PENDING_VALUES = 20;

export interface EditorProps extends Rsg.EditorProps, JssInjectedProps {}

/**
 * The example code editor: a CodeMirror 6 view with the JavaScript/JSX/TypeScript language,
 * history, bracket matching and closing, basic autocompletion and search, no line numbers.
 *
 * Keyboard: Tab indents (`indentWithTab`). To move focus out of the editor with the keyboard,
 * press Escape and then Tab: Escape arms CodeMirror’s “tab focus mode” for two seconds, during
 * which Tab falls through to the browser and moves focus as usual.
 *
 * The component is controlled by `code` but CodeMirror owns the document: every change is
 * reported through `onChange` at once (Playground debounces it), and a `code` prop that differs
 * from the document (hot reload of the Markdown, a reset by a custom parent) replaces the text
 * while keeping the cursor offset.
 */
/**
 * One label per example, so a page with many code tabs open does not announce twenty
 * identical “Code editor” textboxes. The index is the one the isolated URL uses.
 */
export function getEditorLabel(exampleName?: string, exampleIndex?: number): string {
	if (!exampleName) {
		return 'Code editor';
	}
	return typeof exampleIndex === 'number'
		? `Code editor for ${exampleName} example ${exampleIndex}`
		: `Code editor for ${exampleName}`;
}

export function Editor({ code, onChange, classes, exampleName, exampleIndex }: EditorProps) {
	const hostRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	// Latest `onChange` without re-creating the view when the parent passes a new function
	const onChangeRef = useRef(onChange);
	// `code` at mount time, read by the mount effect so it doesn’t have to depend on `code`
	const initialCodeRef = useRef(code);
	// Values reported through `onChange` that the parent hasn’t echoed back yet
	const pendingRef = useRef<string[]>([]);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}
		const view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: initialCodeRef.current,
				extensions: [
					history(),
					indentOnInput(),
					bracketMatching(),
					closeBrackets(),
					autocompletion(),
					// Examples live in a narrow column: wrap long lines like static code blocks do
					EditorView.lineWrapping,
					javascript({ jsx: true, typescript: true }),
					syntaxHighlighting(prismHighlightStyle),
					// Escape arms CodeMirror’s tab-focus mode (Tab then moves focus for two seconds)
					// before any other binding sees the key: the default, completion and search
					// keymaps also handle Escape (clear selection, close popup, close panel) and would
					// otherwise swallow it, so “Escape, then Tab” only worked with nothing selected
					// and no panel open. `false` lets those bindings run as well.
					Prec.highest(
						keymap.of([
							{
								key: 'Escape',
								run: (editorView) => {
									editorView.setTabFocusMode(2000);
									return false;
								},
							},
						])
					),
					keymap.of([
						...closeBracketsKeymap,
						...defaultKeymap,
						...historyKeymap,
						...searchKeymap,
						...completionKeymap,
						indentWithTab,
					]),
					EditorView.contentAttributes.of({
						'aria-label': getEditorLabel(exampleName, exampleIndex),
						'aria-description': 'Press Escape, then Tab, to leave the editor',
					}),
					EditorView.updateListener.of((update) => {
						if (
							!update.docChanged ||
							update.transactions.some((tr) => tr.annotation(externalChange))
						) {
							return;
						}
						const value = update.state.doc.toString();
						const pending = pendingRef.current;
						pending.push(value);
						if (pending.length > MAX_PENDING_VALUES) {
							pending.splice(0, pending.length - MAX_PENDING_VALUES);
						}
						onChangeRef.current(value);
					}),
				],
			}),
		});
		viewRef.current = view;
		return () => {
			view.destroy();
			viewRef.current = null;
		};
		// Mount-only on purpose: the view is created once per example, and an example’s name and
		// index never change while it is mounted, so the label is read at mount time.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const view = viewRef.current;
		if (!view) {
			return;
		}
		const pending = pendingRef.current;
		if (code === view.state.doc.toString()) {
			// The parent caught up with the editor (or nothing changed): nothing to do, and the
			// cursor is left alone
			pending.length = 0;
			return;
		}
		const echoed = pending.indexOf(code);
		if (echoed > -1) {
			// A stale echo: the parent is passing back a value the editor reported before the
			// user typed some more (the debounce fired just before those keystrokes). Replacing
			// the document with it would lose them; the parent will catch up on the next echo.
			pending.splice(0, echoed + 1);
			return;
		}
		// A genuinely external value (hot reload, reset): replace the whole document, keeping
		// the selection at the same offsets as far as the new text allows
		pending.length = 0;
		const { anchor, head } = view.state.selection.main;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: code },
			selection: {
				anchor: Math.min(anchor, code.length),
				head: Math.min(head, code.length),
			},
			annotations: externalChange.of(true),
		});
	}, [code]);

	return <div className={classes.root} ref={hostRef} />;
}

Editor.propTypes = {
	code: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
};

export default Styled<EditorProps>(styles)(Editor);
