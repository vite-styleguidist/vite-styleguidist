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
		gap: 2,
		margin: 0,
		padding: [[space[1], 12]],
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
		padding: [[6, space[1]]],
		borderRadius,
		background: 'transparent',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
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
		// Hover uses the selection surface too; the selected item is told apart by its
		// colour and weight
		'&&:hover': {
			isolate: false,
			color: color.base,
			background: color.selectedBackground,
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
	},
	// The link of a section that has children: a small uppercase group label
	heading: {
		// After $link in the sheet, so these beat $link's own plain declarations
		padding: [[10, space[1], space[0]]],
		fontWeight: fontWeight.bold,
		letterSpacing: '0.06em',
		textTransform: 'uppercase',
		background: 'transparent',
		// Doubled class, as for $link: the size and colour have to outrank Link's own
		// base-state rule (which sets `font-size: inherit` and the link colour)
		'&&, &&:link, &&:visited': {
			isolate: false,
			fontSize: 11,
			color: color.light,
		},
		'&&:hover': {
			isolate: false,
			color: color.base,
			background: 'transparent',
		},
		// 14 px between a group and whatever precedes it (the first label keeps 10)
		'$item + $item > &&': {
			isolate: false,
			paddingTop: 14,
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
