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
	// A lone mdx page numbers its playgrounds from zero, as it always has
	expect(getByTestId('button-example-0')).toBeInTheDocument();
});

// A component documented by a `.md` examples file *and* an `@example ./x.mdx` doclet (or the
// reverse) has both in one list, and the isolated-example numbers have to run continuously
// across it: a Markdown chunk takes one, an mdx page takes one per playground. The numbers
// below are the ones filterExamplesByIndex() resolves and docs.json publishes.
test('should number the examples of a mixed markdown and mdx component continuously', () => {
	const Content = ({ components = {} }: any) => {
		const { RsgPlayground } = components as Record<string, any>;
		return (
			<>
				<RsgPlayground index={0} />
				<RsgPlayground index={1} />
			</>
		);
	};
	const mixed: Rsg.Example[] = [
		{ type: 'markdown', content: 'Prose' },
		{ type: 'code', content: '<button>Md code</button>', evalInContext },
		{
			type: 'mdx',
			Content,
			examples: [
				{ type: 'code', content: '<button>Mdx one</button>', evalInContext },
				{ type: 'code', content: '<button>Mdx two</button>', evalInContext },
			],
		},
	];

	const { getByTestId, queryByTestId } = render(
		<Provider>
			<Examples examples={mixed} name="button" exampleMode="collapse" />
		</Provider>
	);

	// 0 is the prose chunk, so the Markdown playground is 1 and the mdx page starts at 2
	expect(queryByTestId('button-example-0')).not.toBeInTheDocument();
	expect(getByTestId('button-example-1')).toHaveTextContent('Md code');
	expect(getByTestId('button-example-2')).toHaveTextContent('Mdx one');
	expect(getByTestId('button-example-3')).toHaveTextContent('Mdx two');
});

test('should number the markdown chunks after an mdx page that comes first', () => {
	const Content = ({ components = {} }: any) => {
		const { RsgPlayground } = components as Record<string, any>;
		return <RsgPlayground index={0} />;
	};
	const mixed: Rsg.Example[] = [
		{
			type: 'mdx',
			Content,
			examples: [{ type: 'code', content: '<button>Mdx one</button>', evalInContext }],
		},
		{ type: 'markdown', content: 'Prose' },
		{ type: 'code', content: '<button>Md code</button>', evalInContext },
	];

	const { getByTestId } = render(
		<Provider>
			<Examples examples={mixed} name="button" exampleMode="collapse" />
		</Provider>
	);

	// The mdx page owns 0 (one playground, no number for its prose), so the Markdown prose
	// chunk is 1 and its playground is 2
	expect(getByTestId('button-example-0')).toHaveTextContent('Mdx one');
	expect(getByTestId('button-example-2')).toHaveTextContent('Md code');
});
