import React from 'react';
import { render } from '@testing-library/react';
import Examples from './index.js';
import Context from '../Context/index.js';
import slots from '../slots/index.js';
import { DisplayModes } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

const evalInContext = (a: string): (() => any) =>
	new Function('require', 'const React = require("react");' + a).bind(null, require);

const examples: Rsg.Example[] = [
	{
		type: 'code',
		content: '<button>Code: OK</button>',
		evalInContext,
	},
	{
		type: 'markdown',
		content: 'Markdown: Hello *world*!',
	},
];

const context = {
	config: {
		previewDelay: 0,
	},
	codeRevision: 1,
	displayMode: DisplayModes.example,
	slots: slots(),
};

const Provider = (props: any) => <Context.Provider value={context} {...props} />;

test('should render examples', () => {
	const { getByText } = render(
		<Provider>
			<Examples examples={examples} name="button" exampleMode="collapse" />
		</Provider>
	);
	expect(getByText(/code: ok/i)).toBeInTheDocument();
	expect(getByText(/markdown: hello/i)).toBeInTheDocument();
});

test('should not render an example with unknown type', () => {
	const faultyExample = [
		{
			type: 'unknown',
			content: 'FooBar',
		} as any,
	];
	const { getByTestId } = render(
		<Provider>
			<Examples examples={faultyExample} name="button" exampleMode="collapse" />
		</Provider>
	);
	expect(getByTestId('button-examples')).toBeEmptyDOMElement();
});

test('should render an mdx page as a single chunk', () => {
	const Content = ({ components = {} }: any) => {
		const { p: P, RsgPlayground } = components as Record<string, any>;
		return (
			<>
				<P>Mdx: Hello!</P>
				<RsgPlayground index={0} />
			</>
		);
	};
	const mdxExamples: Rsg.Example[] = [
		{
			type: 'mdx',
			Content,
			examples: [{ type: 'code', content: '<button>Mdx code: OK</button>', evalInContext }],
		},
	];

	const { getByText, getByTestId } = render(
		<Provider>
			<Examples examples={mdxExamples} name="button" exampleMode="collapse" />
		</Provider>
	);

	expect(getByTestId('button-mdx-page')).toBeInTheDocument();
	expect(getByText(/mdx: hello/i)).toBeInTheDocument();
	expect(getByText(/mdx code: ok/i)).toBeInTheDocument();
});
