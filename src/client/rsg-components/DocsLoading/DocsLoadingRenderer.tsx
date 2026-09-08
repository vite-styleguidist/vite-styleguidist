import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import {
	DOCS_LOADING_LABEL,
	DOCS_LOADING_RELOAD,
	docsLoadingErrorMessage,
} from './strings.js';
import type * as Rsg from '../../../typings/index.js';

/**
 * What a component shows instead of its body while its documentation is being fetched, and
 * what it shows instead when the fetch failed (`lazyDocs`, ADR 0019).
 *
 * A ring in the two text colours the theme already has — the quiet one for the ring, the
 * accent for the arc that turns — at the size of a line of the label beside it, so the slot
 * is one line tall and nothing on the page jumps when the documentation replaces it.
 * `prefers-reduced-motion` leaves the same ring standing still: the arc is still visible, so
 * the state reads without any motion at all. Colours come from `theme.color.*` only, which
 * is what makes both work in dark mode (ADR 0011).
 */
export const styles = ({
	color,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	space,
	borderRadius,
	transition,
	mq,
}: Rsg.Theme): Styles => ({
	root: {
		display: 'flex',
		alignItems: 'center',
		gap: space[1],
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		lineHeight: lineHeight.base,
		color: color.light,
	},
	// The ring: 20px, 2px thick, one arc in the accent colour so the rotation is visible
	spinner: {
		flex: [[0, 0, 'auto']],
		width: 20,
		height: 20,
		borderRadius: '50%',
		// Longhands rather than the `border` shorthand: the arc is one edge in another
		// colour, and a shorthand followed by `border-top-color` is exactly the pattern
		// that trips CSSOM implementations up when the value is a custom property
		borderWidth: 2,
		borderStyle: 'solid',
		borderColor: color.light,
		borderTopColor: color.link,
		animation: '$rsgDocsLoadingSpin 800ms linear infinite',
		// No motion at all for a reader who asked for none: the ring keeps its accent arc
		// and simply stops turning
		'@media (prefers-reduced-motion: reduce)': {
			isolate: false,
			animation: 'none',
		},
	},
	// Empty on purpose: the key is what the `styles` config option addresses, and a label
	// that inherits everything from `root` still has to be addressable (ADR 0011)
	label: {},
	// The error state stacks its message and its button, and wraps to two lines on a phone
	error: {
		display: 'flex',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: space[1],
		color: color.base,
		[mq.small]: {
			alignItems: 'flex-start',
			flexDirection: 'column',
		},
	},
	// Empty for the same reason as `label`
	message: {},
	// A quiet outlined button, the shape the rest of the UI uses for a secondary action
	button: {
		padding: [[space[0], space[1]]],
		fontFamily: fontFamily.base,
		fontSize: fontSize.small,
		fontWeight: fontWeight.bold,
		lineHeight: lineHeight.base,
		color: color.link,
		background: 'transparent',
		border: [[1, color.border, 'solid']],
		borderRadius,
		cursor: 'pointer',
		transition: `color ${transition.fast}, border-color ${transition.fast}`,
		'&:hover, &:focus': {
			isolate: false,
			color: color.linkHover,
			borderColor: color.link,
		},
		// The focus ring the rest of the UI draws (TabButton, Editor, links)
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
		[mq.small]: {
			minHeight: 44,
		},
	},
	'@keyframes rsgDocsLoadingSpin': {
		from: { transform: 'rotate(0deg)' },
		to: { transform: 'rotate(360deg)' },
	},
});

export interface DocsLoadingRendererProps extends JssInjectedProps {
	/** `loading` while the documentation is on its way, `error` once a load has failed. */
	status: 'loading' | 'error';
	/** The component whose documentation this stands in for. */
	name: string;
	/** The message of the failed load, when there is one. */
	error?: string;
}

export const DocsLoadingRenderer: React.FunctionComponent<DocsLoadingRendererProps> = ({
	classes,
	status,
	name,
	error,
}) => (
	// `role="status"` (with the redundant `aria-live` spelled out, because a few screen
	// readers only honour the explicit one) announces the state without moving the focus,
	// which is right for something the reader did not ask for by pressing anything
	<div className={classes.root} role="status" aria-live="polite" data-testid="docs-loading">
		{status === 'error' ? (
			<span className={classes.error} data-testid="docs-loading-error">
				{/* The sentence is the message; `error` is the browser’s own words for what
				    went wrong, one hover away rather than in the page */}
				<span className={classes.message} title={error}>
					{docsLoadingErrorMessage(name)}
				</span>
				<button
					type="button"
					className={classes.button}
					onClick={() => window.location.reload()}
				>
					{DOCS_LOADING_RELOAD}
				</button>
			</span>
		) : (
			<>
				<span className={classes.spinner} data-testid="docs-loading-spinner" />
				<span className={classes.label}>{DOCS_LOADING_LABEL}</span>
			</>
		)}
	</div>
);

DocsLoadingRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	status: PropTypes.oneOf(['loading', 'error'] as const).isRequired,
	name: PropTypes.string.isRequired,
	error: PropTypes.string,
};

export default Styled<DocsLoadingRendererProps>(styles)(DocsLoadingRenderer);
