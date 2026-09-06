import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { BUGS } from '../../../scripts/consts.js';
import type * as Rsg from '../../../typings/index.js';

/*
 * The top-level error boundary (StyleGuide.tsx) renders this instead of the whole style
 * guide, so it paints its own page: StyleGuideRenderer, which normally provides the
 * background, is not on screen. It also uses no other rsg component (Link, Markdown) on
 * purpose: the crash it reports may have come from one of those.
 */
const styles = ({
	color,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	space,
	borderRadius,
	maxWidth,
	transition,
}: Rsg.Theme) => ({
	// The page: background and text colour, so the screen reads in both colour schemes
	root: {
		boxSizing: 'border-box',
		minHeight: '100vh',
		padding: space[2],
		backgroundColor: color.baseBackground,
		color: color.base,
		fontFamily: fontFamily.base,
	},
	// The card of the States artboard: 20 px padding, 10 px between title, text and stack
	card: {
		display: 'flex',
		flexDirection: 'column',
		gap: 10,
		maxWidth,
		margin: [[0, 'auto']],
		padding: 20,
		border: [[1, color.border, 'solid']],
		borderRadius,
		backgroundColor: color.baseBackground,
	},
	// The alert region around the title and the explanation. It replaces the card as the flex
	// item that used to hold those two, so it keeps the card’s own 10 px rhythm between them.
	announcement: {
		display: 'flex',
		flexDirection: 'column',
		gap: 10,
	},
	title: {
		margin: 0,
		fontSize: fontSize.h4,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.heading,
		color: color.base,
	},
	message: {
		margin: 0,
		// 14 px is the design’s size for card copy and button labels; no token carries it yet
		fontSize: 14,
		lineHeight: lineHeight.base,
		color: color.base,
	},
	link: {
		color: color.link,
		textDecoration: 'none',
		// Rounds the focus halo, which a text link draws around its own box
		borderRadius: 2,
		transition: `color ${transition.fast}`,
		'&:hover, &:active': {
			isolate: false,
			color: color.linkHover,
			textDecoration: 'underline',
		},
		// The focus ring of the rest of the UI (link border colour plus a translucent halo);
		// a text link has no border, so only the halo shows. Replaces the outline, never
		// just removes it.
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
	stack: {
		margin: 0,
		padding: 12,
		borderRadius,
		backgroundColor: color.codeBackground,
		fontFamily: fontFamily.monospace,
		// 12 px is a notch below `fontSize.small`: the stack is reference material, not copy
		fontSize: 12,
		lineHeight: lineHeight.code,
		color: color.error,
		whiteSpace: 'pre-wrap',
		// Stack frames carry long unbroken paths and URLs; let them wrap on narrow screens
		overflowWrap: 'anywhere',
	},
});

interface ErrorProps extends JssInjectedProps {
	error: any;
	info: React.ErrorInfo;
}

export const ErrorRenderer: React.FunctionComponent<ErrorProps> = ({ classes, error, info }) => {
	return (
		<div className={classes.root}>
			<div className={classes.card}>
				{/*
				 * The alert covers the title and the explanation only. It used to be the whole
				 * card, so a screen reader read every stack frame as one assertive announcement
				 * that cannot be paused per line; the stack stays outside it, readable on demand.
				 */}
				<div className={classes.announcement} role="alert">
					<h1 className={classes.title}>Something went wrong</h1>
					<p className={classes.message}>
						This may be due to an error in a component you are overriding, or a bug in Vite
						Styleguidist. If you believe this is a bug,{' '}
						<a className={classes.link} href={BUGS}>
							please submit an issue
						</a>
						.
					</p>
				</div>
				<pre className={classes.stack}>
					{error.toString()}
					{info.componentStack}
				</pre>
			</div>
		</div>
	);
};

ErrorRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	error: PropTypes.object.isRequired,
	info: PropTypes.any.isRequired,
};

export default Styled<ErrorProps>(styles)(ErrorRenderer);
