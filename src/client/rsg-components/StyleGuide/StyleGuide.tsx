import React, { Component } from 'react';
import ScrollSyncedToc from 'rsg-components/StyleGuide/ScrollSyncedToc';
import StyleGuideRenderer from 'rsg-components/StyleGuide/StyleGuideRenderer';
import PageNav from 'rsg-components/PageNav';
import Sections from 'rsg-components/Sections';
import Welcome from 'rsg-components/Welcome';
import Error from 'rsg-components/Error';
import NotFound from 'rsg-components/NotFound';
import Context from 'rsg-components/Context';
import { loadAllComponentDocs } from '../../utils/componentDocs.js';
import { HOMEPAGE } from '../../../scripts/consts.js';
import { DisplayModes, PAGE_NAV_TITLE } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

/**
 * This function will return true, if the sidebar should be visible and false otherwise.
 *
 * These sorted conditions (highest precedence first) define the visibility
 * state of the sidebar.
 *
 * - Sidebar is hidden for isolated example views
 * - Sidebar is always visible when pagePerSection
 * - Sidebar is hidden when showSidebar is set to false
 * - Sidebar is visible when showSidebar is set to true for non-isolated views
 *
 * @param {string} displayMode
 * @param {boolean} showSidebar
 * @param {boolean} pagePerSection
 * @returns {boolean}
 */
function hasSidebar(displayMode: string | undefined, showSidebar: boolean): boolean {
	return displayMode === DisplayModes.notFound || (showSidebar && displayMode === DisplayModes.all);
}

/**
 * Whether the sidebar has anything to follow while the reader scrolls.
 *
 * Only the default display mode puts every component on one page, which is the only shape
 * with component-level anchors to spy on: an isolated view (`#!/Button`) has no sidebar at
 * all, and `pagePerSection` renders one component per page, where the sidebar links are
 * routes rather than element ids (measured in ADR 0015: zero anchors). Heading-level
 * navigation for those pages is a separate feature (ADR 0016).
 */
function canScrollSync(
	displayMode: string | undefined,
	config: Rsg.ProcessedStyleguidistConfig,
	pagePerSection: boolean | undefined
): boolean {
	return displayMode === DisplayModes.all && config.showSidebar && !pagePerSection;
}

/**
 * Whether this page gets an “on this page” list of its own headings (`pageNav`, ADR 0016).
 *
 * The fence is “does this page show a single component or section”, because that is the
 * page a list of headings describes:
 *
 * - `pagePerSection` pages: yes — one section per page, and the sidebar links there are
 *   routes rather than in-page anchors, so headings are the only in-page navigation there
 *   is. Their `displayMode` stays `all` (getRouteData picks the first section for the
 *   landing page), which is why the flag is checked before the mode.
 * - `#/Section` and the isolated `#!/Name` views: yes — one section or component per page.
 * - the default all-in-one page: **no**. Every component of the guide is on it, so the list
 *   would repeat the sidebar at a finer grain and be as long as the guide. The sidebar is
 *   the page navigation there, and ADR 0015 already makes it follow the scroll.
 * - `notFound`: no, there is nothing to list.
 *
 * The narrower variant the fence leaves open — listing the headings of the component the
 * reader is currently on, in the default mode — is additive: it would relax this function
 * and pass PageNav a root to collect from, and needs nothing else to change.
 *
 * @param sections The sections this page renders, so that the `pagePerSection` branch can
 *   ask whether the page really is one section rather than trust the flag
 */
