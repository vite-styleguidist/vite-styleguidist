import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import { FiMenu, FiSearch } from 'react-icons/fi';
import Logo from 'rsg-components/Logo';
import Markdown from 'rsg-components/Markdown';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import Ribbon from 'rsg-components/Ribbon';
import Version from 'rsg-components/Version';
import ThemeToggle from 'rsg-components/ThemeToggle';
import { useStyleGuideContext } from 'rsg-components/Context';
import SidebarContext, {
	SIDEBAR_PANEL_ID,
	SIDEBAR_SEARCH_ID,
} from 'rsg-components/StyleGuide/SidebarContext';
import useMediaQuery, { toMediaQuery } from './useMediaQuery.js';
import { hasSchemeChoice } from '../ThemeToggle/colorScheme.js';
import { mq as defaultMq } from '../../styles/theme.js';
import {
	STICKY_OFFSET_FALLBACK,
	STICKY_OFFSET_FALLBACK_NO_TOC,
	STICKY_OFFSET_PROPERTY,
} from '../../styles/styles.js';
import { CONTENT_ID } from '../../consts.js';
import type * as Rsg from '../../../typings/index.js';

// Small-screen header: the sidebar collapses into this bar (Mobile artboard), and every
// control in it is a 44 px touch target
const MOBILE_HEADER_HEIGHT = 56;
const TOUCH_TARGET = 44;

