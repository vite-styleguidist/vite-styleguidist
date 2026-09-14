import React from 'react';
import PropTypes from 'prop-types';
import Markdown from 'rsg-components/Markdown';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

// An info banner inside the examples (the `Message` component available in Markdown examples,
// see docs/Configuration.md): a quiet box on the sidebar surface. The text inside is Markdown
// and keeps the Markdown renderer’s own typography.
const styles = ({ space, color, fontSize, lineHeight, borderRadius }: Rsg.Theme) => ({
	root: {
		marginBottom: space[4],
		padding: [[12, space[2]]],
		border: [[1, color.border, 'solid']],
		borderRadius,
		background: color.sidebarBackground,
		fontSize: fontSize.base,
		lineHeight: lineHeight.base,
		color: color.base,
		// The text is Markdown and its blocks carry their own bottom margin (Para), which would
		// otherwise sit inside the box’s 12 px padding and make the bottom read 28 px against
		// the 12 px above. markdown-to-jsx returns a single block unwrapped and wraps several
		// in a <div>, so the last block is zeroed at both depths.
		'& > :last-child, & > * > :last-child': {
			isolate: false,
			marginBottom: 0,
		},
	},
});

interface MessageProps extends JssInjectedProps {
	children: React.ReactNode;
}

export const MessageRenderer: React.FunctionComponent<MessageProps> = ({ classes, children }) => {
	return (
		<div className={classes.root}>
			<Markdown
				text={
					Array.isArray(children)
						? children.join('\n')
						: typeof children === 'string'
							? children
							: ''
				}
			/>
		</div>
	);
};

MessageRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any.isRequired,
};

export default Styled<MessageProps>(styles)(MessageRenderer);
