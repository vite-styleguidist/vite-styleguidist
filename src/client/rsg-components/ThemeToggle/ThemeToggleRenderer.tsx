import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import { COLOR_SCHEMES } from '../../styles/colorSchemes.js';
import type * as Rsg from '../../../typings/index.js';

// Segmented control of three icon buttons (Main artboard, sidebar footer). On small
// screens the pill dissolves into three bare 44 px buttons in the header bar.
const TOUCH_TARGET = 44;

export const styles = ({ color, borderRadius, transition, mq }: Rsg.Theme): Styles => ({
	root: {
		display: 'inline-flex',
		gap: 2,
		padding: 2,
		border: [[1, color.border, 'solid']],
		borderRadius,
		background: color.baseBackground,
		color: color.light,
		[mq.small]: {
			gap: 0,
			padding: 0,
			border: 0,
			background: 'transparent',
		},
	},
	button: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: 28,
		height: 24,
		padding: 0,
		border: 0,
		borderRadius: borderRadius - 2,
		background: 'transparent',
		color: 'inherit',
		cursor: 'pointer',
		transition: `color ${transition.fast}, background-color ${transition.fast}`,
		'&:hover': {
			isolate: false,
			color: color.base,
		},
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
		[mq.small]: {
			width: TOUCH_TARGET,
			height: TOUCH_TARGET,
			borderRadius,
		},
	},
	isActive: {
		background: color.selectedBackground,
		color: color.link,
		'&:hover': {
			isolate: false,
			color: color.link,
		},
	},
	icon: {
		width: 14,
		height: 14,
		[mq.small]: {
			width: 20,
			height: 20,
		},
	},
	// The accessible name of each button: present for assistive technology, invisible
	label: {
		position: 'absolute',
		width: 1,
		height: 1,
		margin: -1,
		padding: 0,
		overflow: 'hidden',
		clip: 'rect(0, 0, 0, 0)',
		whiteSpace: 'nowrap',
		border: 0,
	},
});

const LABELS: Record<Rsg.ColorScheme, string> = {
	system: 'System',
	light: 'Light',
	dark: 'Dark',
};

const ICONS: Record<Rsg.ColorScheme, React.ComponentType<{ className?: string }>> = {
	system: FiMonitor,
	light: FiSun,
	dark: FiMoon,
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
			{COLOR_SCHEMES.map((scheme) => {
				const Icon = ICONS[scheme];
				return (
					<button
						key={scheme}
						type="button"
						className={cx(classes.button, { [classes.isActive]: value === scheme })}
						aria-pressed={value === scheme}
						title={`${LABELS[scheme]} color scheme`}
						onClick={() => onChange(scheme)}
					>
						<Icon className={classes.icon} aria-hidden="true" />
						<span className={classes.label}>{LABELS[scheme]}</span>
					</button>
				);
			})}
		</div>
	);
};

ThemeToggleRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	value: PropTypes.oneOf(COLOR_SCHEMES).isRequired,
	onChange: PropTypes.func.isRequired,
};

export default Styled<ThemeToggleRendererProps>(styles)(ThemeToggleRenderer);
