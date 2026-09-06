import React from 'react';
import PropTypes from 'prop-types';
import Pathline from 'rsg-components/Pathline';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import type * as Rsg from '../../../typings/index.js';

// Width of a comfortable line of documentation prose (about 75 characters at 16px);
// the same value is used for section descriptions in SectionRenderer.
export const PROSE_MAX_WIDTH = 680;

const styles = ({ color, fontSize, lineHeight, space, mq }: Rsg.Theme): Styles => ({
	root: {
		// The blocks of a component (header, docs tabs, examples) are stacked with one gap
		// so that a missing block does not leave a hole
		display: 'flex',
		flexDirection: 'column',
		gap: space[4],
		[mq.small]: {
			gap: space[3],
		},
		// Components listed one after another are separated by a quiet 1px line with 24px
		// on each side (48 in total) rather than by boxed cards
		'& + &': {
			isolate: false,
			marginTop: space[3],
			paddingTop: space[3],
			borderTop: [[1, color.border, 'solid']],
		},
	},
	header: {
		display: 'flex',
		flexDirection: 'column',
		// Not on the space scale: 10px between the name, the path line and the description
		gap: 10,
		[mq.small]: {
			gap: space[1],
		},
	},
	tabs: {
		display: 'flex',
		flexDirection: 'column',
		// Not on the space scale: 14px between the tab row and the props table
		gap: 14,
		[mq.small]: {
			gap: 12,
		},
		// A component without props or methods renders no tab button (UsageTabButton returns
		// null), which would leave an empty block and its gap behind: hide the whole block
		'&:not(:has($tabButtons > *))': {
			isolate: false,
			display: 'none',
		},
	},
	tabButtons: {
		display: 'flex',
		borderBottom: [[1, color.border, 'solid']],
		// The Slot renders its fills inside a wrapper element: that wrapper is the row of tab
		// buttons. It overlaps the row's border by one pixel so the active tab's own
		// border-bottom (TabButton) sits on the line instead of above it.
		'& > *': {
			isolate: false,
			display: 'flex',
			gap: 20,
			marginBottom: -1,
		},
	},
	tabBody: {
		overflowX: 'auto',
		maxWidth: '100%',
		WebkitOverflowScrolling: 'touch',
		// No open tab: the Slot renders nothing and the body must not take part in the gap
		'&:empty': {
			isolate: false,
			display: 'none',
		},
	},
	docs: {
		maxWidth: PROSE_MAX_WIDTH,
		// 16px from the path line: the header gap plus these 6 (4 on small screens)
		marginTop: 6,
		[mq.small]: {
			marginTop: space[0],
		},
		color: color.base,
		fontSize: fontSize.text,
		lineHeight: lineHeight.base,
		// The header's gap replaces the bottom margin of the last Markdown paragraph
		// (Markdown wraps several blocks in a div, hence the second selector)
		'& > :last-child, & > div > :last-child': {
			isolate: false,
			marginBottom: 0,
		},
	},
});

interface ReactComponentRendererProps extends JssInjectedProps {
	name: string;
	heading: React.ReactNode;
	filepath?: string;
	slug?: string;
	pathLine?: string;
	tabButtons?: React.ReactNode;
	tabBody?: React.ReactNode;
	description?: React.ReactNode;
	docs?: React.ReactNode;
	examples?: React.ReactNode;
	isolated?: boolean;
}

export const ReactComponentRenderer: React.FunctionComponent<ReactComponentRendererProps> = ({
	classes,
	name,
	heading,
	pathLine,
	description,
	docs,
	examples,
	tabButtons,
	tabBody,
}) => {
	return (
		<div className={classes.root} data-testid={`${name}-container`}>
			<header className={classes.header}>
				{heading}
				{pathLine && <Pathline>{pathLine}</Pathline>}
				{(description || docs) && (
					<div className={classes.docs}>
						{description}
						{docs}
					</div>
				)}
			</header>
			{tabButtons && (
				<div className={classes.tabs}>
					<div className={classes.tabButtons}>{tabButtons}</div>
					<div className={classes.tabBody}>{tabBody}</div>
				</div>
			)}
			{examples}
		</div>
	);
};

ReactComponentRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	name: PropTypes.string.isRequired,
	heading: PropTypes.any.isRequired,
	filepath: PropTypes.string,
	pathLine: PropTypes.string,
	tabButtons: PropTypes.any,
	tabBody: PropTypes.any,
	description: PropTypes.any,
	docs: PropTypes.any,
	examples: PropTypes.any,
	isolated: PropTypes.bool,
};

export default Styled<ReactComponentRendererProps>(styles)(ReactComponentRenderer);
