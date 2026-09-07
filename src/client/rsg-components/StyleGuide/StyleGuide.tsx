import React, { Component } from 'react';
import ScrollSyncedToc from 'rsg-components/StyleGuide/ScrollSyncedToc';
import StyleGuideRenderer from 'rsg-components/StyleGuide/StyleGuideRenderer';
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
					hasSidebar={hasSidebar(displayMode, config.showSidebar)}
				>
					{sections.length ? <Sections sections={sections} depth={1} /> : <NotFound />}
				</StyleGuideRenderer>
			</Context.Provider>
		);
	}
}
