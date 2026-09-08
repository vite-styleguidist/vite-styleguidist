import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';

// Styled for isolation from user stylesheets only, see TableRowRenderer
const styles = () => ({
	tbody: {},
});

interface TableBodyProps extends JssInjectedProps {
	children?: React.ReactNode;
}

export const TableBodyRenderer = ({ classes, children }: TableBodyProps) => {
	return <tbody className={classes.tbody}>{children}</tbody>;
};
TableBodyRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.node.isRequired,
};

export default Styled<TableBodyProps>(styles)(TableBodyRenderer);
