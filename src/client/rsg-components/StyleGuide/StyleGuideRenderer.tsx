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
	logo: {
		display: 'flex',
		flexDirection: 'column',
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
		gap: space[2],
		marginTop: 'auto',
		padding: [[12, space[2]]],
		borderTop: [[1, color.border, 'solid']],
		// Its two children join the header row / the panel on their own
		[mq.small]: {
			display: 'contents',
		},
	},
	toggle: {
		flexShrink: 0,
		[mq.small]: {
			order: 1,
			paddingRight: space[0],
		},
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
	hasSidebar?: boolean;
}

export const StyleGuideRenderer: React.FunctionComponent<StyleGuideRendererProps> = ({
	classes,
	title,
	version,
	homepageUrl,
	children,
	toc,
	hasSidebar,
}) => {
	const { config } = useStyleGuideContext();
	// Small screens only: whether the menu button has opened the search + list panel
	const [isPanelOpen, setPanelOpen] = useState(false);
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

	// Mirrors what ThemeToggle and Ribbon decide for themselves, so the footer is not
	// rendered as an empty bordered strip when neither has anything to show
	const hasToggle = (config.colorScheme || 'system') === 'system';
	const hasRibbon = !!config.ribbon;

	return (
		<div className={cx(classes.root, hasSidebar && classes.hasSidebar)}>
			{hasSidebar && (
				// The sidebar comes first in the DOM so that on small screens, where it is a
				// header bar, the navigation precedes the content in reading and tab order
				<div className={cx(classes.sidebar, isPanelOpen && classes.isOpen)} data-testid="sidebar">
					<header className={classes.logo}>
						{toc && (
							<button
								type="button"
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
					</header>
					<div className={classes.toc}>
						<SidebarContext.Provider value={sidebar}>{toc}</SidebarContext.Provider>
					</div>
					{(hasToggle || hasRibbon) && (
						<div className={classes.sidebarFooter}>
							<div className={classes.toggle}>
								<ThemeToggle />
							</div>
							{hasRibbon && (
								<div className={classes.ribbon}>
									<Ribbon inline />
								</div>
							)}
						</div>
					)}
				</div>
			)}
			<main className={classes.content}>
				{children}
				<footer className={classes.footer}>
					<Markdown text={`Created with [Vite Styleguidist](${homepageUrl})`} />
				</footer>
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
	hasSidebar: PropTypes.bool,
};

export default Styled<StyleGuideRendererProps>(styles)(StyleGuideRenderer);
