import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';

/**
 * Carries no styles of its own; it is a Styled component so that the row is isolated
 * from user stylesheets (`tr:nth-child(even) { background: … }` is common) like every
 * other element of a Markdown table. The row rule is on the cells (TableCellRenderer).
 */
const styles = () => ({
	tr: {},
});

interface TableRowProps extends JssInjectedProps {
	children?: React.ReactNode;
}

export const TableRowRenderer = ({ classes, children }: TableRowProps) => {
	return <tr className={classes.tr}>{children}</tr>;
};
TableRowRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.node.isRequired,
};

export default Styled<TableRowProps>(styles)(TableRowRenderer);
