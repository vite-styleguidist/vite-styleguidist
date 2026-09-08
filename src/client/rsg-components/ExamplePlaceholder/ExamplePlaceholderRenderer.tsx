import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { DOCS_DOCUMENTING } from '../../../scripts/consts.js';
import type * as Rsg from '../../../typings/index.js';

// Shown in place of the examples of a component that has none (development only, see
// ReactComponent.tsx): a dashed box naming the Markdown file to create and linking to the
// documenting guide (States artboard, “missing examples”).
const styles = ({ space, color, fontFamily, fontSize, lineHeight, borderRadius }: Rsg.Theme) => ({
	root: {
		padding: space[2],
		border: [[1, color.border, 'dashed']],
		borderRadius,
		fontFamily: fontFamily.base,
		fontSize: fontSize.base,
		lineHeight: lineHeight.base,
		color: color.light,
	},
	// The file name, in the monospace face and the base colour so it stands out from the hint
	file: {
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		color: color.base,
	},
	link: {
		color: color.link,
		textDecoration: 'none',
		'&:hover, &:focus': {
			isolate: false,
			color: color.linkHover,
			textDecoration: 'underline',
		},
	},
	// Until 1.0 the placeholder was a button that revealed the instructions on click; the key
	// stays because rule keys are append-only (ADR 0011), but no element carries it any more.
	button: {},
});

interface ExamplePlaceholderProps extends JssInjectedProps {
	name?: string;
}

export const ExamplePlaceholderRenderer: React.FunctionComponent<ExamplePlaceholderProps> = ({
	classes,
	name,
}) => (
	<div className={classes.root}>
		Add examples to this component in{' '}
		{name ? (
			<>
				<code className={classes.file}>{name}.md</code> or{' '}
			</>
		) : null}
		<code className={classes.file}>Readme.md</code> in its folder.{' '}
		<a className={classes.link} href={DOCS_DOCUMENTING}>
			How to document components
		</a>
	</div>
);

ExamplePlaceholderRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	name: PropTypes.string,
};

export default Styled<ExamplePlaceholderProps>(styles)(ExamplePlaceholderRenderer);
