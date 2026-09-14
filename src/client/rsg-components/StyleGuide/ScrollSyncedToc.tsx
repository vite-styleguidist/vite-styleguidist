import React from 'react';
import TableOfContents from 'rsg-components/TableOfContents';
import useScrollSpy from '../../utils/useScrollSpy.js';
import type * as Rsg from '../../../typings/index.js';

/**
 * How long the scrolling has to be quiet before the URL is rewritten in
 * `scrollSync: 'hash'`. A flick through a large style guide must not turn into one
 * `history.replaceState` call per component: WebKit throttles them to 100 per 30 s, and a
 * throttled call is dropped, not queued (ADR 0015).
 */
export const HASH_WRITE_DELAY = 150;

/**
 * Whether a fragment is a route rather than an anchor. `#!/Button` is the isolated view and
 * `#/Components/Buttons` is the `pagePerSection` route; rewriting either would change the
 * page under the reader, so the URL half of scroll sync leaves both alone. Only the default
 * mode’s plain `#slug` is inert (`getInfoFromHash` returns `{}` for it), which is exactly
 * what makes it safe to write.
 */
const isRoute = (hash: string): boolean => hash.startsWith('#/') || hash.startsWith('#!/');

/**
 * Every slug in the section tree, which in the default display mode is also every anchor
 * on the page: the sidebar links to `#<slug>` (`getUrl` with `anchor: true`) and the
 * headings render `id={slug}` (ReactComponent, SectionRenderer). Ids that turn out not to
 * be in the DOM — an external-link section, a component filtered out of the page — cost
 * nothing: useScrollSpy skips ids it cannot resolve.
 */
export function collectSlugs(sections: Rsg.Section[], into: string[] = []): string[] {
	for (const section of sections) {
		if (section.slug) {
			into.push(section.slug);
		}
		for (const component of section.components || []) {
			if (component.slug) {
				into.push(component.slug);
			}
		}
		if (section.sections) {
			collectSlugs(section.sections, into);
		}
	}
	return into;
}

/**
 * Keeps the location fragment on the anchor the reader is looking at, for
 * `scrollSync: 'hash'`.
 *
 * `history.replaceState` only, and deliberately without dispatching a `hashchange`: the
 * app re-renders and calls `scrollToOrigin()` on that event (src/client/index.ts), which
 * was measured to yank the viewport back four times in a single 20-step scroll. Nothing
 * observes a `replaceState`, which is why the highlight is driven by React state instead of
 * by re-reading `window.location` — see ADR 0015.
 */
function useSyncedHash(activeSlug: string | undefined, enabled: boolean): void {
	React.useEffect(() => {
		if (!enabled || !activeSlug || typeof window === 'undefined') {
			return;
		}
		const target = `#${activeSlug}`;
		// Skipping an unchanged write matters as much as the debounce for the WebKit budget
		if (window.location.hash === target || isRoute(window.location.hash)) {
			return;
		}
		// The effect re-runs on every change of `activeSlug`, so clearing the previous timer
		// in the cleanup is what makes this a debounce: only a value that survives
		// HASH_WRITE_DELAY of quiet is written.
		const timer = window.setTimeout(() => {
			const { pathname, search } = window.location;
			// `history.state` is preserved: the entry is being amended, not replaced
			window.history.replaceState(window.history.state, '', `${pathname}${search}${target}`);
		}, HASH_WRITE_DELAY);
		return () => window.clearTimeout(timer);
	}, [activeSlug, enabled]);
}

export interface ScrollSyncedTocProps {
	sections: Rsg.Section[];
	useRouterLinks?: boolean;
	tocMode?: string;
	/** The `scrollSync` config option, verbatim. */
	scrollSync?: Rsg.ScrollSync;
	/**
	 * Whether this display mode has anything to spy on at component granularity: only the
	 * default all-in-one page has (ADR 0015). StyleGuide decides; this component only obeys.
	 */
	enabled?: boolean;
}

/**
 * The sidebar, plus the machinery that keeps its highlight on the section the reader has
 * scrolled to.
 *
 * A separate component because StyleGuide is a class and this needs hooks — and because
 * having the state here means a scroll re-renders the sidebar subtree instead of the whole
 * style guide. It is plumbing, not a documented `styleguideComponents` target: the
 * replaceable component is still `rsg-components/TableOfContents`, which it renders, and an
 * override of it that ignores the new `activeSlug` prop simply gets no scroll-driven
 * highlight.
 */
const ScrollSyncedToc: React.FunctionComponent<ScrollSyncedTocProps> = ({
	sections,
	useRouterLinks,
	tocMode,
	scrollSync = 'selection',
	enabled = true,
}) => {
	const slugs = React.useMemo(() => collectSlugs(sections), [sections]);
	const spying = enabled && scrollSync !== false;
	const activeSlug = useScrollSpy(slugs, { enabled: spying });
	useSyncedHash(activeSlug, spying && scrollSync === 'hash');

	return (
		<TableOfContents
			sections={sections}
			useRouterLinks={useRouterLinks}
			tocMode={tocMode}
			activeSlug={activeSlug}
		/>
	);
};

export default ScrollSyncedToc;
