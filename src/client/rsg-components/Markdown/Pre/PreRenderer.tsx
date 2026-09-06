import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import prismTheme from '../../../styles/prismTheme.js';
import type * as Rsg from '../../../../typings/index.js';

const styles = ({ space, color, fontSize, fontFamily, borderRadius }: Rsg.Theme) => ({
	pre: {
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		// Code is set looser than prose (13 / 1.6): the syntax colours need the air
		lineHeight: 1.6,
		color: color.codeBase,
		// Long lines scroll inside the block instead of wrapping, like the code editor
		whiteSpace: 'pre',
		wordWrap: 'normal',
		tabSize: 2,
		hyphens: 'none',
		backgroundColor: color.codeBackground,
		// 14 / 16 as in the artboards: the block's own line height supplies the rest
		padding: [[14, space[2]]],
		border: [[1, 'solid', color.border]],
		borderRadius,
		marginTop: 0,
		marginBottom: space[2],
		overflowX: 'auto',
		...prismTheme({ color }),
	},
});

export interface PreProps {
	className?: string;
	children: React.ReactNode;
}

type PrePropsWithClasses = JssInjectedProps & PreProps;

export const PreRenderer: React.FunctionComponent<PrePropsWithClasses> = ({
	classes,
	className,
	children,
}) => {
	const classNames = cx(className, classes.pre);

	const isHighlighted = className && className.indexOf('lang-') !== -1;
	if (isHighlighted && children) {
		return <pre className={classNames} dangerouslySetInnerHTML={{ __html: children.toString() }} />;
	}
	return <pre className={classNames}>{children}</pre>;
};

PreRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	className: PropTypes.string,
	children: PropTypes.any.isRequired,
};

export default Styled<PrePropsWithClasses>(styles)(PreRenderer);
