import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type { PageNavHeading } from 'rsg-components/PageNav/PageNav';
import type * as Rsg from '../../../typings/index.js';

/**
 * The two shapes of the same list (ADR 0016). Both are one `<nav aria-label="On this
 * page">` with one link per heading; what changes is the frame around them.
 *
 * The rail carries no box of its own — it sits in the page's own whitespace beside the
 * content column, and the accent edge on the current entry is the only chrome, exactly as
 * in the sidebar. The collapsible block does need a box: it sits *inside* the reading
 * column, above the content, where an unframed list would read as part of the page.
 *
 * Colours are the tokens the contrast guard already covers (`light`, `base` and `link` on
 * `baseBackground`, `base` on `selectedBackground`), so both schemes are AA without a new
 * pair; `theme.color.*` values are `var(--rsg-color-…)` expressions, which is what makes
 * the rail follow the colour scheme at all (ADR 0011).
 */
export const styles = ({
	color,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	space,
	borderRadius,
	transition,
}: Rsg.Theme): Styles => ({
	root: {
		fontFamily: fontFamily.base,
	},
	// Marker: the collapsible presentation, below `mq.large` (see $summary, $list)
	isCollapsible: {
		border: [[1, color.border, 'solid']],
		borderRadius,
	},
	// The rail's label. A plain element, not a heading: the page outline belongs to the
	// content, and PageNav must not add an entry to the list it is itself describing.
	title: {
		display: 'block',
		// Aligned with the entry labels below (their 12 px is the room the accent edge needs)
		padding: [[0, space[1], space[0], 12]],
		color: color.light,
		fontSize: 11,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.heading,
		letterSpacing: '0.06em',
		textTransform: 'uppercase',
	},
	// The `<details>` element needs a rule of its own even though it has nothing to declare:
	// a rule is what puts the jss-plugin-isolate reset in front of the element, and without
	// it the page's own CSS reaches inside the style guide. The sections example paints every
	// bare tag magenta on purpose to catch exactly this.
	details: {
		margin: 0,
	},
	// The same label as a `<summary>`: a control, so it gets the pointer and a focus ring.
	// The disclosure triangle is the browser's own marker, but the isolate reset flattens
	// `list-style` to a bullet, so both states are named here.
	summary: {
		display: 'list-item',
		// `inside`, so the marker sits inside the box instead of hanging off its border
		listStyle: [['disclosure-closed', 'inside']],
		padding: [[space[1], space[2]]],
		color: color.light,
		fontSize: 11,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.heading,
		letterSpacing: '0.06em',
		textTransform: 'uppercase',
		cursor: 'pointer',
		'&:hover': {
			isolate: false,
			color: color.base,
		},
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			borderRadius,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
		'$details[open] > &': {
			isolate: false,
			listStyleType: 'disclosure-open',
		},
	},
	list: {
		display: 'flex',
		flexDirection: 'column',
		gap: space[0],
		margin: 0,
		padding: 0,
		listStyle: 'none',
		// Inside the box, the list keeps clear of the border and of the summary above it
		'$isCollapsible &': {
			isolate: false,
			padding: [[0, space[1], space[1]]],
		},
	},
	item: {
		display: 'block',
		margin: 0,
		listStyle: 'none',
	},
	// h3 entries, indented under the h2 they belong to
	isChild: {
		paddingLeft: space[2],
	},
	// Marker on the item whose heading the reader is looking at (see $link)
	isSelected: {},
	link: {
		display: 'block',
		// The containing block of the accent edge below
		position: 'relative',
		// 12 on the left is the room the accent edge needs, as in the sidebar rows
		padding: [[space[0], space[1], space[0], 12]],
		borderRadius,
		color: color.light,
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
		textDecoration: 'none',
		cursor: 'pointer',
		// A heading is a sentence, not a word: wrapping keeps it readable in a 168 px column,
		// where an ellipsis would hide exactly the part that tells two headings apart
		overflowWrap: 'anywhere',
		transition: `color ${transition.fast}, background-color ${transition.fast}`,
		// The UA sheet colours `:link`/`:visited` at a higher specificity than a class
		'&:link, &:visited': {
			isolate: false,
			color: color.light,
		},
		'&:hover': {
			isolate: false,
			color: color.base,
			background: color.selectedBackground,
			textDecoration: 'none',
		},
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
		// The current entry: the accent colour and the weight, on no surface of its own, so
		// that a hovered entry (which does take a surface) still reads as “not this one”
		'$isSelected > &, $isSelected > &:link, $isSelected > &:visited, $isSelected > &:hover': {
			isolate: false,
			color: color.link,
			fontWeight: fontWeight.bold,
		},
		// The 3 px accent edge of the sidebar's selected row, so that the two navigations
		// mark “where you are” the same way. A pseudo-element, not an inset shadow, so the
		// focus ring above keeps working on the current entry.
		'$isSelected > &::before': {
			isolate: false,
			content: '""',
			position: 'absolute',
			top: 0,
			bottom: 0,
			left: 0,
			width: 3,
			borderRadius: [[borderRadius, 0, 0, borderRadius]],
			background: color.link,
		},
	},
});

