import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

export const styles = ({ space, color, borderRadius, mq }: Rsg.Theme) => ({
	root: {
		// 24 px between examples: Examples zeroes the last example’s margin (layout lane)
		marginBottom: space[3],
	},
	// The preview box (Main artboard, examples section): 24 / 16 padding, a 1 px border on a
	// 6 px radius and the page background; 20 / 16 on small screens (Mobile artboard).
	preview: {
		padding: [[space[3], space[2]]],
		marginBottom: space[1],
		border: [[1, color.border, 'solid']],
		borderRadius,
		background: color.baseBackground,
		// the next 3 lines are required to contain floated components; `top` removes the
		// descender gap an inline-block leaves below itself
		width: '100%',
		display: 'inline-block',
		verticalAlign: 'top',
		[mq.small]: {
			padding: [[20, space[2]]],
		},
	},
	// The toolbar row between the preview and the code: the tab buttons on the left, the
	// toolbar (“Open isolated”) pushed to the right
	controls: {
		display: 'flex',
		alignItems: 'center',
		gap: space[2],
		marginBottom: space[1],
	},
	toolbar: {
		marginLeft: 'auto',
	},
	tab: {}, // expose className to allow using it in 'styles' settings
	// The tab-button row rendered `classes.tabs` since the tabs were introduced, but only
	// `tab` (the tab body) was ever declared, so the row carried no class at all and a
	// `styles: { Playground: { tabs: … } }` override silently did nothing. `tab` stays:
	// rule keys are append-only (ADR 0011).
	tabs: {
		display: 'flex',
		alignItems: 'center',
		// The Slot renders its fills inside a wrapper element of its own, so the row of tab
		// buttons (the Code tab, plus custom exampleTabs fills) is that wrapper, not this
		// element: the flex row and the artboard’s 16 px gap have to go one level down or a
		// second fill would sit flush against “View Code” (TabButton has no sibling margin).
		// Mirrors ReactComponentRenderer.tabButtons.
		'& > *': {
			isolate: false,
			display: 'flex',
			alignItems: 'center',
			gap: space[2],
		},
	},
	padded: {
		// add padding between each example element rendered
		'& > *': {
			isolate: false,
			marginLeft: -space[1],
			marginRight: -space[1],
			'& > *': {
				isolate: false,
				marginRight: space[1],
				marginLeft: space[1],
			},
		},
	},
});

interface PlaygroundRendererProps extends JssInjectedProps {
	exampleIndex: number;
	name?: string;
	padded: boolean;
	preview: React.ReactNode;
	// TODO: need to find a better type here too
	previewProps: any;
	tabButtons: React.ReactNode;
	tabBody: React.ReactNode;
	toolbar: React.ReactNode;
}

export const PlaygroundRenderer: React.FunctionComponent<PlaygroundRendererProps> = ({
	classes,
	exampleIndex,
	name,
	padded,
	preview,
	previewProps,
	tabButtons,
	tabBody,
	toolbar,
}) => {
	const { className, ...props } = previewProps;
	const previewClasses = cx(classes.preview, className, { [classes.padded]: padded });
	return (
		<div className={classes.root} data-testid={`${name}-example-${exampleIndex}`}>
			<div className={previewClasses} {...props} data-preview={name} data-testid="preview-wrapper">
				{preview}
			</div>
			<div className={classes.controls}>
				<div className={classes.tabs}>{tabButtons}</div>
				<div className={classes.toolbar}>{toolbar}</div>
			</div>
			<div className={classes.tab}>{tabBody}</div>
		</div>
	);
};

PlaygroundRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	exampleIndex: PropTypes.number.isRequired,
	name: PropTypes.string.isRequired,
	padded: PropTypes.bool.isRequired,
	preview: PropTypes.any.isRequired,
	previewProps: PropTypes.object.isRequired,
	tabButtons: PropTypes.any.isRequired,
	tabBody: PropTypes.any.isRequired,
	toolbar: PropTypes.any.isRequired,
};

export default Styled<PlaygroundRendererProps>(styles)(PlaygroundRenderer);
