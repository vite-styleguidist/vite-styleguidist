import React, { useEffect, useState } from 'react';
import copy from 'clipboard-copy';
import { MdContentCopy } from 'react-icons/md';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import type * as Rsg from '../../../typings/index.js';

// How long the “Copied to clipboard” confirmation stays visible
export const COPIED_DURATION = 1500;

export const styles = ({
	space,
	fontFamily,
	fontSize,
	color,
	borderRadius,
	transition,
	mq,
}: Rsg.Theme): Styles => ({
	pathline: {
		display: 'flex',
		alignItems: 'center',
		gap: space[1],
		fontFamily: fontFamily.monospace,
		fontSize: fontSize.small,
		color: color.light,
		[mq.small]: {
			// One step below `small` (13), which is not on the scale
			fontSize: 12,
		},
	},
	path: {
		minWidth: 0,
		wordBreak: 'break-all',
	},
	// An icon-only 32×32 outlined button, the quietest treatment next to a light path
	copyButton: {
		flexShrink: 0,
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: space[4],
		height: space[4],
		padding: 0,
		border: [[1, color.border, 'solid']],
		borderRadius,
		background: 'transparent',
		color: color.light,
		cursor: 'pointer',
		transition: `color ${transition.slow}, border-color ${transition.slow}`,
		'&:hover': {
			isolate: false,
			color: color.linkHover,
			borderColor: color.light,
			transition: `color ${transition.fast}, border-color ${transition.fast}`,
		},
		// Keyboard focus: the shared ring (border in the link colour plus a soft halo);
		// pointer focus keeps the resting look because the confirmation is feedback enough
		'&:focus-visible': {
			isolate: false,
			outline: 0,
			borderColor: color.link,
			boxShadow: [[0, 0, 0, 3, color.focus]],
		},
		'& svg': {
			width: 14,
			height: 14,
			color: 'currentColor',
		},
	},
	// The confirmation chip: inverted surface (text colour on background colour), so it
	// stays readable in both colour schemes without a token of its own
	copied: {
		marginLeft: space[0],
		padding: [[6, 10]],
		borderRadius,
		background: color.base,
		color: color.baseBackground,
		fontFamily: fontFamily.base,
		fontSize: 12,
		lineHeight: 1.3,
		whiteSpace: 'nowrap',
		// The live region is always in the DOM so that screen readers announce the text
		// when it appears; it takes no space while empty
		'&:empty': {
			isolate: false,
			display: 'none',
		},
	},
});

interface Props extends JssInjectedProps {
	children?: React.ReactNode;
}

export const PathlineRenderer = ({ classes, children }: Props) => {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) {
			return undefined;
		}
		const timer = setTimeout(() => setCopied(false), COPIED_DURATION);
		return () => clearTimeout(timer);
	}, [copied]);

	const handleCopy = () => {
		if (!children) {
			return;
		}
		// clipboard-copy rejects when the page may not write to the clipboard; the
		// confirmation is only shown once the text is actually there
		Promise.resolve(copy(children.toString())).then(
			() => setCopied(true),
			() => undefined
		);
	};

	return (
		<div className={classes.pathline}>
			<span className={classes.path}>{children}</span>
			<button
				type="button"
				className={classes.copyButton}
				onClick={handleCopy}
				title="Copy path"
				aria-label="Copy path"
			>
				<MdContentCopy aria-hidden="true" />
			</button>
			<span role="status" className={classes.copied}>
				{copied ? 'Copied to clipboard' : ''}
			</span>
		</div>
	);
};

export default Styled<JssInjectedProps>(styles)(PathlineRenderer);
