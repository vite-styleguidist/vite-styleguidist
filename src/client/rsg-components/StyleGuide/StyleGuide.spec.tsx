import React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import StyleGuide, { hasPageNav, StyleGuideProps } from './StyleGuide.js';
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
	// The skip link comes first: the sidebar precedes the content in the DOM
	expect(links.map((node: any) => node.href)).toEqual([
		'http://localhost/#rsg-content',
		'http://localhost/#foo',
		'http://localhost/#bar',
	]);
	expect(links.map((node) => node.textContent)).toEqual(['Skip to content', 'Foo', 'Bar']);
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

/**
 * The sidebar precedes the content in the DOM (the small-screen header needs it there),
 * so a keyboard user needs a way past its links (WCAG 2.4.1, QA F3).
 */
test('should offer a skip link that moves the focus to the content', () => {
	const { getByTestId, getByRole } = render(
		<StyleGuide {...defaultProps} sections={sections} allSections={sections} />
	);
	const skipLink = within(getByTestId('sidebar')).getAllByRole('link')[0];
	expect(skipLink).toHaveTextContent('Skip to content');

	fireEvent.click(skipLink);
	const main = getByRole('main');
	expect(main).toHaveAttribute('id', 'rsg-content');
	expect(document.activeElement).toBe(main);
	// The routing hash is left alone: the link focuses the content by hand
	expect(window.location.hash).toBe('');
});

/**
 * Closing the panel hides whatever had the focus inside it, so the focus goes back to
 * the button that opens it instead of to <body> (QA F8).
 */
test('should return the focus to the menu button when the panel is closed with Escape', () => {
	const { getByLabelText } = render(
		<StyleGuide {...defaultProps} sections={sections} allSections={sections} />
	);
	// The header buttons are display: none outside the small-screen media query, which
	// jsdom does not evaluate, so they are queried by label rather than by role
	fireEvent.click(getByLabelText('Search'));
	expect(document.activeElement).toBe(document.getElementById('rsg-sidebar-search'));

	fireEvent.keyDown(document, { key: 'Escape' });
	expect(document.activeElement).toBe(getByLabelText('Menu'));
});

/**
 * On small screens the colour-scheme control is a single cycling button inside the
 * header, in DOM order after the search button, so the tab order follows the visual
 * order and the title keeps its room (QA F9, V5).
 */
test('should render the colour-scheme control inside the small-screen header', () => {
	const originalMatchMedia = window.matchMedia;
	window.matchMedia = ((query: string) =>
		({
			matches: true,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}) as unknown as MediaQueryList) as typeof window.matchMedia;
	try {
		const { getByTestId, queryByRole } = render(
			<StyleGuide {...defaultProps} sections={sections} allSections={sections} />
		);
		const header = getByTestId('sidebar').querySelector('header') as HTMLElement;
		expect(
			// `hidden: true`: the header buttons are display: none outside the small-screen
			// media query, which jsdom does not evaluate
			within(header)
				.getAllByRole('button', { hidden: true })
				.map((button) => button.getAttribute('aria-label'))
		).toEqual(['Menu', 'Search', 'Color scheme: System. Switch to Light']);
		// and the three-button group is not rendered as well
		expect(queryByRole('group', { name: 'Color scheme', hidden: true })).toBeNull();
	} finally {
		window.matchMedia = originalMatchMedia;
	}
});

/**
 * Where an “on this page” list appears (`pageNav`, ADR 0016). The rule is “this page shows a
 * single component or section”, which is not one `displayMode` check: `pagePerSection` pages
 * keep `displayMode: 'all'` even though each of them shows one section.
 */
describe('hasPageNav', () => {
	const on = { ...config, pageNav: true } as Rsg.ProcessedStyleguidistConfig;
	const off = { ...config, pageNav: false } as Rsg.ProcessedStyleguidistConfig;
	/** What a `pagePerSection` route renders: the one named section of the page. */
	const oneSection = [{ name: 'Documentation', slug: 'documentation' }] as Rsg.Section[];
	/**
	 * What a guide with a `components` glob and no named `sections` renders on every route:
	 * one unnamed root section holding the lot, i.e. the all-in-one page after all.
	 */
	const unnamedRoot = [{ components: [{ name: 'Button' }] }] as Rsg.Section[];

	it('should be off unless the option is on', () => {
		expect(hasPageNav(DisplayModes.component, off, false, oneSection)).toBe(false);
		expect(hasPageNav(DisplayModes.all, off, true, oneSection)).toBe(false);
	});

	it('should be off on the default all-in-one page, where the sidebar is the page nav', () => {
		expect(hasPageNav(DisplayModes.all, on, false, unnamedRoot)).toBe(false);
		expect(hasPageNav(undefined, on, false, unnamedRoot)).toBe(false);
	});

	it('should be on for a pagePerSection page, including its implicit landing page', () => {
		expect(hasPageNav(DisplayModes.all, on, true, oneSection)).toBe(true);
		expect(hasPageNav(DisplayModes.section, on, true, oneSection)).toBe(true);
	});

	it('should be off when pagePerSection has no named section to page by', () => {
		// getRouteData only picks a landing section when the first one has a name, so this
		// config filters nothing: every component is on one page and the flag is a no-op
		expect(hasPageNav(DisplayModes.all, on, true, unnamedRoot)).toBe(false);
		expect(hasPageNav(undefined, on, true, unnamedRoot)).toBe(false);
	});

	it('should be on for a single section, a single component and an isolated example', () => {
		expect(hasPageNav(DisplayModes.section, on, false, oneSection)).toBe(true);
		expect(hasPageNav(DisplayModes.component, on, false, oneSection)).toBe(true);
		expect(hasPageNav(DisplayModes.example, on, false, oneSection)).toBe(true);
	});

	it('should be off when there is no page to describe', () => {
		expect(hasPageNav(DisplayModes.notFound, on, false, oneSection)).toBe(false);
		expect(hasPageNav(DisplayModes.notFound, on, true, oneSection)).toBe(false);
	});
});

test('should mount the page navigation where the fence allows it', () => {
	const { getByTestId, getAllByTestId } = render(
		<StyleGuide
			{...defaultProps}
			config={{ ...config, pageNav: true } as Rsg.ProcessedStyleguidistConfig}
			sections={sections}
			allSections={sections}
			displayMode={DisplayModes.component}
		/>
	);

	// The two component headings of the page, collected from the DOM they rendered into
	expect(getAllByTestId('rsg-pagenav-link').map((link) => link.textContent)).toEqual([
		'Foo',
		'Bar',
	]);
	// Inside <main>, before the content it describes
	const main = getByTestId('rsg-pagenav').closest('main') as HTMLElement;
	expect(main.id).toBe('rsg-content');
	expect(main.firstElementChild?.firstElementChild).toBe(getByTestId('rsg-pagenav'));
});

test('should not mount the page navigation on the all-in-one page', () => {
	const { queryByTestId } = render(
		<StyleGuide
			{...defaultProps}
			config={{ ...config, pageNav: true } as Rsg.ProcessedStyleguidistConfig}
			sections={sections}
			allSections={sections}
		/>
	);
	expect(queryByTestId('rsg-pagenav')).toBeNull();
	// and the layout is the one every style guide without the option has
	expect(document.querySelector('#rsg-content > section')).not.toBeNull();
});
