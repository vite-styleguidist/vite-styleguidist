import React from 'react';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ color, fontFamily, fontSize, fontWeight, mq }: Rsg.Theme): Styles => ({
	logo: {
		color: color.base,
		margin: 0,
		fontFamily: fontFamily.base,
		fontSize: fontSize.text,
		fontWeight: fontWeight.bold,
		// Between the heading and the body line heights: a two-line title stays compact
		lineHeight: 1.3,
		// In the small-screen header bar the title shares a row with four buttons
		[mq.small]: {
			overflow: 'hidden',
			textOverflow: 'ellipsis',
			whiteSpace: 'nowrap',
		},
	},
});

interface Props extends JssInjectedProps {
	children?: React.ReactNode;
}

export const LogoRenderer = ({ classes, children }: Props) => {
	return <h1 className={classes.logo}>{children}</h1>;
};

export default Styled<JssInjectedProps>(styles)(LogoRenderer);
