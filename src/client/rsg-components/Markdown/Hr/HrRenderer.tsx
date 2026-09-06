import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../../typings/index.js';

const styles = ({ space, color }: Rsg.Theme) => ({
	hr: {
		// A single hairline: the browser default is a 2px inset box
		border: 0,
		borderBottom: [[1, 'solid', color.border]],
		height: 0,
		margin: [[space[4], 0]],
	},
});

export const HrRenderer: React.FunctionComponent<JssInjectedProps> = ({ classes }) => {
	return <hr className={classes.hr} />;
};
HrRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
};

export default Styled<JssInjectedProps>(styles)(HrRenderer);
