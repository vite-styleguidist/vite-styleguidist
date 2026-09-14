import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

/*
 * Shown inside the regular layout when the URL hash names a section or component that
 * does not exist. Same empty-state card as WelcomeRenderer (States artboard); keep the
 * two in step.
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
	mq,
	transition,
}: Rsg.Theme) => ({
	root: {
		maxWidth,
		margin: [[0, 'auto']],
		// Nothing above sets a font: the layout leaves that to Markdown, which this card no longer uses
		fontFamily: fontFamily.base,
	},
	card: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 12,
		// Narrower than the content column (maxWidth): an empty state is a notice, not a page
		maxWidth: 560,
		margin: [[space[4], 'auto']],
		padding: space[4],
		border: [[1, color.border, 'dashed']],
		borderRadius,
		textAlign: 'center',
		[mq.small]: {
			margin: [[space[2], 'auto']],
			padding: space[3],
		},
	},
	title: {
		margin: 0,
		fontSize: fontSize.h3,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.heading,
		color: color.base,
	},
	text: {
		maxWidth: 380,
		margin: 0,
		fontSize: fontSize.base,
		lineHeight: lineHeight.base,
		color: color.light,
	},
	// Same call-to-action button as WelcomeRenderer
	button: {
		display: 'inline-flex',
		alignItems: 'center',
		height: 36,
		// A string, not JSS’s `[[0, space[2]]]` array: the jss typings accept either arrays or
		// nested rules with `isolate` in one rule, not both
		padding: `0 ${space[2]}px`,
		borderRadius,
		backgroundColor: color.link,
		color: color.baseBackground,
		fontSize: 14,
		fontWeight: fontWeight.bold,
		lineHeight: 1,
		textDecoration: 'none',
		transition: `background-color ${transition.fast}, box-shadow ${transition.fast}`,
		'&:hover, &:active': {
			isolate: false,
			backgroundColor: color.linkHover,
			color: color.baseBackground,
			textDecoration: 'none',
		},
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
});

export const NotFoundRenderer: React.FunctionComponent<JssInjectedProps> = ({ classes }) => {
	return (
		<div className={classes.root}>
			<div className={classes.card}>
				<h1 className={classes.title}>Page not found</h1>
				<p className={classes.text}>
					The link you followed may be broken, or the page may have been removed.
				</p>
				{/* `#/` is the root of the hash router: every section, or the first page in
				    pagePerSection mode (getRouteData.ts) */}
				<a className={classes.button} href="#/">
					Go to the start page
				</a>
			</div>
		</div>
	);
};

NotFoundRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
};

export default Styled(styles)(NotFoundRenderer);
