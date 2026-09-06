import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import editorFrame from './editorFrameStyles.js';
import type * as Rsg from '../../../typings/index.js';

// The editor is the only part of the style guide that needs CodeMirror (~150 kB gzipped),
// and a page mounts zero editors until someone clicks “View Code”. Loading it on demand keeps
// CodeMirror in a chunk of its own that is fetched on the first click.
//
// The specifier must stay exactly `rsg-components/Editor`: that is the alias
// `styleguideComponents.Editor` rewrites (src/scripts/make-vite-config.ts), so a user
// replacement is loaded here instead and CodeMirror is left out of their bundle entirely.
const Editor = React.lazy(() => import('rsg-components/Editor'));

export const styles = (theme: Rsg.Theme) => ({
	// Placeholder shown while the chunk loads: the code as plain text in the editor’s frame.
	// Padding, border and wrapping mirror Editor.tsx so it occupies the same height.
	placeholder: {
		...editorFrame(theme),
		margin: 0,
		padding: theme.space[2],
		border: [[1, theme.color.border, 'solid']],
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
		overflowWrap: 'anywhere',
	},
});

export interface EditorLoaderProps extends Rsg.EditorProps, JssInjectedProps {}

export function EditorLoader({ classes, ...props }: EditorLoaderProps) {
	return (
		<Suspense fallback={<pre className={classes.placeholder}>{props.code}</pre>}>
			<Editor {...props} />
		</Suspense>
	);
}

EditorLoader.propTypes = {
	code: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
};

export default Styled<EditorLoaderProps>(styles)(EditorLoader);
