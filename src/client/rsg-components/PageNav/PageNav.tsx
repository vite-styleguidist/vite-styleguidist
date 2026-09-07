import React from 'react';
import PageNavRenderer from 'rsg-components/PageNav/PageNavRenderer';
import { useStyleGuideContext } from 'rsg-components/Context';
import useMediaQuery, { toMediaQuery } from '../StyleGuide/useMediaQuery.js';
import useScrollSpy from '../../utils/useScrollSpy.js';
import getUrl from '../../utils/getUrl.js';
import { mq as defaultMq } from '../../styles/theme.js';
import { CONTENT_ID } from '../../consts.js';

/** The label of the list, visible and as the `aria-label` of its `<nav>`. */
export const PAGE_NAV_TITLE = 'On this page';

/**
 * A list of one entry is not a table of contents, it is a repetition of the page title, so
 * PageNav renders nothing below this many headings (ADR 0016).
 */
export const MIN_HEADINGS = 2;

/**
 * How long the content has to stop changing before the headings are read again. Everything
 * mutates the content while the reader works — an example re-renders on every keystroke in
 * its editor, a lazy MDX page arrives, a section is expanded — and the answer is almost
 * always the same list, so the observer only ever schedules this timer.
 */
export const RECOLLECT_DELAY = 100;

/**
 * Which headings the rail lists. h1 is the page title (there is exactly one, and it is the
 * heading the whole page is about), h4 and below are noise in a 168 px column — the same
 * h2/h3 window every documentation site's “on this page” uses. Only headings that already
 * have an id can be linked to, which is also what makes this pipeline-agnostic: `.md`
 * headings get their ids from markdown-to-jsx and `.mdx` ones from the loader's remark
 * pass, and a `styleguideComponents` override of Heading keeps whatever it renders.
 */
const HEADING_SELECTOR = 'h2[id], h3[id]';

/**
 * Headings that are *content of the page* rather than *structure of the page*: anything a
 * user's example renders inside a preview, and anything a code editor paints. They would
 * come and go as the reader edits an example, and they are not places to navigate to.
 */
const EXCLUDED_ANCESTORS =
	'[data-preview], [data-testid="preview-wrapper"], .CodeMirror, .cm-editor';

/** One entry of the list, as PageNavRenderer receives it. */
export interface PageNavHeading {
	/** The heading's DOM id; the link target and the key the scroll spy answers with. */
	id: string;
	/** Its text content, whitespace collapsed. */
	text: string;
	/** 2 or 3; 3 is rendered as a nested entry (`isChild`). */
	level: number;
	/**
	 * Where the entry links. Not `#id`: on a `pagePerSection` or isolated route the fragment
	 * *is* the route, so an in-page link is written as `#/Route?id=heading` — see
	 * {@link getHeadingHref}.
	 */
	href: string;
}

/** A heading as it comes out of the DOM, before it is given a link. */
export type CollectedHeading = Omit<PageNavHeading, 'href'>;

/**
 * The h2/h3 headings of the rendered page, in document order.
 *
 * Reading the DOM instead of the section tree is the whole design (ADR 0016): it works the
 * same for `.md`, `.mdx` and a custom Heading renderer, it cannot drift from the ids the
 * reader can actually link to, and it needs no build-time data.
 *
 * Duplicate ids are possible on a `.md` page (two `<Markdown>` blocks, each slugged on its
 * own, can both emit `#usage`), and a link can only ever reach the first of them, so only
 * the first is listed.
 */
export function collectHeadings(root: ParentNode): CollectedHeading[] {
	const headings: CollectedHeading[] = [];
	const seen = new Set<string>();
	root.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((element) => {
		if (!element.id || seen.has(element.id) || element.closest(EXCLUDED_ANCESTORS)) {
			return;
		}
		const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
		if (!text) {
			return;
		}
		seen.add(element.id);
		headings.push({
			id: element.id,
			text,
			// `h2[id], h3[id]` is the whole selector, so anything that is not an h2 is an h3
			level: element.tagName === 'H2' ? 2 : 3,
		});
	});
	return headings;
}

/** Whether two collected lists say the same thing, so a re-render can be skipped. */
function sameHeadings(a: CollectedHeading[], b: CollectedHeading[]): boolean {
	return (
		a.length === b.length &&
		a.every((heading, index) => heading.id === b[index].id && heading.text === b[index].text)
	);
}

/**
 * Where an in-page link has to point on the current route.
 *
 * `#heading` works on a page whose fragment is not a route. On the routed pages — which is
 * most of the pages PageNav appears on — the fragment *is* the route (`#/Components/Buttons`,
 * `#!/Button`), and replacing it would navigate away instead of scrolling. Those pages
 * already have a mechanism for in-page targets, the `?id=` parameter the sidebar uses at
 * `sectionDepth: 0`: src/client/index.ts reads it on `hashchange` and scrolls to the element
 * subtracting `--rsg-sticky-offset`. So the rail reuses it rather than inventing anything,
 * which is also why clicking an entry adds no motion of its own — there is nothing here for
 * `prefers-reduced-motion` to opt out of.
 */
export function getHeadingHref(
	id: string,
	hash: string,
	// Taken apart rather than read from `window` inside getUrl so that the hash this link is
	// built against is the one PageNav rendered with, in the test as well as in the browser
	location?: { origin: string; pathname: string }
): string {
	const isRoute = hash.startsWith('#/') || hash.startsWith('#!/');
	if (!isRoute) {
		return `#${id}`;
	}
	const { origin, pathname } = location ?? window.location;
	return getUrl({ slug: id, takeHash: true, useSlugAsIdParam: true }, { origin, pathname, hash });
}

