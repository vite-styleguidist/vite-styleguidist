import React from 'react';
import PropTypes from 'prop-types';
import Styled from 'rsg-components/Styled';
import Heading from 'rsg-components/Heading';
// Import the default implementation from vite-styleguidist using the full path.
// The `.js` extension is required: the package's `exports` map only exposes exact
// `./lib/*` paths, and exports-map resolution never appends extensions.
import DefaultSectionsRenderer from 'vite-styleguidist/lib/client/rsg-components/Sections/SectionsRenderer.js';

const styles = ({ fontFamily, space }) => ({
	headingSpacer: {
		marginBottom: space[2],
	},
	descriptionText: {
		marginTop: space[0],
		fontFamily: fontFamily.base,
	},
});

export function SectionsRenderer({ classes, children }) {
	return (
		<div>
			{children.length > 0 && (
				<div className={classes.headingSpacer}>
					<Heading level={1}>Example Components</Heading>
					<p className={classes.descriptionText}>These are the greatest components</p>
				</div>
			)}
			<DefaultSectionsRenderer>{children}</DefaultSectionsRenderer>
		</div>
	);
}

SectionsRenderer.propTypes = {
	classes: PropTypes.object.isRequired,
	children: PropTypes.node,
};

export default Styled(styles)(SectionsRenderer);