const styles = ({
	color,
	fontFamily,
	fontSize,
	lineHeight,
	sidebarWidth,
	mq,
	space,
	maxWidth,
	pageNavWidth,
	borderRadius,
	transition,
}: Rsg.Theme): Styles => ({
	root: {
		minHeight: '100vh',
		backgroundColor: color.baseBackground,
	},
	hasSidebar: {
		paddingLeft: sidebarWidth,
		[mq.small]: {
			paddingLeft: 0,
		},
	},
	content: {
		// A flex column so that the footer can sit at the bottom of a short page
		display: 'flex',
		flexDirection: 'column',
		gap: space[4],
		// `maxWidth` is the width of the content; the horizontal paddings come on top
		// (the isolate reset makes every component border-box)
		maxWidth: maxWidth + 2 * space[6],
		minHeight: '100vh',
		margin: [[0, 'auto']],
		padding: [[space[5], space[6], space[6]]],
		[mq.medium]: {
			padding: [[space[4], space[4], space[5]]],
		},
		[mq.small]: {
			gap: space[3],
			minHeight: 0,
			padding: [[space[3], space[2], space[4]]],
		},
	},
	// `content` when a PageNav is mounted (the `pageNav` option, ADR 0016). Two children
	// then: the nav slot and the column that used to be the content of `<main>` itself.
	hasPageNav: {
		[mq.large]: {
			// Wide enough for the rail beside the column; the arithmetic is in theme.ts
			maxWidth: maxWidth + 2 * space[6] + space[3] + pageNavWidth,
			display: 'grid',
			// The column keeps its 960 px, and the rail's track keeps its width even on a page
			// with nothing to list (PageNav renders nothing, $pageNav collapses). An `auto`
			// track collapses with it, and the centred column then slides 96 px sideways on
			// every navigation between a page that has a rail and one that has not —
			// measured on the sections example, 7 of 15 consecutive sidebar clicks. The
			// column is the thing the reader's eye is anchored to; whitespace where a rail
			// would be costs nothing.
			gridTemplateColumns: `minmax(0, ${maxWidth}px) ${pageNavWidth + space[3]}px`,
			justifyContent: 'center',
			// $content's flex gap would become a grid gap between the two columns, which the
			// width arithmetic does not include (the rail brings its own gutter)
			gap: 0,
		},
	},
	// Everything that used to be a direct child of `<main>`; it keeps the column layout so
	// that only the outer element changes when the rail appears beside it
	contentColumn: {
		display: 'flex',
		flexDirection: 'column',
		gap: space[4],
		// Below mq.large `<main>` is still a flex column, and the footer's `margin-top: auto`
		// needs a column that fills the page to push against
		flex: [[1, 1, 'auto']],
		[mq.large]: {
			gridColumn: 1,
			gridRow: 1,
		},
		[mq.small]: {
			gap: space[3],
		},
	},
	// The slot PageNav renders into: above mq.large the sticky rail beside the column, below
	// it the full-width block above the content (PageNav picks which; see ADR 0016)
	pageNav: {
		// PageNav renders nothing on a page with fewer than two headings. Below mq.large the
		// empty box would still claim the flex gap above the content; above it the grid track
		// stays reserved on purpose, so the column does not move from page to page.
		'&:empty': {
			isolate: false,
			display: 'none',
		},
		[mq.large]: {
			gridColumn: 2,
			gridRow: 1,
			// The gutter between the column and the rail belongs to the rail, which is why the
			// reserved track is `pageNavWidth + space[3]` wide (see $hasPageNav)
			width: pageNavWidth + space[3],
			paddingLeft: space[3],
			alignSelf: 'start',
			position: 'sticky',
			// Below whatever sticks above (0 on wide screens, where the property is removed),
			// with the same air above the first entry as between the page blocks
			top: `calc(var(${STICKY_OFFSET_PROPERTY}, 0px) + ${space[4]}px)`,
			maxHeight: `calc(100vh - var(${STICKY_OFFSET_PROPERTY}, 0px) - ${2 * space[4]}px)`,
			overflow: 'auto',
		},
	},
	sidebar: {
		display: 'flex',
		flexDirection: 'column',
		backgroundColor: color.sidebarBackground,
		border: [[color.border, 'solid']],
		borderWidth: [[0, 1, 0, 0]],
		position: 'fixed',
		top: 0,
		left: 0,
		bottom: 0,
		width: sidebarWidth,
		overflow: 'auto',
		WebkitOverflowScrolling: 'touch',
		fontFamily: fontFamily.base,
		// Small screens: a sticky header bar. The children are laid out as a wrapping row
		// and reordered with `order`: header block, theme toggle, then the table of
		// contents (chip row + panel) and the ribbon link on their own full-width rows.
		[mq.small]: {
			position: 'sticky',
			bottom: 'auto',
			zIndex: 2,
			flexDirection: 'row',
			flexWrap: 'wrap',
			alignItems: 'center',
			width: 'auto',
			overflow: 'visible',
			borderWidth: [[0, 0, 1, 0]],
		},
	},
	// Marker: the small-screen panel is open (see $ribbon)
	isOpen: {},
	// Off-screen until it takes the focus, then a small button in the top-left corner.
	// `position: fixed` so that it is visible even though the desktop sidebar scrolls.
	skipLink: {
		position: 'absolute',
		width: 1,
		height: 1,
		margin: -1,
		padding: 0,
		overflow: 'hidden',
		clip: 'rect(0, 0, 0, 0)',
		whiteSpace: 'nowrap',
		border: 0,
		'&:focus-visible': {
			isolate: false,
			position: 'fixed',
			zIndex: 1000,
			top: space[1],
			left: space[1],
			width: 'auto',
			height: 'auto',
			margin: 0,
			padding: [[space[0], space[1]]],
			overflow: 'visible',
			clip: 'auto',
			display: 'inline-flex',
			alignItems: 'center',
			border: [[1, color.border, 'solid']],
			borderRadius,
			background: color.baseBackground,
			color: color.link,
			fontFamily: fontFamily.base,
			fontSize: fontSize.base,
			lineHeight: lineHeight.base,
			textDecoration: 'none',
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
	logo: {
		display: 'flex',
		flexDirection: 'column',
		// The sidebar is a flex column with `overflow: auto`, and the scrollable list is the
		// part meant to absorb the overflow ($toc is `flex-shrink: 0`, so it never gives).
		// Without this the header paid instead: 23 px of overflow at 1500x800 crushed a
		// two-line title to zero height and painted it through the filter field below.
		flexShrink: 0,
		padding: [[20, space[2], space[2]]],
		borderBottom: [[1, color.border, 'solid']],
		[mq.small]: {
			order: 0,
			flex: [[1, 1, 0]],
			minWidth: 0,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12,
			height: MOBILE_HEADER_HEIGHT,
			// 4 px, so that the 44 px buttons visually keep the 16 px page gutter
			padding: [[0, space[0]]],
			borderBottom: 0,
		},
	},
	title: {
		display: 'flex',
		flexDirection: 'column',
		minWidth: 0,
		[mq.small]: {
			flex: [[1, 1, 'auto']],
		},
	},
	// The two small-screen header buttons (menu, search); hidden on wide screens
	menuButton: {
		display: 'none',
		[mq.small]: {
			display: 'inline-flex',
			alignItems: 'center',
			justifyContent: 'center',
			flexShrink: 0,
			width: TOUCH_TARGET,
			height: TOUCH_TARGET,
			padding: 0,
			border: 0,
			borderRadius,
			background: 'transparent',
			color: color.base,
			cursor: 'pointer',
			transition: `background-color ${transition.fast}`,
			'&:hover': {
				isolate: false,
				background: color.selectedBackground,
			},
			'&:focus-visible': {
				isolate: false,
				outline: 0,
				boxShadow: [[0, 0, 0, 3, color.focus]],
			},
		},
	},
	searchButton: {
		composes: '$menuButton',
	},
	buttonIcon: {
		width: 20,
		height: 20,
	},
	// Wraps the table of contents so it can be placed in the small-screen row layout
	toc: {
		flexShrink: 0,
		[mq.small]: {
			order: 2,
			flexBasis: '100%',
			minWidth: 0,
		},
	},
	sidebarFooter: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		// Exposed to the same squeeze as $logo, and for the same reason
		flexShrink: 0,
		gap: space[2],
		marginTop: 'auto',
		padding: [[12, space[2]]],
		borderTop: [[1, color.border, 'solid']],
		// Its two children join the header row / the panel on their own
		[mq.small]: {
			display: 'contents',
		},
	},
	// The wrapper of whichever colour-scheme control is rendered: the segmented group in
	// the footer on wide screens, the single cycling button inside the header on small
	// ones (StyleGuideRenderer renders it in the header's own DOM order there)
	toggle: {
		flexShrink: 0,
	},
	ribbon: {
		minWidth: 0,
		[mq.small]: {
			order: 3,
			display: 'none',
			flexBasis: '100%',
			padding: [[space[1], space[2]]],
			borderTop: [[1, color.border, 'solid']],
			'$isOpen &': {
				isolate: false,
				display: 'block',
			},
		},
	},
	footer: {
		display: 'block',
		marginTop: 'auto',
		paddingTop: space[3],
		borderTop: [[1, color.border, 'solid']],
		color: color.light,
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
	},
});

interface StyleGuideRendererProps extends JssInjectedProps {
	title: string;
	version?: string;
	homepageUrl: string;
	children: React.ReactNode;
	toc?: React.ReactNode;
	/**
	 * The “on this page” navigation, when the `pageNav` option puts one on this page. A
	 * custom StyleGuideRenderer has to place it itself, as it does with the table of
	 * contents (docs/Cookbook.md).
	 */
	pageNav?: React.ReactNode;
	hasSidebar?: boolean;
}

export const StyleGuideRenderer: React.FunctionComponent<StyleGuideRendererProps> = ({
	classes,
	title,
	version,
	homepageUrl,
	children,
	toc,
	pageNav,
	hasSidebar,
}) => {
	const { config } = useStyleGuideContext();
	// Small screens only: whether the menu button has opened the search + list panel
	const [isPanelOpen, setPanelOpen] = useState(false);
	// The small-screen header holds the colour-scheme control itself, so that the tab
	// order follows the visual order; that is a different element in a different place
	// in the DOM, which CSS alone cannot do. A `theme.mq.small` override is honoured.
	const isSmallScreen = useMediaQuery(toMediaQuery(config.theme?.mq?.small || defaultMq.small));
	const sidebarRef = useRef<HTMLDivElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);
	const sidebar = useMemo(
		() => ({ isPanelOpen, closePanel: () => setPanelOpen(false) }),
		[isPanelOpen]
	);

	// The search button opens the panel and then focuses the input, which becomes
	// focusable only after the render that opens the panel; hence the flag and the effect
	const focusSearchOnOpen = useRef(false);
	useEffect(() => {
		if (isPanelOpen && focusSearchOnOpen.current) {
			focusSearchOnOpen.current = false;
			document.getElementById(SIDEBAR_SEARCH_ID)?.focus();
		}
	}, [isPanelOpen]);
	const openSearch = () => {
		if (isPanelOpen) {
			document.getElementById(SIDEBAR_SEARCH_ID)?.focus();
		} else {
			focusSearchOnOpen.current = true;
			setPanelOpen(true);
		}
	};

	// Closing the panel hides whatever had the focus inside it (a list link, the filter
	// input), which drops the focus to <body>; hand it back to the button that opens the
	// panel so that a keyboard or screen-reader user keeps their place
	const wasPanelOpen = useRef(isPanelOpen);
	useEffect(() => {
		const closed = wasPanelOpen.current && !isPanelOpen;
		wasPanelOpen.current = isPanelOpen;
		if (!closed) {
			return undefined;
		}
		const restoreFocus = () => {
			const active = document.activeElement;
			// Only when the focus is the panel's to lose: it has usually fallen back to
			// <body> by now (the browser blurs an element that becomes display: none), but
			// a browser that keeps it, or a chip that closed the panel, leaves it inside
			// the sidebar. Escape pressed with the focus in the content keeps it there.
			const lost = !active || active === document.body || !!sidebarRef.current?.contains(active);
			if (lost) {
				menuButtonRef.current?.focus();
			}
		};
		// Deferred by a frame, because the panel is hidden by the render this effect
		// belongs to. Following a list link closes the panel *and* navigates to a
		// fragment, and the browser resets the focus to <body> at the end of that
		// navigation, after the frame; `hashchange` is where that has happened. The
		// listener is bounded, so a navigation minutes later is none of its business.
		const frame = requestAnimationFrame(restoreFocus);
		window.addEventListener('hashchange', restoreFocus);
		const timer = window.setTimeout(
			() => window.removeEventListener('hashchange', restoreFocus),
			500
		);
		return () => {
			/* istanbul ignore next: jsdom's rAF stub (test/setup.ts) runs synchronously */
			if (typeof cancelAnimationFrame === 'function') {
				cancelAnimationFrame(frame);
			}
			window.clearTimeout(timer);
			window.removeEventListener('hashchange', restoreFocus);
		};
	}, [isPanelOpen]);

	// Publish the height of the sticky header so that anchor targets can clear it: the
	// `scroll-padding-top` in styles.ts and the `?id=` scrolling in index.ts read it
	useEffect(() => {
		const root = document.documentElement;
		const node = sidebarRef.current;
		// Only the small-screen sidebar covers the content; on wide screens it sits
		// beside it, and the property goes away so index.ts scrolls to the very top
		if (!node || !isSmallScreen) {
			root.style.removeProperty(STICKY_OFFSET_PROPERTY);
			return undefined;
		}
		// An open panel makes the sidebar as tall as the list; the offset that matters is
		// the one left after a navigation, which always closes the panel first
		if (isPanelOpen) {
			return undefined;
		}
		const publish = () => {
			const height =
				node.offsetHeight || (toc ? STICKY_OFFSET_FALLBACK : STICKY_OFFSET_FALLBACK_NO_TOC);
			root.style.setProperty(STICKY_OFFSET_PROPERTY, `${Math.round(height)}px`);
		};
		publish();
		/* istanbul ignore next: jsdom has no ResizeObserver */
		if (typeof ResizeObserver === 'undefined') {
			return undefined;
		}
		// The header grows and shrinks on its own (a wrapping title, the chip row
		// appearing, a rotated phone), so measuring once is not enough
		const observer = new ResizeObserver(publish);
		observer.observe(node);
		return () => observer.disconnect();
	}, [isSmallScreen, isPanelOpen, toc]);

	// Escape closes the open panel wherever the focus is
	useEffect(() => {
		if (!isPanelOpen) {
			return undefined;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setPanelOpen(false);
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [isPanelOpen]);

	// What ThemeToggle and Ribbon decide for themselves, so the footer is not rendered as
	// an empty bordered strip when neither has anything to show. The colour-scheme
	// decision comes from colorScheme.ts, the module the toggle itself asks.
	const hasToggle = hasSchemeChoice(config.colorScheme);
	const hasRibbon = !!config.ribbon;
	// On small screens the control lives in the header instead (see $toggle)
	const hasFooterToggle = hasToggle && !isSmallScreen;

	// The sidebar precedes the content in the DOM, so a keyboard user would otherwise
	// tab through every navigation link on every page (WCAG 2.4.1 Bypass Blocks)
	const skipToContent = (event: React.MouseEvent<HTMLAnchorElement>) => {
		const content = document.getElementById(CONTENT_ID);
		if (content) {
			// Focus it by hand: following the link would replace the routing hash
			event.preventDefault();
			content.focus();
		}
	};

	const content = (
		<>
			{children}
			<footer className={classes.footer}>
				<Markdown text={`Created with [Vite Styleguidist](${homepageUrl})`} />
			</footer>
		</>
	);

	return (
		<div className={cx(classes.root, hasSidebar && classes.hasSidebar)}>
			{hasSidebar && (
				// The sidebar comes first in the DOM so that on small screens, where it is a
				// header bar, the navigation precedes the content in reading and tab order
				<div
					className={cx(classes.sidebar, isPanelOpen && classes.isOpen)}
					data-testid="sidebar"
					ref={sidebarRef}
				>
					<a className={classes.skipLink} href={`#${CONTENT_ID}`} onClick={skipToContent}>
						Skip to content
					</a>
					<header className={classes.logo}>
						{toc && (
							<button
								type="button"
								ref={menuButtonRef}
								className={classes.menuButton}
								aria-label="Menu"
								aria-expanded={isPanelOpen}
								aria-controls={SIDEBAR_PANEL_ID}
								onClick={() => setPanelOpen(!isPanelOpen)}
							>
								<FiMenu className={classes.buttonIcon} aria-hidden="true" />
							</button>
						)}
						<div className={classes.title}>
							<Logo>{title}</Logo>
							{version && <Version>{version}</Version>}
						</div>
						{toc && (
							<button
								type="button"
								className={classes.searchButton}
								aria-label="Search"
								onClick={openSearch}
							>
								<FiSearch className={classes.buttonIcon} aria-hidden="true" />
							</button>
						)}
						{isSmallScreen && hasToggle && (
							<div className={classes.toggle}>
								<ThemeToggle compact />
							</div>
						)}
					</header>
					<div className={classes.toc}>
						<SidebarContext.Provider value={sidebar}>{toc}</SidebarContext.Provider>
					</div>
					{(hasFooterToggle || hasRibbon) && (
						<div className={classes.sidebarFooter}>
							{hasFooterToggle && (
								<div className={classes.toggle}>
									<ThemeToggle />
								</div>
							)}
							{hasRibbon && (
								<div className={classes.ribbon}>
									<Ribbon inline />
								</div>
							)}
						</div>
					)}
				</div>
			)}
			{/* tabIndex: the skip link above moves the focus here */}
			<main
				id={CONTENT_ID}
				className={cx(classes.content, pageNav && classes.hasPageNav)}
				tabIndex={-1}
			>
				{/* The nav comes before the content it describes, which is its reading order in
				    the collapsible presentation and its landmark order in the rail one. Without a
				    PageNav the children stay direct children of <main>, byte for byte the markup
				    every existing style guide has. */}
				{pageNav ? (
					<>
						<div className={classes.pageNav}>{pageNav}</div>
						<div className={classes.contentColumn}>{content}</div>
					</>
				) : (
					content
				)}
			</main>
			{!hasSidebar && <Ribbon />}
		</div>
	);
};

StyleGuideRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	title: PropTypes.string.isRequired,
	version: PropTypes.string,
	homepageUrl: PropTypes.string.isRequired,
	children: PropTypes.any.isRequired,
	toc: PropTypes.any.isRequired,
	pageNav: PropTypes.any,
	hasSidebar: PropTypes.bool,
};

export default Styled<StyleGuideRendererProps>(styles)(StyleGuideRenderer);
