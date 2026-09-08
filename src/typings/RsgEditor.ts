/**
 * Props received by the code editor rendered in the `exampleTabs` slot, i.e. by the
 * built-in CodeMirror editor and by any replacement configured through
 * `styleguideComponents.Editor` (see docs/Configuration.md#styleguidecomponents).
 *
 * `code`, `onChange` and `evalInContext` come from Playground; `name`, `active` and
 * `onClick` are injected by Slot for every fill. This is a public contract since 1.0:
 * keys are only ever added, never removed or renamed.
 */
export interface EditorProps {
	/** Current source of the example (controlled: Playground owns it and passes it back after the debounce) */
	code: string;
	/**
	 * Called with the whole source after every change. Playground debounces the calls by the
	 * `previewDelay` option (500 ms by default) before re-rendering the preview.
	 */
	onChange: (code: string) => void;
	/**
	 * Compiles and runs example code the way the preview does (see Preview and
	 * src/loaders/utils/client/evalInContext.ts). Unused by the built-in editor; available to
	 * custom editors that want to evaluate code themselves.
	 */
	evalInContext?: (code: string) => () => any;
	/** Slot fill id, `rsg-code-editor` for the built-in tab (not the example name) */
	name?: string;
	/** Whether this tab is the active one; always `true` when rendered because the slot only renders the active fill */
	active?: boolean;
	/** Tab click handler injected by Slot, the fill id is already bound as the first argument */
	onClick?: (...args: any[]) => void;
	/** Name of the component or section the example belongs to, for an accessible label */
	exampleName?: string;
	/** Index of the example in its Markdown file, the same number the isolated URL (#!/Name/index) uses */
	exampleIndex?: number;
	/**
	 * Language of the example’s Markdown fence as written (`jsx`, `tsx`, `js`, …); `undefined`
	 * for a bare ``` fence. The built-in editor shows it as the badge in the corner of the code
	 * area (“JSX”, “TSX”). It is a label only: every playground example is compiled with the JSX
	 * and TypeScript transforms regardless of the fence language.
	 */
	lang?: string | null;
}
