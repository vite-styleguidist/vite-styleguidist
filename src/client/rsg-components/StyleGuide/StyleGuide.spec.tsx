import React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import StyleGuide, { StyleGuideProps } from './StyleGuide.js';
import slots from '../slots/index.js';
import { DisplayModes } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

/* eslint-disable no-console */

const sections: Rsg.Section[] = [
	{
		exampleMode: 'collapse',
		usageMode: 'collapse',
		slug: 'section',
		components: [
			{
				name: 'Foo',
				visibleName: 'Foo',
				href: '#foo',
				slug: 'foo',
				pathLine: 'components/foo.js',
				filepath: 'components/foo.js',
				props: {
					description: 'Foo foo',
				},
			},
			{
				name: 'Bar',
				visibleName: 'Bar',
				href: '#bar',
				slug: 'bar',
				pathLine: 'components/bar.js',
				filepath: 'components/bar.js',
				props: {
					description: 'Bar bar',
				},
			},
		],
	},
];

const config = {
	title: 'HelloStyleGuide',
	version: '1.0.0',
	showSidebar: true,
} as Rsg.ProcessedStyleguidistConfig;

const defaultProps: StyleGuideProps = {
	codeRevision: 1,
	cssRevision: '1',
	config,
	pagePerSection: false,
	sections: [],
	allSections: [],
	slots: slots(),
	patterns: ['components/**.js'],
};

test('should render components', () => {
	const { getByText } = render(
		<StyleGuide {...defaultProps} sections={sections} allSections={sections} />
	);
	expect(getByText('components/foo.js')).toBeInTheDocument();
	expect(getByText('components/bar.js')).toBeInTheDocument();
});

test('should render welcome screen', () => {
	const { getByText } = render(<StyleGuide {...defaultProps} welcomeScreen />);
	expect(getByText('No components found yet')).toBeInTheDocument();
});

test('should render a sidebar if showSidebar is not set', () => {
	const { getByTestId } = render(
		<StyleGuide {...defaultProps} sections={sections} allSections={sections} />
	);
	const sidebar = within(getByTestId('sidebar'));
	const links = sidebar.getAllByRole('link');
	expect(links.map((node: any) => node.href)).toEqual([
		'http://localhost/#foo',
		'http://localhost/#bar',
	]);
	expect(links.map((node) => node.textContent)).toEqual(['Foo', 'Bar']);
});

test('should render the sidebar before the content, with a menu button that controls the panel', () => {
	const { getByTestId, getByRole, getByLabelText, container } = render(
		<StyleGuide {...defaultProps} sections={sections} allSections={sections} />
	);
	const sidebar = getByTestId('sidebar');
	// Small screens turn the sidebar into a header bar, so it must precede the content
	expect(sidebar.compareDocumentPosition(getByRole('main'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

	// The header buttons exist for small screens only (display: none above the
	// breakpoint), and a hidden element has no accessible name, so query the attribute
	const menu = getByLabelText('Menu');
	const panel = container.querySelector(`#${menu.getAttribute('aria-controls')}`);
	expect(panel).not.toBeNull();
	expect(menu).toHaveAttribute('aria-expanded', 'false');
	fireEvent.click(menu);
	expect(menu).toHaveAttribute('aria-expanded', 'true');
	expect(sidebar.className).toMatch(/rsg--isOpen-\d+/);
	fireEvent.keyDown(document, { key: 'Escape' });
	expect(menu).toHaveAttribute('aria-expanded', 'false');

	// The search button opens the panel and focuses the filter input
	fireEvent.click(getByLabelText('Search'));
	expect(menu).toHaveAttribute('aria-expanded', 'true');
	expect(getByRole('textbox', { name: 'Filter by name' })).toHaveFocus();
});

test('should render the ribbon inline in the sidebar footer, and as a pill without a sidebar', () => {
	const ribbon = { url: 'https://example.com/repo' };
	const { getByTestId, getByRole, rerender } = render(
		<StyleGuide
			{...defaultProps}
			config={{ ...config, ribbon }}
			sections={sections}
			allSections={sections}
		/>
	);
	const inline = within(getByTestId('sidebar')).getByRole('link', { name: 'GitHub' });
	expect(inline.className).toMatch(/rsg--inlineLink-\d+/);

	rerender(
		<StyleGuide
			{...defaultProps}
			config={{ ...config, ribbon, showSidebar: false }}
			sections={sections}
			allSections={sections}
		/>
	);
	expect(getByRole('link', { name: 'GitHub' }).className).toMatch(/rsg--link-\d+/);
});

test('should not render a sidebar if showSidebar is false', () => {
	const { queryByTestId } = render(
		<StyleGuide
			{...defaultProps}
			config={{
				...config,
				showSidebar: false,
			}}
			sections={sections}
			allSections={sections}
		/>
	);
	expect(queryByTestId('sidebar')).not.toBeInTheDocument();
});

test('should not render a sidebar in isolation mode', () => {
	const { queryByTestId } = render(
		<StyleGuide
			{...defaultProps}
			sections={sections}
			allSections={sections}
			displayMode={DisplayModes.component}
		/>
	);
	expect(queryByTestId('sidebar')).not.toBeInTheDocument();
});

test('should render a sidebar if pagePerSection is true', () => {
	const { getByTestId } = render(
		<StyleGuide
			{...defaultProps}
			sections={sections}
			allSections={sections}
			displayMode={DisplayModes.all}
			pagePerSection
		/>
	);
	expect(getByTestId('sidebar')).toBeInTheDocument();
});

describe('error handling', () => {
	const console$error = console.error;
	beforeAll(() => {
		console.error = vi.fn();
	});
	afterAll(() => {
		console.error = console$error;
	});
	test('should render an error when componentDidCatch() is triggered', () => {
		const { getByText } = render(
			<StyleGuide {...defaultProps} patterns={null as any} welcomeScreen />
		);
		expect(getByText(/Page not found/i)).toBeInTheDocument();
	});
});
