import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

/**
 * Inline code: a quiet chip on the code surface. It is coloured with `codeBase`
 * rather than inheriting so the text stays readable on `codeBackground` whatever the
 * surrounding text colour is (a custom dark code palette on a light page, for example).
 * Code blocks are PreRenderer; Markdown never nests this component inside one.
 */
const styles = ({ color, fontFamily, fontSize }: Rsg.Theme) => ({
	code: {
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		color: color.codeBase,
		background: color.codeBackground,
		padding: [[1, 4]],
		// Tighter than the block radius: the chip is only about 20px tall
		borderRadius: 4,
		whiteSpace: 'inherit',
	},
});

interface CodeProps extends JssInjectedProps {
	children: React.ReactNode;
}

export const CodeRenderer: React.FunctionComponent<CodeProps> = ({ classes, children }) => {
	return <code className={classes.code}>{children}</code>;
};
CodeRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any.isRequired,
};

export default Styled<CodeProps>(styles)(CodeRenderer);
