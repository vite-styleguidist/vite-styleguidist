import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Link from 'rsg-components/Link';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { useStyleGuideContext } from 'rsg-components/Context';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ color, fontFamily, fontSize, space, mq }: Rsg.Theme) => ({
	list: {
		margin: 0,
		paddingLeft: space[2],
	},
	item: {
		color: color.base,
		display: 'block',
		margin: [[space[1], 0, space[1], 0]],
		fontFamily: fontFamily.base,
		fontSize: fontSize.base,
		listStyle: 'none',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
	},
	isChild: {
		[mq.small]: {
			display: 'inline-block',
			margin: [[0, space[1], 0, 0]],
		},
	},
	heading: {
		color: color.base,
		marginTop: space[1],
		fontFamily: fontFamily.base,
		fontWeight: 'bold',
	},
	isSelected: {
		fontWeight: 'bold',
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
				className={cx(heading && classes.heading)}
				href={href}
				onClick={() => setOpen(!open)}
				target={shouldOpenInNewTab ? '_blank' : undefined}
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
