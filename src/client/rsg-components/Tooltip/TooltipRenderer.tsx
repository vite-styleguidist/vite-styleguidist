import React from 'react';
import Tippy from '@tippyjs/react';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import type * as Rsg from '../../../typings/index.js';

/*
 * A small high-contrast pill: text colour and page background swapped, so it reads on
 * either colour scheme without a border. 12 px / 1.3 and the 6 / 10 padding come from
 * the artboard and have no token. The width cap is a Tippy prop rather than a rule
 * because Tippy sets `max-width` inline on the box.
 */
const MAX_WIDTH = 320;

export const styles = ({ color, borderRadius, shadow, fontFamily }: Rsg.Theme): Styles => ({
	tooltip: {
		'&.tippy-box': {
			transitionProperty: [['opacity']],
			'&[data-state="hidden"]': {
				opacity: 0,
			},
		},
		'& .tippy-content': {
			padding: [[6, 10]],
			borderRadius,
			background: color.base,
			color: color.baseBackground,
			boxShadow: shadow.tooltip,
			fontFamily: fontFamily.base,
			fontSize: 12,
			lineHeight: 1.3,
		},
	},
	// The focusable wrapper around the trigger: the shared focus ring instead of the
	// browser outline, which on an inline span hugs the glyphs
	trigger: {
		'&:focus-visible': {
			// Without this the isolate plugin adds the focused trigger to its reset rule,
			// where a pseudo-class beats the trigger's own class and strips it on focus
			isolate: false,
			outline: 'none',
			borderRadius,
			boxShadow: [[0, 0, 0, 3, color.focus]],
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
			maxWidth={MAX_WIDTH}
		>
			<span role="button" tabIndex={0} className={classes.trigger}>
				{children}
			</span>
		</Tippy>
	);
}

export default Styled<TooltipProps>(styles)(TooltipRenderer);