export interface PageNavRendererProps extends JssInjectedProps {
	/** The headings of the page, in document order; see PageNav for how they are collected. */
	headings: PageNavHeading[];
	/** The id of the heading the reader is looking at, from `useScrollSpy`. */
	activeId?: string;
	/** Label of the list, and the accessible name of the `<nav>`. */
	title: string;
	/** Whether to render the collapsible block instead of the rail (below `theme.mq.large`). */
	collapsible?: boolean;
	/**
	 * Click handler for each entry’s link. PageNav supplies one that makes a repeat click on
	 * the entry the reader is already on scroll back to its heading — a click that does not
	 * change the address fires no `hashchange`, and nothing else scrolls these links. A
	 * renderer that leaves it out simply loses that.
	 */
	onHeadingClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const PageNavRenderer: React.FunctionComponent<PageNavRendererProps> = ({
	classes,
	headings,
	activeId,
	title,
	collapsible,
	onHeadingClick,
}) => {
	const list = (
		<ul className={classes.list}>
			{headings.map((heading) => {
				const selected = heading.id === activeId;
				return (
					<li
						key={heading.id}
						className={cx(classes.item, {
							[classes.isChild]: heading.level > 2,
							[classes.isSelected]: selected,
						})}
					>
						<a
							className={classes.link}
							href={heading.href}
							// “location”, not “true”: the entry points at a place in the current page,
							// which is what this value means (the sidebar's `true` marks the current page)
							aria-current={selected ? 'location' : undefined}
							onClick={onHeadingClick}
							data-testid="rsg-pagenav-link"
						>
							{heading.text}
						</a>
					</li>
				);
			})}
		</ul>
	);

	if (collapsible) {
		return (
			<nav
				className={cx(classes.root, classes.isCollapsible)}
				aria-label={title}
				data-testid="rsg-pagenav"
			>
				{/* Uncontrolled and closed by default: it is a shortcut above the content, and a
				    list that opened itself would push the page down on every navigation */}
				<details className={classes.details}>
					<summary className={classes.summary} data-testid="rsg-pagenav-summary">
						{title}
					</summary>
					{list}
				</details>
			</nav>
		);
	}

	return (
		<nav className={classes.root} aria-label={title} data-testid="rsg-pagenav">
			<span className={classes.title}>{title}</span>
			{list}
		</nav>
	);
};

PageNavRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	headings: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string.isRequired,
			text: PropTypes.string.isRequired,
			level: PropTypes.number.isRequired,
			href: PropTypes.string.isRequired,
		}).isRequired
	).isRequired as any,
	activeId: PropTypes.string,
	title: PropTypes.string.isRequired,
	collapsible: PropTypes.bool,
	onHeadingClick: PropTypes.func,
};

export default Styled<PageNavRendererProps>(styles)(PageNavRenderer);
