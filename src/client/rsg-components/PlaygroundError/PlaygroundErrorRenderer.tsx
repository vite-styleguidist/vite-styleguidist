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
		lineHeight: lineHeight.code,
		color: color.error,
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
	},
	hint: {
		fontSize: fontSize.small,
		lineHeight: lineHeight.code,
		color: color.light,
	},
});

interface PlaygroundErrorProps extends JssInjectedProps {
	message: string;
	/**
	 * Whether the example this error belongs to is rendered with the code editor. `noeditor`
	 * examples and a style guide in `exampleMode: 'hide'` show the preview alone, so the hint
	 * has to point at the Markdown file instead of at an editor that is not on the page.
	 */
	editable?: boolean;
	/**
	 * Panel title. Defaults to the playground copy: this component was written for one
	 * editable example inside a `.md` file. A caller whose failing unit is not an example —
	 * an MDX page, which fails as a whole — passes its own title instead.
	 */
	title?: string;
	/**
	 * The line under the message, telling the visitor where to fix the failure. Defaults to
	 * the playground copy chosen by `editable`; pass a hint that names the actual source file
	 * when the panel stands for something other than a playground.
	 */
	hint?: string;
}

export const PlaygroundErrorRenderer: React.FunctionComponent<PlaygroundErrorProps> = ({
	classes,
	message,
	editable = true,
	// Defaults live here rather than in the JSX so the playground copy is unchanged for every
	// caller that does not pass them: PlaygroundError’s own rendering must stay byte-identical.
	title = 'This example failed to render',
	hint = editable
		? 'Fix the code in the editor below; the preview updates as you type.'
		: 'Fix the example in its Markdown file.',
}) => (
	<div className={classes.root}>
		<div className={classes.title}>{title}</div>
		{/*
		 * Only the message is a live region, and a polite one: the panel is unmounted and
		 * remounted on every debounced run while the visitor types, so an assertive region
		 * around the whole panel re-announced the title and the hint too, interrupting the
		 * screen reader’s keystroke echo in the editor. `status` waits for a pause and the
		 * static copy around it is read on demand.
		 */}
		<pre className={classes.message} role="status">
			{message}
		</pre>
		<div className={classes.hint}>{hint}</div>
	</div>
);

PlaygroundErrorRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	message: PropTypes.string.isRequired,
	editable: PropTypes.bool,
	title: PropTypes.string,
	hint: PropTypes.string,
};

export default Styled<PlaygroundErrorProps>(styles)(PlaygroundErrorRenderer);
