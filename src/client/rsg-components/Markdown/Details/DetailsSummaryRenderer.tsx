import React from 'react';
import PropTypes from 'prop-types';
import { Styles } from 'jss';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../../typings/index.js';

const styles = ({
	space,
	color,
	fontSize,
	fontFamily,
	lineHeight,
	transition,
}: Rsg.Theme): Styles => ({
	summary: {
		marginBottom: space[1],
		fontFamily: fontFamily.base,
		fontSize: fontSize.text,
		lineHeight: lineHeight.base,
		color: color.base,
		cursor: 'pointer',
		transition: `color ${transition.fast}`,
		// The isolation reset puts every element back to `list-style: disc outside`, which
		// turns the browser's disclosure triangle into a stray bullet; restore it
		display: 'list-item',
		listStyle: 'disclosure-closed inside',
		'details[open] > &': {
			isolate: false,
			listStyleType: 'disclosure-open',
		},
		// Quiet affordance: the summary reads as text and only takes the link colour
		// under the pointer; the marker triangle already says it is expandable
		'&:hover': {
			isolate: false,
			color: color.link,
		},
		// The keyboard focus ring of the facelift (ADR 0011); see LinkRenderer
		'&:focus-visible': {
			isolate: false,
			outline: 'none',
			borderRadius: 2,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
	},
});

interface DetailsSummaryProps extends JssInjectedProps {
	children: React.ReactNode;
}

export const DetailsSummaryRenderer: React.FunctionComponent<DetailsSummaryProps> = ({
	classes,
	children,
}) => {
	return <summary className={classes.summary}>{children}</summary>;
};

DetailsSummaryRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any.isRequired,
};

export default Styled<DetailsSummaryProps>(styles)(DetailsSummaryRenderer);
