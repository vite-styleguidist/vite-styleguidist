import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Heading from 'rsg-components/Heading';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ color, space }: Rsg.Theme): Styles => ({
	wrapper: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
		gap: space[2],
		// The spacing below a heading belongs to its container (the component header,
		// the section header), which stacks it with the path line or the description
		marginBottom: 0,
	},
	toolbar: {
		flexShrink: 0,
		marginLeft: 'auto',
	},
	sectionName: {
		'&:hover, &:active': {
			isolate: false,
			textDecoration: 'underline',
			cursor: 'pointer',
		},
	},
	isDeprecated: {
		color: color.light,
		'&, &:hover': {
			textDecoration: 'line-through',
		},
	},
});

interface SectionHeadingRendererProps extends JssInjectedProps {
	children?: React.ReactNode;
	toolbar?: React.ReactNode;
	id: string;
	href?: string;
	depth: number;
	size?: number;
	deprecated?: boolean;
}

const SectionHeadingRenderer: React.FunctionComponent<SectionHeadingRendererProps> = ({
	classes,
	children,
	toolbar,
	id,
	href,
	depth,
	size,
	deprecated,
}) => {
	const headingLevel = Math.min(6, depth);
	const sectionNameClasses = cx(classes.sectionName, {
		[classes.isDeprecated]: deprecated,
	});

	return (
		<div className={classes.wrapper}>
			{/* `size` is optional: sections are drawn at the size their depth implies, while a
			    component name asks for a fixed one and keeps its place in the outline */}
			<Heading level={headingLevel} size={size && Math.min(6, size)} id={id}>
				<a href={href} className={sectionNameClasses}>
					{children}
				</a>
			</Heading>
			<div className={classes.toolbar}>{toolbar}</div>
		</div>
	);
};

SectionHeadingRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	children: PropTypes.any,
	toolbar: PropTypes.any,
	id: PropTypes.string.isRequired,
	href: PropTypes.string,
	depth: PropTypes.number.isRequired,
	size: PropTypes.number,
	deprecated: PropTypes.bool,
};

export default Styled<SectionHeadingRendererProps>(styles)(SectionHeadingRenderer);
