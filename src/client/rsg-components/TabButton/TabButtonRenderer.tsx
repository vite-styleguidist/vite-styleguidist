import React from 'react';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import cx from 'clsx';
import type * as Rsg from '../../../typings/index.js';

// A tab label (“View Code”, “Props & methods”): 13 / 600 sentence-case text with a 2 px
// underline in the link colour when active (Main artboard). The underline is always drawn,
// transparent while inactive, so switching tabs does not change the row’s height.
//
// One size for both rows on purpose: the example row (Playground) and the component header row
// (ReactComponent) share these 13 px / 6 px-padding buttons, and only their gap differs (16 vs
// 20, set by the two parents). The artboard draws the header tabs a notch larger (14 px,
// 8/10 padding); a `size` prop set by UsageTabButton would be the way to add that later, but it
// buys a second visual variant of the same control, so the smaller pair ships as is.
export const styles = ({
	space,
	color,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	borderRadius,
	buttonTextTransform,
	transition,
	mq,
}: Rsg.Theme): Styles => ({
	button: {
		padding: [[6, 0]],
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.base,
		color: color.light,
		background: 'transparent',
		textTransform: buttonTextTransform,
		transition: `color ${transition.slow}, border-color ${transition.slow}`,
		border: 'none',
		borderBottom: [[2, 'transparent', 'solid']],
		cursor: 'pointer',
		'&:hover, &:focus': {
			isolate: false,
			color: color.base,
			transition: `color ${transition.fast}, border-color ${transition.fast}`,
		},
		// Keyboard focus ring shared with the rest of the UI (Editor, links): a translucent halo
		// instead of the browser outline; the halo follows the page radius
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			borderRadius,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
		// 44 px touch targets on small screens (Mobile artboard)
		[mq.small]: {
			minHeight: 44,
		},
	},
	isActive: {
		color: color.link,
		borderBottomColor: color.link,
		'&:hover, &:focus': {
			isolate: false,
			color: color.linkHover,
		},
	},
});

interface TabButtonProps extends JssInjectedProps {
	className?: string;
	name: string;
	onClick: (e: React.MouseEvent) => void;
	active?: boolean;
	children: React.ReactNode;
}

export const TabButtonRenderer: React.FunctionComponent<TabButtonProps> = ({
	classes,
	name,
	className,
	onClick,
	active = false,
	children,
}) => {
	const classNames = cx(classes.button, className, {
		[classes.isActive]: active,
	});

	return (
		<button
			type="button"
			name={name}
			className={classNames}
			onClick={onClick}
			aria-pressed={active}
		>
			{children}
		</button>
	);
};

export default Styled<TabButtonProps>(styles)(TabButtonRenderer);
