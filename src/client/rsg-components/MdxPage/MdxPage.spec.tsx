/* eslint-disable no-console */
import React from 'react';
import { render } from '@testing-library/react';
import MdxPage from './index.js';
import Context from '../Context/index.js';
import slots from '../slots/index.js';
import { DisplayModes } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

const evalInContext = (a: string): (() => any) =>
	new Function('require', 'const React = require("react");' + a).bind(null, require);

/**
 * Stand-in for what `@mdx-js/mdx` compiles an `.mdx` file to: a component that takes a
 * `components` map, pulls both the HTML element renderers and the capitalised names out of it,
 * and throws the way MDX's own `_missingMdxReference` does when a name is not in the map.
 */
const Content: Rsg.MdxExample['Content'] = ({ components = {} }) => {
	const { h1: H1, p: P, RsgPlayground, RsgStatic } = components as Record<string, any>;
	return (
		<>
			<H1 id="hello">Hello</H1>
			<P>Some prose.</P>
			<RsgPlayground index={0} />
			<RsgStatic lang="html" html="<span>markup</span>" />
			<RsgPlayground index={1} />
		</>
	);
};

const chunk: Rsg.MdxExample = {
	type: 'mdx',
	Content,
	examples: [
		{ type: 'code', content: '<button>Code: One</button>', lang: 'jsx', evalInContext },
		{
			type: 'code',
			content: '<button>Code: Two</button>',
			lang: 'jsx',
			settings: { noeditor: true },
			evalInContext,
		},
	],
};

const context = {
	config: {
		previewDelay: 0,
	},
	codeRevision: 1,
	displayMode: DisplayModes.example,
	slots: slots(),
};

const Provider = ({ config, ...rest }: any) => (
	<Context.Provider value={{ ...context, config: { ...context.config, ...config } }} {...rest} />
);

test('should render prose through the style guide’s own renderers', () => {
	const { getByRole, getByText } = render(
		<Provider>
			<MdxPage chunk={chunk} name="Button" exampleMode="collapse" />
		</Provider>
	);

	const heading = getByRole('heading', { level: 1 });
	expect(heading).toHaveTextContent('Hello');
	// Not a bare <h1>: it went through MarkdownHeading, which is a Styled component
	expect(heading.className).toMatch(/rsg--/);
	expect(getByText('Some prose.').className).toMatch(/rsg--para/);
});

test('should render each playground of the page by index', () => {
	const { getByText } = render(
		<Provider>
			<MdxPage chunk={chunk} name="Button" exampleMode="collapse" />
		</Provider>
	);

	expect(getByText('Code: One')).toBeInTheDocument();
	expect(getByText('Code: Two')).toBeInTheDocument();
});

test('should inject a static fence as pre-highlighted markup', () => {
	const { container } = render(
		<Provider>
			<MdxPage chunk={chunk} name="Button" exampleMode="collapse" />
		</Provider>
	);

	const pre = container.querySelector('pre.lang-html') as HTMLElement;
	// The markup is injected, not escaped, and still goes through PreRenderer’s own class
	expect(pre.className).toMatch(/^lang-html rsg--pre-\d+$/);
	expect(pre.innerHTML).toBe('<span>markup</span>');
});

test('should render inside a page wrapper carrying its own JSS rule', () => {
	const { getByTestId } = render(
		<Provider>
			<MdxPage chunk={chunk} name="Button" exampleMode="collapse" />
		</Provider>
	);

	expect(getByTestId('Button-mdx-page').className).toMatch(/^rsg--root-\d+$/);
});

test('should catch a missing MDX reference and report it inside the page', () => {
	const consoleError = console.error;
	console.error = vi.fn();
	try {
		const Broken: Rsg.MdxExample['Content'] = ({ components = {} }) => {
			const { Callout } = components as Record<string, any>;
			if (!Callout) {
				// Exactly what MDX’s generated `_missingMdxReference` throws
				throw new Error(
					'Expected component `Callout` to be defined: you likely forgot to import, pass, or provide it.'
				);
			}
			return <Callout />;
		};

		const { getByRole, getByText, queryByRole, queryByText } = render(
			<Provider>
				<MdxPage
					chunk={{ type: 'mdx', Content: Broken, examples: [] }}
					name="Button"
					file="src/components/Button/Readme.mdx"
					exampleMode="collapse"
				/>
			</Provider>
		);

		// The failure is reported where the page is; nothing else on the screen is replaced
		const status = getByRole('status');
		expect(status).toHaveTextContent('Button: Expected component `Callout` to be defined');
		expect(queryByRole('heading')).toBeNull();

		// The whole page failed, not one example, so the panel says so and names the .mdx file
		expect(getByText('This page failed to render'));
		expect(getByText('Fix the page in src/components/Button/Readme.mdx.'));
		expect(queryByText('This example failed to render')).toBeNull();
		expect(queryByText('Fix the example in its Markdown file.')).toBeNull();
	} finally {
		console.error = consoleError;
	}
});

test('should report a playground index the page has no example for', () => {
	const consoleError = console.error;
	console.error = vi.fn();
	try {
		const Broken: Rsg.MdxExample['Content'] = ({ components = {} }) => {
			const { RsgPlayground } = components as Record<string, any>;
			return <RsgPlayground index={7} />;
		};

		const { getByRole } = render(
			<Provider>
				<MdxPage chunk={{ ...chunk, Content: Broken }} name="Button" exampleMode="collapse" />
			</Provider>
		);

		expect(getByRole('status')).toHaveTextContent('this MDX page has no example 7');
	} finally {
		console.error = consoleError;
	}
});

test('should let the mdxComponents option add and override components', () => {
	const Callout: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
		<aside data-testid="callout">{children}</aside>
	);
	const Para: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
		<p data-testid="custom-para">{children}</p>
	);
	const WithCallout: Rsg.MdxExample['Content'] = ({ components = {} }) => {
		const { p: P, Callout: MdxCallout } = components as Record<string, any>;
		return (
			<>
				<P>Prose</P>
				<MdxCallout>Watch out</MdxCallout>
			</>
		);
	};

	const { getByTestId } = render(
		<Provider config={{ mdxComponents: { Callout, p: Para } }}>
			<MdxPage
				chunk={{ type: 'mdx', Content: WithCallout, examples: [] }}
				name="Button"
				exampleMode="collapse"
			/>
		</Provider>
	);

	expect(getByTestId('callout')).toHaveTextContent('Watch out');
	expect(getByTestId('custom-para')).toHaveTextContent('Prose');
});
