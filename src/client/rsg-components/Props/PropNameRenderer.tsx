import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import Name from 'rsg-components/Name';
import type * as Rsg from '../../../typings/index.js';

/*
 * The name cell of the props table: the prop name plus, for required props, an asterisk
 * in the accent colour. The asterisk is decoration for sighted readers only
 * (`aria-hidden`): the accessible "Required" lives in the default column (PropDefault),
 * so screen readers hear the word once. Below `mq.small` the default column turns that
 * word into a label on the same line, and the asterisk steps aside.
 */
export const styles = ({ color, mq }: Rsg.Theme) => ({
	required: {
		color: color.link,
		[mq.small]: {
			display: 'none',
		},
	},
});

interface PropNameProps extends JssInjectedProps {
	children: React.ReactNode;
	deprecated?: boolean;
	required?: boolean;
}

export const PropNameRenderer: React.FunctionComponent<PropNameProps> = ({
	classes,
	children,
	deprecated,
	required,
}) => (
	<>
		<Name deprecated={deprecated}>{children}</Name>
		{required && (
			<span className={classes.required} aria-hidden="true">
				{' *'}
			</span>
		)}
	</>
);

PropNameRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.node.isRequired,
	deprecated: PropTypes.bool,
	required: PropTypes.bool,
};

export default Styled<PropNameProps>(styles)(PropNameRenderer);
