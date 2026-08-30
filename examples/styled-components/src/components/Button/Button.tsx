import styled, { DefaultTheme } from 'styled-components';
// styled-system v5 moved themeGet to its own package
import { themeGet } from '@styled-system/theme-get';
import type { ReactNode } from 'react';

interface ButtonProps {
	/** Button label */
	children: ReactNode;
	/** Button variation */
	variant?: 'primary' | 'secondary';
	fullWidth?: boolean;
}

// Theme colors (see src/theme.ts and src/styled.d.ts) used by each variation
type ColorName = keyof DefaultTheme['colors'];
const textColors: Partial<Record<string, ColorName>> = { primary: 'bg', secondary: 'primary' };
const bgColors: Partial<Record<string, ColorName>> = { primary: 'primary' };
const themeColor = (theme: DefaultTheme, name?: ColorName) =>
	name ? theme.colors[name] : undefined;

/**
 * A button.
 */
// `variant` and `fullWidth` only drive the styles: keep them off the DOM element
// (styled-components v6 forwards every prop to HTML elements by default)
const Button = styled.button.withConfig({
	shouldForwardProp: (prop) => !['variant', 'fullWidth'].includes(prop),
})<ButtonProps>`
	display: ${(props) => props.fullWidth && 'block'};
	width: ${(props) => props.fullWidth && '100%'};
	height: 2.5rem;
	padding: ${themeGet('space.3')} ${themeGet('space.4')};
	text-align: center;
	border: 1px solid ${themeGet('colors.primary')};
	border-radius: ${themeGet('radii.base')};
	font-family: ${themeGet('fonts.base')};
	font-size: ${themeGet('fontSizes.base')};
	color: ${(props) => themeColor(props.theme, textColors[props.variant ?? ''])};
	background-color: ${(props) => themeColor(props.theme, bgColors[props.variant ?? '']) || 'transparent'};
	text-decoration: none;
	user-select: none;
	box-sizing: border-box;
	/* We can't use :enabled here because it doesn't work with <a> */
	&:hover:not(:disabled),
	&:active:not(:disabled) {
		border-color: ${themeGet('colors.hover')};
		background-color: ${themeGet('colors.hover')};
		cursor: pointer;
	}
	&:focus {
		outline: 0;
		box-shadow: 0 0 0 2px ${themeGet('colors.focus')};
	}
	&:disabled {
		opacity: 0.6;
		filter: saturate(60%);
	}
	&::-moz-focus-inner {
		border: 0;
	}
`;

/** @component */
export default Button;
