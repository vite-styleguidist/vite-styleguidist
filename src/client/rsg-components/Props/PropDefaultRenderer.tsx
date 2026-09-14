import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

/*
 * The default column of the props table. A default value is monospace in the secondary
 * text colour (`value`); a required prop has no default and shows the word "Required"
 * instead (`required`), which is also the accessible counterpart of the asterisk PropName
 * draws after the name. Below `mq.small` that word becomes a small uppercase label in the
 * accent colour on the card's first line; 11 px has no token and is a literal on purpose.
 */
export const styles = ({ color, fontFamily, fontSize, fontWeight, mq }: Rsg.Theme) => ({
	value: {
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		color: color.light,
	},
	required: {
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		color: color.light,
		[mq.small]: {
			fontSize: 11,
			fontWeight: fontWeight.bold,
			letterSpacing: '0.04em',
			textTransform: 'uppercase',
			color: color.link,
		},
	},
});

interface PropDefaultProps extends JssInjectedProps {
	children: React.ReactNode;
	required?: boolean;
}

export const PropDefaultRenderer: React.FunctionComponent<PropDefaultProps> = ({
	classes,
	children,
	required,
}) => <span className={required ? classes.required : classes.value}>{children}</span>;

PropDefaultRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.node.isRequired,
	required: PropTypes.bool,
};

export default Styled<PropDefaultProps>(styles)(PropDefaultRenderer);
