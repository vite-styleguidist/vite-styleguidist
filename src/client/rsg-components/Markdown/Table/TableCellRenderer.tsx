import React from 'react';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import type * as Rsg from '../../../../typings/index.js';

/**
 * Markdown table cells, styled like the props table of the artboards: hairline rows,
 * small uppercase column labels. The sizes (14 for cells, 12 for labels, 10px row
 * padding) are the table scale of the design and have no theme token on purpose;
 * they sit between `fontSize.small` and `fontSize.base`.
 */
const styles = ({ space, color, fontFamily, fontWeight }: Rsg.Theme) => ({
	td: {
		padding: [[10, space[2], 10, 0]],
		fontFamily: fontFamily.base,
		fontSize: 14,
		color: color.base,
		lineHeight: 1.5,
		verticalAlign: 'top',
		borderBottom: [[1, 'solid', color.border]],
	},
	th: {
		composes: '$td',
		padding: [[space[1], space[2], space[1], 0]],
		fontSize: 12,
		fontWeight: fontWeight.bold,
		letterSpacing: '0.04em',
		textTransform: 'uppercase',
		textAlign: 'left',
		color: color.light,
	},
});

interface TableCellProps extends JssInjectedProps {
	children: React.ReactNode;
	header?: boolean;
}

export const TableCellRenderer: React.FunctionComponent<TableCellProps> = ({
	classes,
	header = false,
	children,
}) => {
	if (header) {
		return <th className={classes.th}>{children}</th>;
	}
	return <td className={classes.td}>{children}</td>;
};

export default Styled<TableCellProps>(styles)(TableCellRenderer);
