import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import cx from 'clsx';
import { Styles } from 'jss';
import type * as Rsg from '../../../typings/index.js';

// A quiet icon button, optionally with a text label next to the icon (“Open isolated” in the
// example toolbar, Main artboard): 13 px `light` text that turns `link` on hover, the shared
// focus halo on keyboard focus, and a 44 px tall target on small screens.
export const styles = ({
	space,
	color,
	fontFamily,
	fontSize,
	lineHeight,
	borderRadius,
	transition,
	mq,
}: Rsg.Theme): Styles => ({
	button: {
		display: 'inline-flex',
		alignItems: 'center',
		gap: 6,
		padding: 2, // Increase clickable area a bit
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
		color: color.light,
		background: 'transparent',
		textDecoration: 'none',
		borderRadius,
		transition: `color ${transition.slow}`,
		cursor: 'pointer',
		'&:hover, &:focus': {
			isolate: false,
			color: color.link,
			transition: `color ${transition.fast}`,
		},
		// Keyboard focus ring shared with the rest of the UI (TabButton, Editor)
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
		'& + &': {
			isolate: false,
			marginLeft: space[1],
		},
		// Style react-icons icon passed as children
		'& svg': {
			width: space[2],
			height: space[2],
			flexShrink: 0,
			color: 'currentColor',
			cursor: 'inherit',
		},
		// 44 px touch targets on small screens (Mobile artboard)
		[mq.small]: {
			minHeight: 44,
		},
	},
	isSmall: {
		'& svg': {
			width: 14,
			height: 14,
		},
	},
	// The visible text next to the icon; exposed so `styles.ToolbarButton.label` can hide or
	// restyle it
	label: {
		whiteSpace: 'nowrap',
	},
});

interface ToolbarButtonProps extends JssInjectedProps {
	children: React.ReactNode;
	className?: string;
	href?: string;
	onClick?: () => void;
	title?: string;
	/** Visible text rendered after the icon; the accessible name stays `title` */
	label?: string;
	small?: boolean;
	testId?: string;
}

export const ToolbarButtonRenderer: React.FunctionComponent<ToolbarButtonProps> = ({
	classes,
	className,
	onClick,
	href,
	title,
	label,
	small,
	testId,
	children,
}) => {
	const classNames = cx(classes.button, className, {
		[classes.isSmall]: small,
	});
	const content = (
		<>
			{children}
			{label && <span className={classes.label}>{label}</span>}
		</>
	);

	if (href !== undefined) {
		return (
			<a href={href} title={title} className={classNames} aria-label={title} data-testid={testId}>
				{content}
			</a>
		);
	}

	return (
		<button type="button" onClick={onClick} title={title} className={classNames} aria-label={title}>
			{content}
		</button>
	);
};

ToolbarButtonRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	className: PropTypes.string,
	href: PropTypes.string,
	onClick: PropTypes.func,
	title: PropTypes.string,
	label: PropTypes.string,
	small: PropTypes.bool,
	testId: PropTypes.string,
	children: PropTypes.any,
};

export default Styled<ToolbarButtonProps>(styles)(ToolbarButtonRenderer);
