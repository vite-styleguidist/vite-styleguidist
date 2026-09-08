import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../../typings/index.js';

const styles = ({ space, color, fontSize, fontFamily, lineHeight }: Rsg.Theme) => ({
	blockquote: {
		margin: [[0, 0, space[2]]],
		padding: [[0, space[2]]],
		borderLeft: [[3, 'solid', color.border]],
		color: color.light,
		fontFamily: fontFamily.base,
		fontSize: fontSize.text,
		lineHeight: lineHeight.base,
		// Markdown wraps quoted text in paragraphs, and Para sets the base colour itself,
		// so the secondary colour has to be re-applied to them from here
		'& p': {
			isolate: false,
			color: color.light,
		},
		'& p:last-child': {
			isolate: false,
			marginBottom: 0,
		},
	},
});

interface BlockquoteProps extends JssInjectedProps {
	children: React.ReactNode;
	className?: string;
}

export const BlockquoteRenderer: React.FunctionComponent<BlockquoteProps> = ({
	classes,
	className,
	children,
}) => {
	const blockquoteClasses = cx(classes.blockquote, className);
	return <blockquote className={blockquoteClasses}>{children}</blockquote>;
};

BlockquoteRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	className: PropTypes.string,
	children: PropTypes.any.isRequired,
};

export default Styled<BlockquoteProps>(styles)(BlockquoteRenderer);
