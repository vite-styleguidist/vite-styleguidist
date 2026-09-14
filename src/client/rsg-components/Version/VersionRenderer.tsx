import React from 'react';
import PropTypes from 'prop-types';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ color, fontFamily, fontWeight, lineHeight, space, mq }: Rsg.Theme): Styles => ({
	version: {
		color: color.light,
		margin: [[space[0], 0, 0, 0]],
		fontFamily: fontFamily.monospace,
		// One step below `fontSize.small`: a version string is a detail of the title
		fontSize: 12,
		fontWeight: fontWeight.normal,
		lineHeight: lineHeight.base,
		// No room for it in the small-screen header bar
		[mq.small]: {
			display: 'none',
		},
	},
});

interface VersionProps extends JssInjectedProps {
	children?: React.ReactNode;
}

export const VersionRenderer: React.FunctionComponent<VersionProps> = ({ classes, children }) => {
	return (
		<p aria-label="version" className={classes.version}>
			{children}
		</p>
	);
};

VersionRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any,
};

export default Styled<VersionProps>(styles)(VersionRenderer);
