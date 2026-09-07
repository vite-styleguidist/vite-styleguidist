import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import { Styles } from 'jss';
import { FiSearch } from 'react-icons/fi';
import Link from 'rsg-components/Link';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import {
	SIDEBAR_PANEL_ID,
	SIDEBAR_SEARCH_ID,
	useSidebar,
} from 'rsg-components/StyleGuide/SidebarContext';
import keepInView from '../../utils/keepInView.js';
import type * as Rsg from '../../../typings/index.js';

// The small-screen chip row: 44 px touch targets (Mobile artboard)
const TOUCH_TARGET = 44;

const styles = ({
	space,
	color,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	borderRadius,
	transition,
	mq,
}: Rsg.Theme): Styles => ({
	root: {
		fontFamily: fontFamily.base,
	},
	// A rule of its own so that the element is isolated from the host page's styles
	nav: {},
	search: {
		padding: [[12, 12, space[0]]],
	},
	// Positions the search icon over the input
	field: {
		position: 'relative',
	},
	icon: {
		position: 'absolute',
		top: '50%',
		left: 10,
		width: 16,
		height: 16,
		marginTop: -8,
		color: color.light,
		pointerEvents: 'none',
	},
	input: {
		display: 'block',
		width: '100%',
		height: 36,
		// Room for the 16 px icon at 10 px from the left edge
		padding: [[0, 10, 0, 34]],
		color: color.base,
		backgroundColor: color.baseBackground,
		fontFamily: fontFamily.base,
		fontSize: 14,
		lineHeight: lineHeight.base,
		border: [[1, color.border, 'solid']],
		borderRadius,
		transition: `border-color ${transition.fast}, box-shadow ${transition.fast}`,
		'&:focus': {
			isolate: false,
			borderColor: color.link,
			boxShadow: [[0, 0, 0, 3, color.focus]],
			outline: 0,
		},
		'&::placeholder': {
			isolate: false,
			fontFamily: fontFamily.base,
			fontSize: 14,
			color: color.light,
			// Firefox dims placeholders by default; the token already has the right contrast
			opacity: 1,
		},
	},
	// The live region under the search; collapses when there is nothing to say
	noMatch: {
		padding: [[space[0], space[1]]],
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
		color: color.light,
		'&:empty': {
			isolate: false,
			display: 'none',
		},
	},
	// Search + list. Always visible on wide screens; on small ones a scrollable panel
	// that the header's menu button opens (see StyleGuide/SidebarContext)
	panel: {
		[mq.small]: {
			maxHeight: '60vh',
			overflowY: 'auto',
			overscrollBehavior: 'contain',
			borderTop: [[1, color.border, 'solid']],
		},
	},
	isCollapsed: {
		[mq.small]: {
			display: 'none',
		},
	},
	// Horizontally scrollable row of the top-level entries, small screens only. It is the
	// COLLAPSED state of the navigation (Mobile artboard): the panel below replaces it
	// while it is open, so the same entries are never on screen — or in the accessibility
	// tree — twice (see $isChipsHidden).
	chips: {
		display: 'none',
		[mq.small]: {
			display: 'flex',
			gap: space[1],
			padding: [[12, space[2]]],
			overflowX: 'auto',
			WebkitOverflowScrolling: 'touch',
			borderTop: [[1, color.border, 'solid']],
		},
	},
	chip: {
		flexShrink: 0,
		display: 'inline-flex',
		alignItems: 'center',
		fontWeight: fontWeight.normal,
		lineHeight: lineHeight.base,
		// The box of the chip, doubled for the same reason the sidebar rows are (see
		// ComponentsList/ComponentsListRenderer): a chip is a Link, and the
		// jss-plugin-isolate reset lists the Link class as `.link, .link:link,
		// .link:visited`, which outranks any single-class rule of ours. Left on the plain
		// rule these were dead — including the height, so the chips were nowhere near the
		// 44 px touch target the Mobile artboard specifies.
		'&&': {
			isolate: false,
			height: TOUCH_TARGET,
			padding: [[0, 12]],
			borderRadius,
			background: 'transparent',
			whiteSpace: 'nowrap',
			cursor: 'pointer',
		},
		// Doubled class: the four properties the Link component declares for the base
		// state (`&, &:link, &:visited`, one class + one pseudo-class) have to outrank it.
		// Everything else stays on the plain rule above, where a `styles` override —
		// which lodash-merges into the same rule — can still beat it.
		'&&, &&:link, &&:visited': {
			isolate: false,
			fontSize: 14,
			color: color.base,
			textDecoration: 'none',
			transition: `background-color ${transition.fast}, color ${transition.fast}`,
		},
		// The same quiet, colourless lift the sidebar rows use on hover
		'&&:hover': {
			isolate: false,
			color: color.base,
			background: color.baseBackground,
		},
		'&&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [
				[0, 0, 0, 1, color.link],
				[0, 0, 0, 3, color.focus],
			],
		},
	},
	isSelectedChip: {
		// The chip row's version of the sidebar's accent edge: a 1 px accent ring around
		// the tinted pill, which is what a left-hand rail turns into on a horizontal row.
		// An inset shadow rather than a border, so the chip keeps its width; $chip's own
		// focus ring outranks it (three classes against two) and still replaces it.
		'&&, &&:link, &&:visited, &&:hover': {
			isolate: false,
			color: color.link,
			fontWeight: fontWeight.bold,
			background: color.selectedBackground,
			boxShadow: [[0, 0, 0, 1, color.link, 'inset']],
		},
	},
	// Small screens: the chip row while the panel that replaces it is open. After $chips
	// in the sheet, so it wins inside the same media query at equal specificity.
	isChipsHidden: {
		[mq.small]: {
			display: 'none',
		},
	},
});

