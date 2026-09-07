import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PageNav, { collectHeadings, getHeadingHref, MIN_HEADINGS } from './PageNav.js';
import { CONTENT_ID } from '../../consts.js';

/**
 * Renders PageNav where it renders in production: inside the `#rsg-content` element it
 * collects its headings from, next to the prose. That is what makes the “does its own
 * render make it collect again forever” question testable at all.
 *
 * The React root gets a container of its own because `createRoot()` empties the element it
 * renders into, which would take the fixture prose with it.
 */
function renderPageNav(html: string, ui: React.ReactElement = <PageNav />) {
	const content = document.createElement('main');
	content.id = CONTENT_ID;
	const prose = document.createElement('div');
	prose.innerHTML = html;
	const mount = document.createElement('div');
	content.append(prose, mount);
	document.body.appendChild(content);
	return { ...render(ui, { container: mount }), prose };
}

/** A matchMedia that answers `matches` to everything, i.e. “this is a large window”. */
function stubMatchMedia(matches: boolean) {
	const original = window.matchMedia;
	window.matchMedia = ((query: string) =>
		({
			matches,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}) as unknown as MediaQueryList) as typeof window.matchMedia;
	return () => {
		window.matchMedia = original;
	};
}

const twoHeadings = '<h2 id="usage">Usage</h2><h3 id="props">Props</h3>';

afterEach(() => {
	document.body.innerHTML = '';
	window.history.replaceState(null, '', '/');
});

describe('collectHeadings', () => {
	const collect = (html: string) => {
		const root = document.createElement('div');
		root.innerHTML = html;
		return collectHeadings(root);
	};

	it('should collect h2 and h3 with ids, in document order', () => {
		expect(
			collect(
				'<h2 id="one">One</h2><p>text</p><h3 id="two">Two</h3><section><h2 id="three">Three</h2></section>'
			)
		).toEqual([
			{ id: 'one', text: 'One', level: 2 },
			{ id: 'two', text: 'Two', level: 3 },
			{ id: 'three', text: 'Three', level: 2 },
		]);
	});

	it('should ignore other levels and headings without an id', () => {
		expect(
			collect('<h1 id="title">Title</h1><h2>No id</h2><h4 id="deep">Deep</h4><h2 id="ok">Ok</h2>')
		).toEqual([{ id: 'ok', text: 'Ok', level: 2 }]);
	});

	// A `.md` page can contain two independently slugged Markdown blocks, and a link can only
	// ever reach the first `#usage` of them (ADR 0016)
	it('should list only the first heading of a duplicated id', () => {
		expect(collect('<h2 id="usage">Usage</h2><h2 id="usage">Usage again</h2>')).toEqual([
			{ id: 'usage', text: 'Usage', level: 2 },
		]);
	});

	it('should skip headings rendered by an example or painted by an editor', () => {
		expect(
			collect(
				'<h2 id="real">Real</h2>' +
					'<div data-preview="Button"><h2 id="in-preview">In preview</h2></div>' +
					'<div class="cm-editor"><h3 id="in-editor">In editor</h3></div>'
			)
		).toEqual([{ id: 'real', text: 'Real', level: 2 }]);
	});

	it('should collapse whitespace and skip headings without text', () => {
		expect(collect('<h2 id="a">  Two\n  words  </h2><h2 id="b"> </h2>')).toEqual([
			{ id: 'a', text: 'Two words', level: 2 },
		]);
	});
});

describe('getHeadingHref', () => {
	// A plain fragment is inert on a page whose hash is not a route
	it('should link with a plain fragment outside a route', () => {
		expect(getHeadingHref('usage', '')).toBe('#usage');
		expect(getHeadingHref('usage', '#other')).toBe('#usage');
	});

	// Replacing a routing fragment would navigate away, so in-page targets travel in `?id=`,
	// the parameter src/client/index.ts already scrolls to
	it('should keep the route and pass the heading in ?id= on a routed page', () => {
		expect(getHeadingHref('usage', '#/Components/Buttons')).toBe('/#/Components/Buttons?id=usage');
		expect(getHeadingHref('usage', '#!/Button')).toBe('/#!/Button?id=usage');
		// The `?id=` of the route we are on is replaced, not appended to
		expect(getHeadingHref('props', '#/Components?id=usage')).toBe('/#/Components?id=props');
	});
});

