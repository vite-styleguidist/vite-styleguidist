import React, { Component } from 'react';
import ScrollSyncedToc from 'rsg-components/StyleGuide/ScrollSyncedToc';
import StyleGuideRenderer from 'rsg-components/StyleGuide/StyleGuideRenderer';
import PageNav from 'rsg-components/PageNav';
import Sections from 'rsg-components/Sections';
import Welcome from 'rsg-components/Welcome';
import Error from 'rsg-components/Error';
import NotFound from 'rsg-components/NotFound';
import Context from 'rsg-components/Context';
import { HOMEPAGE } from '../../../scripts/consts.js';
import { DisplayModes } from '../../consts.js';
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
 */
export function hasPageNav(
	displayMode: string | undefined,
	config: Rsg.ProcessedStyleguidistConfig,
	pagePerSection: boolean | undefined
): boolean {
	// Same default as the `displayMode` prop of StyleGuide: no mode is the all-in-one page
	const mode = displayMode || DisplayModes.all;
	if (!config.pageNav || mode === DisplayModes.notFound) {
		return false;
	}
	return !!pagePerSection || mode !== DisplayModes.all;
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
					pageNav={hasPageNav(displayMode, config, pagePerSection) ? <PageNav /> : undefined}
					hasSidebar={hasSidebar(displayMode, config.showSidebar)}
				>
					{sections.length ? <Sections sections={sections} depth={1} /> : <NotFound />}
				</StyleGuideRenderer>
			</Context.Provider>
		);
	}
}
