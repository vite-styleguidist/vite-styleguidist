import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Link from 'rsg-components/Link';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { useStyleGuideContext } from 'rsg-components/Context';
import { useSidebar } from 'rsg-components/StyleGuide/SidebarContext';
import type * as Rsg from '../../../typings/index.js';

// Exported for the specs that assert the override contract of the doubled-class rules
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
	list: {
		display: 'flex',
		flexDirection: 'column',
		// 4 px between rows: the rows are inset pills now (see $link), and at 2 px they
		// read as one block instead of as separate menu items
		gap: space[0],
		margin: 0,
		padding: [[space[1], 12, space[2]]],
		listStyle: 'none',
		// A section's own entries sit flush under its label (Main artboard); only
		// deeper levels indent
		'& &': {
			isolate: false,
			padding: 0,
		},
		'& & &': {
			isolate: false,
			paddingLeft: space[2],
		},
	},
	item: {
		display: 'block',
		margin: 0,
		color: color.base,
		fontFamily: fontFamily.base,
		fontSize: fontSize.base,
		lineHeight: lineHeight.base,
		listStyle: 'none',
	},
	// Kept for `styles` overrides: leaf items used to render inline on small screens,
	// which the chip row in TableOfContents replaces
	isChild: {},
	// Marker on the item whose link is the current route (see $link)
	isSelected: {},
	link: {
		display: 'block',
		textOverflow: 'ellipsis',
		// The box of the row. Doubled class for a reason of its own, and the reason every
		// declaration in here has to sit at this specificity: the element is a Link, so it
		// also carries the Link component's class, and the jss-plugin-isolate reset lists
		// that class as `.link, .link:link, .link:visited` — one class plus a pseudo-class,
		// which outranks any single-class rule of ours no matter which sheet comes first.
		// Everything the reset touches (padding, border-radius, overflow, white-space,
		// cursor, position, background) is therefore dead on the plain rule above: before
		// 1.0 the rows really had no padding, no radius, no ellipsis and no pointer cursor,
		// which is what made the sidebar look cramped. A `styles` override of one of these
		// has to use the same doubled selector (`link: { '&&': { padding: 0 } }`); the
		// plain rule stays the place for everything else.
		'&&': {
			isolate: false,
			// An inset pill with room to breathe, not a full-bleed row: 8 above and below
			// inside the list's own 12 px gutter, so the row never touches the sidebar edge.
			// The extra 2 px on the left is the room the selected row's accent edge needs.
			padding: [[space[1], 10, space[1], 12]],
			borderRadius,
			background: 'transparent',
			overflow: 'hidden',
			whiteSpace: 'nowrap',
			cursor: 'pointer',
			// The containing block of the accent edge below, which would otherwise escape to
			// the fixed sidebar and paint a bar down the whole viewport
			position: 'relative',
		},
		// Doubled class: only the properties the Link component declares for the base
		// state (`&, &:link, &:visited`, one class + one pseudo-class) need to outrank it,
		// whichever sheet is attached later. The rest stays on the plain rule above, so a
		// `styles` override — which lodash-merges into the same rule — still wins.
		'&&, &&:link, &&:visited': {
			isolate: false,
			color: color.base,
			textDecoration: 'none',
			transition: `background-color ${transition.fast}, color ${transition.fast}`,
		},
		// Hover is a quiet, colourless lift to the page surface (lighter than the sidebar
		// in the light scheme, darker in the dark one). Keeping the accent tint for the
		// selected row alone is what tells the two states apart at a glance: a hovered
		// row changes surface, the current one carries the colour.
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
		'$isSelected > &&, $isSelected > &&:link, $isSelected > &&:visited, $isSelected > &&:hover': {
			isolate: false,
			color: color.link,
			fontWeight: fontWeight.bold,
			background: color.selectedBackground,
		},
		// The accent edge of the current row: a 3 px bar down its left side, radius-matched
		// to the pill. It is what makes the selection read as a menu item rather than as a
		// coloured container, and it survives a `theme.color.selectedBackground` override
		// that flattens the tint. A pseudo-element, not an inset box-shadow, so that the
		// focus ring above (also a box-shadow, and lower in the cascade) keeps working on
		// the selected row.
		'$isSelected > &&::before': {
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
	// The link of a section that has children: a small uppercase group label
	heading: {
		// Doubled, and after $link's own doubled rule in the sheet, so these beat both the
		// isolate reset (which flattens padding, letter-spacing, text-transform and the
		// font shorthand — the group labels were neither uppercase nor tracked before 1.0)
		// and $link's row box. See the comment on $link for the whole story.
		'&&': {
			isolate: false,
			// Aligned with the row labels (12 px, as $link) and given air above, so a group
			// reads as a section label over its rows rather than as another menu item.
			padding: [[14, 10, space[0], 12]],
			fontWeight: fontWeight.bold,
			letterSpacing: '0.06em',
			textTransform: 'uppercase',
			background: 'transparent',
			cursor: 'pointer',
		},
		// Doubled class, as for $link: the size and colour have to outrank Link's own
		// base-state rule (which sets `font-size: inherit` and the link colour)
		'&&, &&:link, &&:visited': {
			isolate: false,
			fontSize: 11,
			color: color.light,
		},
		// No surface on hover: a label is not a button. The colour lift and the underline
		// are the whole affordance for the sections whose label is itself a link.
		'&&:hover': {
			isolate: false,
			color: color.base,
			background: 'transparent',
			textDecoration: 'underline',
		},
		// A group opens further from what precedes it than its own rows are from each
		// other (18 + the list's 4 px gap); the first label keeps 14
		'$item + $item > &&': {
			isolate: false,
			paddingTop: 18,
		},
	},
});

interface ComponentsListRendererProps extends JssInjectedProps {
	items: Rsg.TOCItem[];
}

const ComponentsListSectionRenderer: React.FunctionComponent<Rsg.TOCItem & JssInjectedProps> = ({
	classes,
	heading,
	visibleName,
	href,
	content,
	shouldOpenInNewTab,
	selected,
	initialOpen,
	forcedOpen,
}) => {
	const {
		config: { tocMode },
	} = useStyleGuideContext();
	const { closePanel } = useSidebar();

	// Hooks must be called unconditionally; sections only collapse in `tocMode: 'collapse'`
	const [isOpen, setOpen] = React.useState(!!initialOpen);
	const open = tocMode !== 'collapse' || isOpen;
	return (
		<li
			className={cx(classes.item, {
				[classes.isChild]: !content && !shouldOpenInNewTab,
				[classes.isSelected]: selected,
			})}
			key={href}
		>
			<Link
				className={cx(classes.link, heading && classes.heading)}
				href={href}
				onClick={() => {
					setOpen(!open);
					// Small screens: following a link closes the panel that holds the list
					closePanel();
				}}
				target={shouldOpenInNewTab ? '_blank' : undefined}
				aria-current={selected ? 'true' : undefined}
				data-testid="rsg-toc-link"
			>
				{visibleName}
			</Link>
			{open || forcedOpen ? content : null}
		</li>
	);
};

export const ComponentsListRenderer: React.FunctionComponent<ComponentsListRendererProps> = ({
	classes,
	items,
}) => {
	return (
		<ul className={classes.list}>
			{items.map((item) => (
				<ComponentsListSectionRenderer key={item.slug} classes={classes} {...item} />
			))}
		</ul>
	);
};

ComponentsListRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	items: PropTypes.array.isRequired,
};

export default Styled<ComponentsListRendererProps>(styles)(ComponentsListRenderer);
