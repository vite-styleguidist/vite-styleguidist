import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

/**
 * The 1.0 type scale: every level is set in the heading weight (600) on a tight line
 * height; the levels differ by size only. Margins are deliberately not set here: the
 * component header, section titles and Markdown headings each own their spacing
 * (see MarkdownHeadingRenderer for the prose case).
 */
const styles = ({ color, fontFamily, fontSize, fontWeight, lineHeight, mq }: Rsg.Theme) => ({
	heading: {
		margin: 0,
		color: color.base,
		fontFamily: fontFamily.base,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.heading,
		// Inline code (Code sets the fixed 13px prose size) scales with the heading
		// instead, so "### `useFoo()`" does not shrink to a footnote
		'& code': {
			isolate: false,
			fontSize: '0.85em',
		},
	},
	heading1: {
		fontSize: fontSize.h1,
		// Display sizes are tracked slightly tighter than running text
		letterSpacing: '-0.01em',
		// The mobile artboard sets the page title at 32 (h1 40 × 0.8); derived from the
		// token so a custom scale keeps the ratio
		[mq.small]: {
			fontSize: Math.round(fontSize.h1 * 0.8),
		},
	},
	heading2: {
		fontSize: fontSize.h2,
	},
	heading3: {
		fontSize: fontSize.h3,
		lineHeight: 1.25,
	},
	heading4: {
		fontSize: fontSize.h4,
		lineHeight: 1.3,
	},
	heading5: {
		fontSize: fontSize.h5,
		lineHeight: 1.3,
	},
	heading6: {
		fontSize: fontSize.h6,
		lineHeight: 1.3,
	},
});

interface HeadingProps extends JssInjectedProps, React.HTMLAttributes<HTMLHeadingElement> {
	children?: React.ReactNode;
	level: number;
}

const HeadingRenderer: React.FunctionComponent<HeadingProps> = ({
	classes,
	level,
	children,
	...props
}) => {
	const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
	const headingClasses = cx(classes.heading, classes[`heading${level}`]);

	return (
		<Tag {...props} className={headingClasses}>
			{children}
		</Tag>
	);
};

HeadingRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	level: PropTypes.oneOf([1, 2, 3, 4, 5, 6]).isRequired,
	children: PropTypes.any,
};

export default Styled<HeadingProps>(styles)(HeadingRenderer);
