import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ space }: Rsg.Theme): Styles => ({
	root: {
		// Nothing to show (every example filtered out): take no gap in the parent's layout
		'&:empty': {
			isolate: false,
			display: 'none',
		},
		// Examples space themselves through their own bottom margin (Playground.root, the
		// Markdown paragraphs between them); the last one must not push the next block away
		'& > :last-child': {
			isolate: false,
			marginBottom: 0,
		},
	},
	// The “Examples” heading of a component: 16px to the first example
	heading: {
		marginBottom: space[2],
	},
});

interface ExamplesRendererProps extends JssInjectedProps {
	children?: React.ReactNode;
	name?: string;
	heading?: React.ReactNode;
}

export const ExamplesRenderer: React.FunctionComponent<ExamplesRendererProps> = ({
	classes,
	name,
	heading,
	children,
}) => {
	return (
		<article className={classes.root} data-testid={`${name}-examples`}>
			{heading && <div className={classes.heading}>{heading}</div>}
			{children}
		</article>
	);
};

ExamplesRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	name: PropTypes.string.isRequired,
	heading: PropTypes.any,
	children: PropTypes.any,
};

export default Styled<ExamplesRendererProps>(styles)(ExamplesRenderer);