describe('PageNav', () => {
	it('should render one link per heading, in document order', () => {
		renderPageNav('<h2 id="usage">Usage</h2><h3 id="props">Props</h3><h2 id="api">API</h2>');
		const links = screen.getAllByTestId('rsg-pagenav-link');
		expect(links.map((link) => link.textContent)).toEqual(['Usage', 'Props', 'API']);
		expect(links.map((link) => link.getAttribute('href'))).toEqual(['#usage', '#props', '#api']);
	});

	it(`should render nothing below ${MIN_HEADINGS} headings`, () => {
		const { container } = renderPageNav('<h2 id="only">Only</h2>');
		expect(screen.queryByTestId('rsg-pagenav')).toBeNull();
		// Nothing at all, so the layout can collapse its slot (StyleGuideRenderer's
		// `$pageNav:empty` rule)
		expect(container).toBeEmptyDOMElement();
	});

	it('should render nothing when the page has no headings at all', () => {
		renderPageNav('<p>Just prose</p>');
		expect(screen.queryByTestId('rsg-pagenav')).toBeNull();
	});

	it('should mark the current heading with aria-current="location"', () => {
		renderPageNav(twoHeadings);
		// jsdom has no layout, so every heading reports the same geometry and useScrollSpy
		// answers with the first one — which is also the answer at the top of a real page
		const links = screen.getAllByTestId('rsg-pagenav-link');
		expect(links[0]).toHaveAttribute('aria-current', 'location');
		expect(links[1]).not.toHaveAttribute('aria-current');
	});

	it('should collect the headings again when the content changes', async () => {
		const { prose } = renderPageNav(twoHeadings);
		expect(screen.getAllByTestId('rsg-pagenav-link')).toHaveLength(2);

		const late = document.createElement('h2');
		late.id = 'late';
		late.textContent = 'Late';
		prose.appendChild(late);

		await waitFor(() =>
			expect(screen.getAllByTestId('rsg-pagenav-link').map((link) => link.textContent)).toEqual([
				'Usage',
				'Props',
				'Late',
			])
		);
	});

	// The rail is inside the element it observes, so its own renders reach the observer. If an
	// unchanged list were written back to state, that would be an endless loop.
	it('should not re-render itself in a loop over its own output', async () => {
		const { prose } = renderPageNav(twoHeadings);
		const before = screen.getByTestId('rsg-pagenav');
		prose.appendChild(document.createElement('p'));
		await new Promise((resolve) => setTimeout(resolve, 250));
		// Same DOM node: React never replaced the tree, because the list never changed
		expect(screen.getByTestId('rsg-pagenav')).toBe(before);
	});

	it('should link through ?id= on a routed page', () => {
		window.history.replaceState(null, '', '/#/Components/Buttons');
		renderPageNav(twoHeadings);
		expect(
			screen.getAllByTestId('rsg-pagenav-link').map((link) => link.getAttribute('href'))
		).toEqual(['/#/Components/Buttons?id=usage', '/#/Components/Buttons?id=props']);
	});

	it('should render the collapsible block on a window narrower than mq.large', () => {
		const restore = stubMatchMedia(false);
		try {
			renderPageNav(twoHeadings);
			expect(screen.getByTestId('rsg-pagenav-summary')).toHaveTextContent('On this page');
			expect(screen.getByTestId('rsg-pagenav')).toHaveAttribute('aria-label', 'On this page');
			// Closed by default: the entries are in the DOM but the block is not open
			expect(screen.getByTestId('rsg-pagenav').querySelector('details')).not.toHaveAttribute(
				'open'
			);
		} finally {
			restore();
		}
	});

	it('should render the rail from mq.large up', () => {
		const restore = stubMatchMedia(true);
		try {
			renderPageNav(twoHeadings);
			const nav = screen.getByRole('navigation', { name: 'On this page' });
			expect(nav).toHaveAttribute('data-testid', 'rsg-pagenav');
			expect(screen.queryByTestId('rsg-pagenav-summary')).toBeNull();
			expect(nav).toHaveTextContent('On this page');
		} finally {
			restore();
		}
	});

	it('should accept a custom title', () => {
		renderPageNav(twoHeadings, <PageNav title="Contents" />);
		expect(screen.getByTestId('rsg-pagenav')).toHaveAttribute('aria-label', 'Contents');
	});

	/**
	 * `styleguideComponents: { PageNavRenderer: './MyPageNav.js' }` becomes an alias for the
	 * exact module specifier PageNav imports (src/scripts/make-vite-config.ts, and the spec
	 * next to it pins the two aliases). Replacing that module here is the same substitution,
	 * so this is what a user's renderer is handed — the contract documented in
	 * docs/Cookbook.md.
	 */
	it('should hand a replaced PageNavRenderer the documented props', async () => {
		const props: Record<string, unknown>[] = [];
		vi.resetModules();
		vi.doMock('rsg-components/PageNav/PageNavRenderer', () => ({
			default: (received: Record<string, unknown>) => {
				props.push(received);
				return <div data-testid="custom-pagenav" />;
			},
		}));
		try {
			const { default: PageNavWithCustomRenderer } = await import('./PageNav.js');
			renderPageNav(twoHeadings, <PageNavWithCustomRenderer />);

			expect(screen.getByTestId('custom-pagenav')).toBeInTheDocument();
			expect(props[props.length - 1]).toEqual({
				headings: [
					{ id: 'usage', text: 'Usage', level: 2, href: '#usage' },
					{ id: 'props', text: 'Props', level: 3, href: '#props' },
				],
				activeId: 'usage',
				title: 'On this page',
				collapsible: true,
			});
		} finally {
			vi.doUnmock('rsg-components/PageNav/PageNavRenderer');
			vi.resetModules();
		}
	});
});
