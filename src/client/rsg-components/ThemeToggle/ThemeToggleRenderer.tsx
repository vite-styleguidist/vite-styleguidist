import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import { COLOR_SCHEMES } from '../../styles/colorSchemes.js';
import type * as Rsg from '../../../typings/index.js';

// Segmented control of three icon buttons (Main artboard, sidebar footer). The
// small-screen header has room for one 44 px button only (Mobile artboard), so there
// the same state is offered as a single button that cycles through the schemes.
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
	// The `compact` rendering: one button, sized like the other header buttons
	cycleButton: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		width: TOUCH_TARGET,
		height: TOUCH_TARGET,
		padding: 0,
		border: 0,
		borderRadius,
		background: 'transparent',
		color: color.base,
		cursor: 'pointer',
		transition: `background-color ${transition.fast}`,
		'&:hover': {
			isolate: false,
			background: color.selectedBackground,
		},
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
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

/** What the single `compact` button switches to, in the order of the segmented group */
const NEXT_SCHEME: Record<Rsg.ColorScheme, Rsg.ColorScheme> = {
	system: 'light',
	light: 'dark',
	dark: 'system',
};

export interface ThemeToggleRendererProps extends JssInjectedProps {
	value: Rsg.ColorScheme;
	onChange: (scheme: Rsg.ColorScheme) => void;
	/** One cycling button instead of the group, for the small-screen header */
	compact?: boolean;
}

export const ThemeToggleRenderer: React.FunctionComponent<ThemeToggleRendererProps> = ({
	classes,
	value,
	onChange,
	compact,
}) => {
	if (compact) {
		const next = NEXT_SCHEME[value];
		const Icon = ICONS[value];
		// A cycling button is not a toggle, so there is no pressed state to expose: the
		// accessible name carries both the current scheme and the one a press picks
		return (
			<button
				type="button"
				className={classes.cycleButton}
				aria-label={`Color scheme: ${LABELS[value]}. Switch to ${LABELS[next]}`}
				title={`${LABELS[value]} color scheme`}
				onClick={() => onChange(next)}
			>
				<Icon className={classes.icon} aria-hidden="true" />
			</button>
		);
	}
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
	compact: PropTypes.bool,
};

export default Styled<ThemeToggleRendererProps>(styles)(ThemeToggleRenderer);