/**
 * The headings of the page inside `#rsg-content`, kept up to date.
 *
 * Re-read on two triggers: the route (the app re-renders on `hashchange`, and a new route is
 * a new page), and any change of the content, through a `MutationObserver` — lazily loaded
 * MDX pages, an expanded example, a `usageMode` toggle all add headings after the first
 * render. The observer sees PageNav's own renders too (the rail is inside `#rsg-content`),
 * which is why the state is only replaced when the list actually differs: an unchanged list
 * is dropped and the loop ends there.
 */
function usePageHeadings(routeKey: string): CollectedHeading[] {
	const [headings, setHeadings] = React.useState<CollectedHeading[]>([]);

	React.useEffect(() => {
		if (typeof document === 'undefined') {
			return undefined;
		}
		const root = document.getElementById(CONTENT_ID);
		if (!root) {
			return undefined;
		}

		const read = () => {
			const next = collectHeadings(root);
			setHeadings((current) => (sameHeadings(current, next) ? current : next));
		};

		// The content of this render is already in the DOM when effects run
		read();

		/* istanbul ignore next: jsdom has MutationObserver, so this is for exotic hosts only */
		if (typeof MutationObserver === 'undefined') {
			return undefined;
		}
		let timer = 0;
		const observer = new MutationObserver(() => {
			if (timer !== 0) {
				return;
			}
			timer = window.setTimeout(() => {
				timer = 0;
				read();
			}, RECOLLECT_DELAY);
		});
		// `childList` and `subtree` only: attribute changes are the highlight moving and
		// character data is somebody typing in an editor, and neither adds or removes a heading
		observer.observe(root, { childList: true, subtree: true });
		return () => {
			observer.disconnect();
			if (timer !== 0) {
				window.clearTimeout(timer);
			}
		};
	}, [routeKey]);

	return headings;
}

/**
 * Makes a second click on the entry the reader is already on scroll back to its heading.
 *
 * On a routed page an entry links to `#/Route?id=heading` (see {@link getHeadingHref}), and
 * the browser only fires `hashchange` when the fragment actually changes. A repeat click
 * therefore produced no event at all: src/client/index.ts scrolls from that listener, and
 * the fragment matches no element id, so the browser’s own fragment scrolling had nothing to
 * do either — the reader clicked a link and nothing moved. On the sticky rail, where the
 * entry stays in view while they read, that is the most natural interaction there is.
 *
 * Re-dispatching `hashchange` when the address is already the target hands the click to
 * exactly the same code as the first click: index.ts scrolls to the `?id=` element
 * subtracting `--rsg-sticky-offset`, and useScrollSpy pins the highlight on the clicked
 * entry. ADR 0015 warns against synthetic `hashchange` events, but about the *scroll-driven*
 * URL writes of `scrollSync: 'hash'`, where the scroll it triggers fights the reader; here
 * scrolling is what the reader asked for.
 */
export function handleHeadingClick(event: React.MouseEvent<HTMLAnchorElement>): void {
	// Anything but a plain primary click is the reader asking for a new tab, a new window or
	// a download, and a handler that has already been dealt with is not ours to second-guess
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey ||
		typeof window === 'undefined'
	) {
		return;
	}
	// A click that does change the address fires `hashchange` on its own. `href` on the
	// element is the browser’s own resolved and normalised URL, so this comparison needs to
	// know nothing about how the link was built.
	if (event.currentTarget.href !== window.location.href) {
		return;
	}
	window.dispatchEvent(new Event('hashchange'));
}

export interface PageNavProps {
	/** Label of the list; also the accessible name of its `<nav>`. */
	title?: string;
}

/**
 * The “on this page” navigation: the headings of the page being read, with the one the
 * reader is looking at highlighted (ADR 0016).
 *
 * Whether it appears at all is decided by StyleGuide (the `pageNav` option, and the display
 * modes that show a single component or section); this component decides whether there is
 * anything worth showing, collects the headings and picks the presentation:
 *
 * - from `theme.mq.large` up, a sticky rail beside the content column;
 * - below it, the same list as a collapsible block above the content.
 *
 * The switch is made in JavaScript rather than with two hidden copies so that the page has
 * one “On this page” landmark, one set of links and one tab stop per entry, whatever the
 * window is doing.
 */
const PageNav: React.FunctionComponent<PageNavProps> = ({ title = PAGE_NAV_TITLE }) => {
	const { config } = useStyleGuideContext();
	// Read during render, so a route change (the app re-renders on `hashchange`) both
	// re-collects the headings and rebuilds the links against the new route
	const hash = typeof window === 'undefined' ? '' : window.location.hash;
	const collected = usePageHeadings(hash);
	const enabled = collected.length >= MIN_HEADINGS;

	const ids = React.useMemo(() => collected.map((heading) => heading.id), [collected]);
	const activeId = useScrollSpy(ids, { enabled });

	const isLarge = useMediaQuery(toMediaQuery(config.theme?.mq?.large || defaultMq.large));

	const headings = React.useMemo(
		() => collected.map((heading) => ({ ...heading, href: getHeadingHref(heading.id, hash) })),
		[collected, hash]
	);

	// After the hooks: they must run in the same order on the render that finds no headings
	// and on the one that finds them
	if (!enabled) {
		return null;
	}

	return (
		<PageNavRenderer
			headings={headings}
			activeId={activeId}
			title={title}
			collapsible={!isLarge}
			onHeadingClick={handleHeadingClick}
		/>
	);
};

export default PageNav;
