import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../typings/index.js';

/*
 * The props and methods table (Markdown tables are a different component that happens
 * to share the `Table` name, see createStyleSheet.ts).
 *
 * Above `mq.small` it is a plain table: uppercase label headers, one hairline per row,
 * the description column taking whatever width is left. Below it the same markup turns
 * into one card per row: the header is hidden, each row becomes a bordered flex box
 * whose first line holds the leading cells (name, type, default) and whose last cell
 * (the description) wraps onto its own line. Doing this in CSS keeps the DOM, the test
 * ids and the a11y tree of the desktop table; the cost is that the browser drops the
 * table roles once the elements are `display: block`, which is acceptable for a list
 * of cards.
 *
 * Two sizes have no theme token and are literals on purpose: the 12 px header labels
 * (between `fontSize.small` and nothing) and the 14 px description copy (the artboard
 * sets table text one step below body copy).
 */
export const styles = ({
	space,
	color,
	fontFamily,
	fontWeight,
	lineHeight,
	borderRadius,
	mq,
}: Rsg.Theme) => ({
	table: {
		width: '100%',
		borderCollapse: 'collapse',
		marginBottom: space[4],
		[mq.small]: {
			display: 'block',
		},
	},
	tableHead: {
		borderBottom: [[1, color.border, 'solid']],
		[mq.small]: {
			// The cards carry their own structure; a visually hidden header would only be
			// read out as four stray words once the table roles are gone
			display: 'none',
		},
	},
	tableBody: {
		[mq.small]: {
			display: 'flex',
			flexDirection: 'column',
			rowGap: 10,
		},
	},
	row: {
		[mq.small]: {
			display: 'flex',
			flexWrap: 'wrap',
			alignItems: 'baseline',
			columnGap: space[1],
			rowGap: space[0],
			padding: space[1] + space[0], // 12
			border: [[1, color.border, 'solid']],
			borderRadius,
		},
	},
	cellHeading: {
		color: color.light,
		padding: [[space[1], space[2], space[1], 0]],
		textAlign: 'left',
		fontFamily: fontFamily.base,
		fontWeight: fontWeight.bold,
		fontSize: 12,
		letterSpacing: '0.04em',
		textTransform: 'uppercase',
		whiteSpace: 'nowrap',
		'&:last-child': {
			isolate: false,
			paddingRight: 0,
		},
	},
	cell: {
		color: color.base,
		padding: [[10, space[2], 10, 0]],
		verticalAlign: 'top',
		borderBottom: [[1, color.border, 'solid']],
		fontFamily: fontFamily.base,
		fontSize: 14,
		lineHeight: lineHeight.base,
		'&:last-child': {
			isolate: false,
			width: '99%',
			paddingRight: 0,
		},
		// Block children (Markdown paragraphs, Para, JsDoc lines, argument lists) take the
		// cell's size instead of the 16 px body copy they are designed for elsewhere
		'& p, & div': {
			isolate: false,
			fontSize: 'inherit',
			lineHeight: 'inherit',
		},
		'& p:last-child, & > div > :last-child': {
			isolate: false,
			marginBottom: 0,
		},
		[mq.small]: {
			display: 'block',
			padding: 0,
			border: 0,
			'&:last-child': {
				// The description gets a line of its own under the name / type / default line
				flexBasis: '100%',
			},
			'&:nth-child(3):not(:last-child)': {
				// The props table's third column is the default value, which the design
				// pushes to the right edge of the card's first line. Methods has three columns,
				// so its third is the description, already on its own line and excluded here.
				marginLeft: 'auto',
			},
		},
	},
});

interface TableProps extends JssInjectedProps {
	columns: {
		caption: string;
		render(row: any): React.ReactNode;
	}[];
	rows: any[];
	getRowKey(row: any): string;
}

export const TableRenderer: React.FunctionComponent<TableProps> = ({
	classes,
	columns,
	rows,
	getRowKey,
}) => {
	return (
		<table className={classes.table}>
			<thead className={classes.tableHead}>
				<tr>
					{columns.map(({ caption }) => (
						<th key={caption} className={classes.cellHeading}>
							{caption}
						</th>
					))}
				</tr>
			</thead>
			<tbody className={classes.tableBody}>
				{rows.map((row) => (
					<tr key={getRowKey(row)} className={classes.row}>
						{columns.map(({ render }, index) => (
							<td key={index} className={classes.cell}>
								{render(row)}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
};

TableRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	columns: PropTypes.arrayOf(
		PropTypes.shape({
			caption: PropTypes.string.isRequired,
			render: PropTypes.func.isRequired,
		}).isRequired
	).isRequired,
	rows: PropTypes.arrayOf(PropTypes.object).isRequired,
	getRowKey: PropTypes.func.isRequired,
};

export default Styled<TableProps>(styles)(TableRenderer);
