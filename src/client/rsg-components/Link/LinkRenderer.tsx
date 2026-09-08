import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ color, transition }: Rsg.Theme): Styles => ({
	link: {
		'&, &:link, &:visited': {
			fontSize: 'inherit',
			color: color.link,
			textDecoration: 'none',
			cursor: 'pointer',
			transition: `color ${transition.fast}`,
		},
		'&:hover, &:active': {
			isolate: false,
			color: color.linkHover,
			textDecoration: 'underline',
		},
		// The keyboard focus ring of the facelift (ADR 0011). `:focus-visible` keeps it
		// off mouse clicks; browsers without it keep their default outline, because the
		// outline is only removed inside this rule.
		'&:focus-visible': {
			isolate: false,
			outline: 'none',
			// A 3px ring around inline text; the block radius would round it into a pill
			borderRadius: 2,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
});

interface LinkProps extends JssInjectedProps {
	children: React.ReactNode;
	className?: string;
	href?: string;
	target?: string;
	onClick?: () => void;
}

export const LinkRenderer: React.FunctionComponent<LinkProps> = ({
	classes,
	children,
	...props
}) => {
	return (
		<a {...props} className={cx(classes.link, props.className)}>
			{children}
		</a>
	);
};

LinkRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any,
	className: PropTypes.string,
	href: PropTypes.string,
};

export default Styled<LinkProps>(styles)(LinkRenderer);
