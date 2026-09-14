import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';

/*
 * An MDX page is one compiled React tree, not a list of chunks, so this wrapper only has to
 * give it the same outer rhythm `ExamplesRenderer` gives a list of `.md` chunks: whatever the
 * page ends with must not push the block after it away, and an empty page takes no gap.
 * Everything visible is styled by the components in the element map (Para, Heading, Playground),
 * which is why there are no colours or fonts here.
 */
const styles = (): Styles => ({
	root: {
		'&:empty': {
			isolate: false,
			display: 'none',
		},
		'& > :last-child': {
			isolate: false,
			marginBottom: 0,
		},
	},
});

interface MdxPageRendererProps extends JssInjectedProps {
	children?: React.ReactNode;
	/** Name of the component or section the page documents, used for the test id. */
	name?: string;
}

export const MdxPageRenderer: React.FunctionComponent<MdxPageRendererProps> = ({
	classes,
	name,
	children,
}) => (
	<div className={classes.root} data-testid={`${name}-mdx-page`}>
		{children}
	</div>
);

MdxPageRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	name: PropTypes.string,
	children: PropTypes.any,
};

export default Styled<MdxPageRendererProps>(styles)(MdxPageRenderer);
