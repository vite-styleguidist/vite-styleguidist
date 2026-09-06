import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import { COLOR_SCHEMES } from '../../styles/colorSchemes.js';
import type * as Rsg from '../../../typings/index.js';

// Styled after TabButton: small uppercase text buttons, the active one underlined.
// Deliberately plain until the designed mockups say what the toggle looks like.
export const styles = ({
	space,
	color,
	fontFamily,
	fontSize,
	fontWeight,
	transition,
	buttonTextTransform,
}: Rsg.Theme): Styles => ({
	root: {
		display: 'flex',
		flexWrap: 'wrap',
		marginTop: space[1],
	},
	button: {
		padding: [[space[0], 0]],
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		fontWeight: fontWeight.normal,
		color: color.light,
		background: 'transparent',
		textTransform: buttonTextTransform,
		transition: `color ${transition.slow}`,
		border: 'none',
		cursor: 'pointer',
		'&:hover, &:focus': {
			isolate: false,
			outline: 0,
			color: color.linkHover,
			transition: `color ${transition.fast}`,
		},
		'&:focus:not($isActive)': {
			isolate: false,
			outline: [[1, 'dotted', color.linkHover]],
		},
		'& + &': {
			isolate: false,
			marginLeft: space[1],
		},
	},
	isActive: {
		color: color.base,
		borderBottom: [[2, color.linkHover, 'solid']],
	},
});

const LABELS: Record<Rsg.ColorScheme, string> = {
	system: 'System',
	light: 'Light',
	dark: 'Dark',
};

export interface ThemeToggleRendererProps extends JssInjectedProps {
	value: Rsg.ColorScheme;
	onChange: (scheme: Rsg.ColorScheme) => void;
}

export const ThemeToggleRenderer: React.FunctionComponent<ThemeToggleRendererProps> = ({
	classes,
	value,
	onChange,
}) => {
	return (
		<div className={classes.root} role="group" aria-label="Color scheme">
			{COLOR_SCHEMES.map((scheme) => (
				<button
					key={scheme}
					type="button"
					className={cx(classes.button, { [classes.isActive]: value === scheme })}
					aria-pressed={value === scheme}
					title={`${LABELS[scheme]} color scheme`}
					onClick={() => onChange(scheme)}
				>
					{LABELS[scheme]}
				</button>
			))}
		</div>
	);
};

ThemeToggleRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	value: PropTypes.oneOf(COLOR_SCHEMES).isRequired,
	onChange: PropTypes.func.isRequired,
};

export default Styled<ThemeToggleRendererProps>(styles)(ThemeToggleRenderer);
