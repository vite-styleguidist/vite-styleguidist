import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ space }: Rsg.Theme): Styles => ({
	root: {
		display: 'flex',
		flexDirection: 'column',
		// Nested sections are not indented, only spaced: 40px between them
		gap: space[5],
	},
	// The list on the root page: 48px between top-level sections
	isRoot: {
		gap: space[6],
	},
});

interface SectionsRendererProps extends JssInjectedProps {
	children: React.ReactNode;
	root?: boolean;
}

export const SectionsRenderer: React.FunctionComponent<SectionsRendererProps> = ({
	classes,
	children,
	root,
}) => {
	return <section className={cx(classes.root, { [classes.isRoot]: root })}>{children}</section>;
};

SectionsRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any,
	root: PropTypes.bool,
};

export default Styled<SectionsRendererProps>(styles)(SectionsRenderer);
