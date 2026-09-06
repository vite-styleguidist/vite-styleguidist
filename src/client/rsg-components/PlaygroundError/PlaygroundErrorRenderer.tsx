import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

// The example error panel (States artboard): a bordered box with a 3 px error-coloured left
// edge on the `errorBackground` surface, holding a title, the error text verbatim and a hint.
const styles = ({
	space,
	color,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	borderRadius,
}: Rsg.Theme) => ({
	root: {
		display: 'flex',
		flexDirection: 'column',
		gap: space[1],
		margin: 0,
		padding: [[14, space[2]]],
		border: [[1, color.border, 'solid']],
		borderLeft: [[3, color.error, 'solid']],
		borderRadius,
		background: color.errorBackground,
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
		color: color.error,
	},
	title: {
		fontSize: fontSize.base,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.heading,
		color: color.error,
	},
	message: {
		margin: 0,
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		lineHeight: 1.5,
		color: color.error,
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
	},
	hint: {
		fontSize: fontSize.small,
		lineHeight: 1.5,
		color: color.light,
	},
});

interface PlaygroundErrorProps extends JssInjectedProps {
	message: string;
}

export const PlaygroundErrorRenderer: React.FunctionComponent<PlaygroundErrorProps> = ({
	classes,
	message,
}) => (
	// `alert`: the panel appears in place of the preview while the visitor types, so assistive
	// technology is told about it without moving the focus out of the editor
	<div className={classes.root} role="alert">
		<div className={classes.title}>This example failed to render</div>
		<pre className={classes.message}>{message}</pre>
		<div className={classes.hint}>
			Fix the code in the editor below; the preview updates as you type.
		</div>
	</div>
);

PlaygroundErrorRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	message: PropTypes.string.isRequired,
};

export default Styled<PlaygroundErrorProps>(styles)(PlaygroundErrorRenderer);
