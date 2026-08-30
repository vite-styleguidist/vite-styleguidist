import React from 'react';
import { render } from '@testing-library/react';
import Sections from './Sections.js';
import StyledSectionsRenderer, { SectionsRenderer } from './SectionsRenderer.js';
import Context, { StyleGuideContextContents } from '../Context/index.js';
import slots from '../slots/index.js';
import { DisplayModes } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

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

const sections: Rsg.Section[] = [
	{
		name: 'Foo',
		slug: 'foo',
		exampleMode: 'collapse',
		usageMode: 'collapse',
		content: [
			{
				type: 'code',
				content: '<button>OK</button>',
				evalInContext,
			},
		],
		components: [],
	},
	{
		name: 'Bar',
		slug: 'bar',
		content: [
			{
				type: 'markdown',
				content: 'Hello *world*!',
			},
		],
		components: [],
	},
	{
		name: 'Baz',
		slug: 'baz',
		sections: [
			{
				name: 'One',
				slug: 'one',
				content: [],
			},
			{
				name: 'Two',
				slug: 'two',
				content: [],
			},
		],
	},
	{
		name: 'External',
		slug: 'external',
		href: 'http://example.com/',
		externalLink: true,
	},
];

const context = {
	config: {
		pagePerSection: false,
	},
	displayMode: DisplayModes.all,
	slots: slots(),
} as unknown as StyleGuideContextContents;

const Provider = (props: any) => <Context.Provider value={context} {...props} />;

it('should render a section for every section except external links', () => {
	const { getByTestId, queryByTestId, getByRole, getByText } = render(
		<Provider>
			<Sections sections={sections} depth={3} />
		</Provider>
	);

	// Sections with examples and Markdown content
	expect(getByTestId('section-foo')).toContainElement(getByRole('button', { name: 'OK' }));
	expect(getByTestId('section-bar')).toHaveTextContent('Hello world!');

	// Nested sections are rendered inside their parent
	expect(getByTestId('section-baz')).toContainElement(getByTestId('section-one'));
	expect(getByTestId('section-baz')).toContainElement(getByTestId('section-two'));
	expect(getByText('One')).toBeInTheDocument();
	expect(getByText('Two')).toBeInTheDocument();

	// External links only live in the table of contents
	expect(queryByTestId('section-external')).not.toBeInTheDocument();
});

it('render should render styled component', () => {
	const { container, getByText } = render(
		<StyledSectionsRenderer>
			<div>Child</div>
		</StyledSectionsRenderer>
	);

	const root = container.firstChild;
	expect(root?.nodeName).toBe('SECTION');
	expect(root).toHaveAttribute('class', expect.stringMatching(/^rsg--root-\d+$/));
	expect(root).toContainElement(getByText('Child'));
});

it('render should render component', () => {
	const { container, getByText } = render(
		<SectionsRenderer classes={{ root: 'root' }}>
			<div>Child</div>
		</SectionsRenderer>
	);

	const root = container.firstChild;
	expect(root?.nodeName).toBe('SECTION');
	expect(root).toHaveClass('root', { exact: true });
	expect(root).toContainElement(getByText('Child'));
});