export function hasPageNav(
	displayMode: string | undefined,
	config: Rsg.ProcessedStyleguidistConfig,
	pagePerSection: boolean | undefined,
	sections: Rsg.Section[] = []
): boolean {
	// Same default as the `displayMode` prop of StyleGuide: no mode is the all-in-one page
	const mode = displayMode || DisplayModes.all;
	if (!config.pageNav || mode === DisplayModes.notFound) {
		return false;
	}
	if (mode !== DisplayModes.all) {
		return true;
	}
	// `pagePerSection` alone is not proof that this page shows one section. getRouteData only
	// picks a landing section when the first one has a name (getRouteData.ts), so a config
	// that sets the flag and lists `components` with no named `sections` — the docs' own
	// `pageNav` snippet plus the glob every project needs — has one unnamed root section,
	// nothing is filtered, and every component ends up on one page after all. Trusting the
	// flag there put a list of every heading of every component on exactly the page this
	// option is documented never to appear on. A page that is really one section renders
	// exactly that one, and it has a name, because the route is its name.
	return !!pagePerSection && sections.length === 1 && !!sections[0].name;
}

export interface StyleGuideProps {
	codeRevision: number;
	cssRevision: string;
	config: Rsg.ProcessedStyleguidistConfig;
	slots: any;
	sections: Rsg.Section[];
	welcomeScreen?: boolean;
	patterns?: string[];
	displayMode?: string;
	allSections?: Rsg.Section[];
	pagePerSection?: boolean;
}

interface StyleGuideState {
	error: Error | boolean;
	info: React.ErrorInfo | null;
}

export default class StyleGuide extends Component<StyleGuideProps, StyleGuideState> {
	public state = {
		error: false,
		info: null,
	};

	public componentDidCatch(error: Error, info: React.ErrorInfo) {
		this.setState({
			error,
			info,
		});
	}

	public componentDidMount() {
		this.loadDocsBeforeGivingUp();
	}

	public componentDidUpdate() {
		this.loadDocsBeforeGivingUp();
	}

	/**
	 * A route that matches nothing may only be matching nothing *yet*.
	 *
	 * With `lazyDocs` on (ADR 0019) a component is known by the name its file path gave it
	 * until its documentation is loaded, so a link written by hand to a component whose
	 * documented `displayName` is a different word finds no component and would render “not
	 * found” for good. Before showing that page, load the documentation that is still on
	 * demand and route again. It costs a sweep of the guide on a page that has nothing to
	 * show, once: when the sweep finds nothing left to load — a real 404 — nothing happens.
	 */
	private loadDocsBeforeGivingUp() {
		const { sections, allSections, welcomeScreen } = this.props;
		if (sections.length === 0 && !welcomeScreen && allSections) {
			loadAllComponentDocs(allSections);
		}
	}

	public render() {
		const { error, info }: StyleGuideState = this.state;
		const {
			config,
			sections,
			welcomeScreen,
			patterns,
			displayMode = DisplayModes.all,
			allSections,
			pagePerSection,
			codeRevision,
			cssRevision,
			slots,
		} = this.props;

		if (error && info) {
			return <Error error={error} info={info} />;
		}

		if (welcomeScreen && patterns) {
			return <Welcome patterns={patterns} />;
		}

		return (
			<Context.Provider
				value={{
					codeRevision,
					config,
					slots,
					displayMode: displayMode || DisplayModes.all,
					cssRevision,
				}}
			>
				<StyleGuideRenderer
					key={cssRevision}
					title={config.title}
					version={config.version}
					homepageUrl={HOMEPAGE}
					toc={
						allSections ? (
							<ScrollSyncedToc
								sections={allSections}
								useRouterLinks={pagePerSection}
								tocMode={config.tocMode}
								scrollSync={config.scrollSync}
								enabled={canScrollSync(displayMode, config, pagePerSection)}
							/>
						) : null
					}
					pageNav={
						hasPageNav(displayMode, config, pagePerSection, sections) ? (
							// Passed rather than left to PageNav's own default parameter: the Cookbook
							// documents a replaced PageNav as being rendered with a `title`, and a
							// replacement written against that contract used to get `undefined` and
							// render a navigation landmark with no accessible name
							<PageNav title={PAGE_NAV_TITLE} />
						) : undefined
					}
					hasSidebar={hasSidebar(displayMode, config.showSidebar)}
				>
					{sections.length ? <Sections sections={sections} depth={1} /> : <NotFound />}
				</StyleGuideRenderer>
			</Context.Provider>
		);
	}
}
