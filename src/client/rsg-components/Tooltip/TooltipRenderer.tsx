import React from 'react';
import Tippy from '@tippyjs/react';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

export const styles = ({ space, color, borderRadius, fontSize, shadow }: Rsg.Theme) => ({
	tooltip: {
		'&.tippy-box': {
			transitionProperty: [['opacity']],
			'&[data-state="hidden"]': {
				opacity: 0,
			},
		},
		'& .tippy-content': {
			padding: space[0],
			border: `1px ${color.border} solid`,
			borderRadius,
			background: color.baseBackground,
			boxShadow: shadow.tooltip,
			fontSize: fontSize.small,
			color: color.type,
		},
	},
});

export type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps extends JssInjectedProps {
	children: React.ReactNode;
	content: React.ReactNode;
	placement?: TooltipPlacement;
}

function TooltipRenderer({ classes, children, content, placement = 'top' }: TooltipProps) {
	return (
		<Tippy
			content={content}
			className={classes.tooltip}
			interactive
			placement={placement}
			trigger="click mouseenter focus"
			arrow={false}
		>
			<span role="button" tabIndex={0}>
				{children}
			</span>
		</Tippy>
	);
}

export default Styled<TooltipProps>(styles)(TooltipRenderer);
