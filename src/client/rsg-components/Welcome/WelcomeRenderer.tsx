import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { DOCS_COMPONENTS } from '../../../scripts/consts.js';
import type * as Rsg from '../../../typings/index.js';

/*
 * Shown instead of the style guide when the `components` patterns match nothing, so like
 * ErrorRenderer it paints its own page: StyleGuideRenderer, which normally provides the
 * background, is not on screen. The card is the empty-state treatment of the States
 * artboard; NotFoundRenderer draws the same card for a missing page, keep the two in step.
 */
const styles = ({
	color,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	space,
	borderRadius,
	mq,
	transition,
}: Rsg.Theme) => ({
	root: {
		boxSizing: 'border-box',
		minHeight: '100vh',
		padding: space[4],
		backgroundColor: color.baseBackground,
		color: color.base,
		fontFamily: fontFamily.base,
		[mq.small]: {
			padding: space[2],
		},
	},
	card: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 12,
		// Narrower than the content column (maxWidth): an empty state is a notice, not a page
		maxWidth: 560,
		margin: [[space[5], 'auto']],
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
	patterns: {
		margin: 0,
		padding: 0,
		listStyle: 'none',
	},
	code: {
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		color: color.base,
	},
	// A link dressed as the one call to action: accent surface, page-background text, so it
	// keeps its contrast in both schemes (teal on cream, light teal on near-black)
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
		// The focus ring of the rest of the UI; the border colour part is moot on a filled
		// button, the halo does the work. Replaces the outline, never just removes it.
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
});

interface WelcomeProps extends JssInjectedProps {
	patterns: string[];
}

export const WelcomeRenderer: React.FunctionComponent<WelcomeProps> = ({ classes, patterns }) => {
	// The list can be empty: getComponentPatternsFromSections() only collects array-valued
	// `components`, so a plain string pattern (the common case) arrives as no patterns at all
	const hasPatterns = patterns.length > 0;
	return (
		<div className={classes.root}>
			<div className={classes.card}>
				<h1 className={classes.title}>No components found yet</h1>
				<p className={classes.text}>
					{hasPatterns
						? 'Vite Styleguidist looked for components matching these patterns and found none:'
						: 'Vite Styleguidist looked for components in your project and found none.'}
				</p>
				{hasPatterns && (
					<ul className={classes.patterns}>
						{patterns.map((pattern) => (
							<li key={pattern}>
								<code className={classes.code}>{pattern}</code>
							</li>
						))}
					</ul>
				)}
				<p className={classes.text}>
					Point it at yours with the <code className={classes.code}>components</code> option in{' '}
					<code className={classes.code}>styleguide.config.js</code>.
				</p>
				<a className={classes.button} href={DOCS_COMPONENTS}>
					Read the guide
				</a>
			</div>
		</div>
	);
};

WelcomeRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	patterns: PropTypes.array.isRequired,
};

export default Styled<WelcomeProps>(styles)(WelcomeRenderer);