interface TableOfContentsRendererProps extends JssInjectedProps {
	children?: React.ReactNode;
	searchTerm: string;
	onSearchTermChange(term: string): void;
	/** False when the search term filtered every entry out */
	hasMatches?: boolean;
	/** The top-level entries, shown as a chip row on small screens */
	chips?: Rsg.TOCItem[];
}

export const TableOfContentsRenderer: React.FunctionComponent<TableOfContentsRendererProps> = ({
	classes,
	children,
	searchTerm,
	onSearchTermChange,
	hasMatches = true,
	chips = [],
}) => {
	const { isPanelOpen, closePanel } = useSidebar();

	// The chip row is a horizontal scroller, and its selection follows the reader's scroll
	// now (`scrollSync`, ADR 0015): on a phone the current chip drifted off the right edge
	// within the first screenful and nothing ever brought it back, leaving the reader with
	// no indication of where they were. Keyed on the slug, so it runs when the selection
	// moves rather than on every render of the row.
	const row = React.useRef<HTMLDivElement>(null);
	const currentChip = chips.find((chip) => chip.selected)?.slug;
	React.useEffect(() => {
		const chip = currentChip
			? row.current?.querySelector<HTMLElement>('[aria-current]')
			: undefined;
		if (chip) {
			keepInView(chip);
		}
	}, [currentChip]);

	return (
		<div>
			<div className={classes.root}>
				<nav className={classes.nav}>
					{chips.length > 0 && (
						<div
							ref={row}
							className={cx(classes.chips, { [classes.isChipsHidden]: isPanelOpen })}
							role="group"
							aria-label="Sections"
						>
							{chips.map((item) => (
								<Link
									key={item.slug}
									className={cx(classes.chip, { [classes.isSelectedChip]: item.selected })}
									href={item.href}
									target={item.shouldOpenInNewTab ? '_blank' : undefined}
									aria-current={item.selected ? 'true' : undefined}
									onClick={closePanel}
								>
									{item.visibleName}
								</Link>
							))}
						</div>
					)}
					<div
						id={SIDEBAR_PANEL_ID}
						className={cx(classes.panel, { [classes.isCollapsed]: !isPanelOpen })}
					>
						<div className={classes.search}>
							<div className={classes.field}>
								<FiSearch className={classes.icon} aria-hidden="true" />
								<input
									id={SIDEBAR_SEARCH_ID}
									value={searchTerm}
									className={classes.input}
									placeholder="Filter by name"
									aria-label="Filter by name"
									autoComplete="off"
									onChange={(event) => onSearchTermChange(event.target.value)}
								/>
							</div>
							<div className={classes.noMatch} aria-live="polite">
								{searchTerm && !hasMatches ? `No component matches “${searchTerm}”.` : null}
							</div>
						</div>
						{children}
					</div>
				</nav>
			</div>
		</div>
	);
};

TableOfContentsRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any,
	searchTerm: PropTypes.string.isRequired,
	onSearchTermChange: PropTypes.func.isRequired,
	hasMatches: PropTypes.bool,
	chips: PropTypes.array,
};

export default Styled<TableOfContentsRendererProps>(styles)(TableOfContentsRenderer);
