import React from 'react';
import PropTypes from 'prop-types';
import { FiExternalLink } from 'react-icons/fi';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

export const styles = ({
	color,
	space,
	fontSize,
	fontFamily,
	lineHeight,
	borderRadius,
	transition,
}: Rsg.Theme): Styles => ({
	// The corner pill: shown when there is no sidebar (isolated views, `showSidebar: false`)
	root: {
		position: 'fixed',
		top: space[2],
		right: space[2],
		zIndex: 999,
	},
	link: {
		display: 'inline-flex',
		alignItems: 'center',
		gap: 6,
		padding: [[space[0], 10]],
		borderRadius,
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
		color: color.ribbonText,
		background: color.ribbonBackground,
		textDecoration: 'none',
		cursor: 'pointer',
		transition: `background-color ${transition.fast}`,
		'&:hover': {
			isolate: false,
			color: color.ribbonText,
			background: color.linkHover,
		},
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
	// The sidebar-footer variant: a quiet text link next to the theme toggle
	inlineLink: {
		display: 'inline-flex',
		alignItems: 'center',
		gap: 6,
		maxWidth: '100%',
		borderRadius,
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
		color: color.light,
		textDecoration: 'none',
		cursor: 'pointer',
		transition: `color ${transition.fast}`,
		'&:hover': {
			isolate: false,
			color: color.link,
		},
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
	text: {
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	},
	icon: {
		flexShrink: 0,
		width: 14,
		height: 14,
	},
});

interface RibbonProps extends JssInjectedProps {
	url: string;
	text?: string;
	inline?: boolean;
}

export const RibbonRenderer: React.FunctionComponent<RibbonProps> = ({
	classes,
	url,
	text = 'GitHub',
	inline,
}) => {
	const content = (
		<>
			<FiExternalLink className={classes.icon} aria-hidden="true" />
			<span className={classes.text}>{text}</span>
		</>
	);
	if (inline) {
		return (
			<a href={url} className={classes.inlineLink}>
				{content}
			</a>
		);
	}
	return (
		<div className={classes.root}>
			<a href={url} className={classes.link}>
				{content}
			</a>
		</div>
	);
};

RibbonRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	url: PropTypes.string.isRequired,
	text: PropTypes.string,
	inline: PropTypes.bool,
};

export default Styled<RibbonProps>(styles)(RibbonRenderer);
