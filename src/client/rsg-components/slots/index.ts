// The code editor is registered through EditorLoader, which imports `rsg-components/Editor`
// lazily so CodeMirror ships in its own chunk, fetched on the first “View Code” click
import EditorLoader from 'rsg-components/Editor/EditorLoader';
import Usage from 'rsg-components/Usage';
import IsolateButton from 'rsg-components/slots/IsolateButton';
import CodeTabButton from 'rsg-components/slots/CodeTabButton';
import UsageTabButton from 'rsg-components/slots/UsageTabButton';
import type * as Rsg from '../../../typings/index.js';

export const EXAMPLE_TAB_CODE_EDITOR = 'rsg-code-editor';
export const DOCS_TAB_USAGE = 'rsg-usage';

const toolbar = [IsolateButton];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (config?: Rsg.ProcessedStyleguidistConfig) => {
	return {
		sectionToolbar: toolbar,
		componentToolbar: toolbar,
		exampleToolbar: toolbar,
		exampleTabButtons: [
			{
				id: EXAMPLE_TAB_CODE_EDITOR,
				render: CodeTabButton,
			},
		],
		exampleTabs: [
			{
				id: EXAMPLE_TAB_CODE_EDITOR,
				render: EditorLoader,
			},
		],
		docsTabButtons: [
			{
				id: DOCS_TAB_USAGE,
				render: UsageTabButton,
			},
		],
		docsTabs: [
			{
				id: DOCS_TAB_USAGE,
				render: Usage,
			},
		],
	};
};
