import React from 'react';

/**
 * Small-screen state of the sidebar, shared between StyleGuideRenderer (which owns
 * the menu and search buttons of the sticky header) and the table of contents
 * (which owns the search + list panel those buttons open, and the links that close it
 * again). A context instead of props because the table of contents reaches the
 * renderer as an opaque `toc` element built by StyleGuide.tsx.
 *
 * On wide screens the panel is always visible and this state is ignored; the
 * default (no provider, e.g. a custom StyleGuideRenderer or a unit test rendering the
 * table of contents on its own) is "open" so that the full list is never hidden by
 * accident. On small screens the chip row and the panel are the two halves of one
 * control — the chips are the collapsed state, the panel replaces them — so the default
 * shows the panel and drops the chips rather than showing both.
 */
export interface SidebarState {
	isPanelOpen: boolean;
	/** Called when a navigation link is followed, so the panel gets out of the way */
	closePanel: () => void;
}

/** Element id of the panel, the target of the menu button's `aria-controls`. */
export const SIDEBAR_PANEL_ID = 'rsg-sidebar-panel';

/** Element id of the filter input, which the header's search button focuses. */
export const SIDEBAR_SEARCH_ID = 'rsg-sidebar-search';

const SidebarContext = React.createContext<SidebarState>({
	isPanelOpen: true,
	closePanel: () => undefined,
});

export function useSidebar(): SidebarState {
	return React.useContext(SidebarContext);
}

export default SidebarContext;
