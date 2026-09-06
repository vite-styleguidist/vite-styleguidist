import React from 'react';
import PropTypes from 'prop-types';
import Styled, { JssInjectedProps } from 'rsg-components/Styled';
import { Styles } from 'jss';
import SectionHeading from 'rsg-components/SectionHeading';
import Markdown from 'rsg-components/Markdown';
import { PROSE_MAX_WIDTH } from 'rsg-components/ReactComponent/ReactComponentRenderer';
import type * as Rsg from '../../../typings/index.js';

const styles = ({ color, fontSize, lineHeight, space, mq }: Rsg.Theme): Styles => ({
	root: {
		// The blocks of a section (header, content, nested sections, components) are stacked
		// with one gap; sibling sections are spaced by the Sections list
		display: 'flex',
		flexDirection: 'column',
		gap: space[4],
		[mq.small]: {
			gap: space[3],
		},
	},
	header: {
		display: 'flex',
		flexDirection: 'column',
		// Not on the space scale: 10px between the name and the description, as in a component header
		gap: 10,
		[mq.small]: {
			gap: space[1],
		},
	},
	description: {
		maxWidth: PROSE_MAX_WIDTH,
		// 16px from the heading: the header gap plus these 6 (4 on small screens)
		marginTop: 6,
		[mq.small]: {
			marginTop: space[0],
		},
		color: color.base,
		fontSize: fontSize.text,
		lineHeight: lineHeight.base,
		// The section gap replaces the bottom margin of the last Markdown paragraph
		// (Markdown wraps several blocks in a div, hence the second selector)
		'& > :last-child, & > div > :last-child': {
			isolate: false,
			marginBottom: 0,
		},
	},
});

interface SectionRendererProps extends JssInjectedProps {
	slug: string;
	depth: number;
	name?: string;
	description?: string;
	content?: React.ReactNode;
	components?: React.ReactNode;
	sections?: React.ReactNode;
	isolated?: boolean;
	pagePerSection?: boolean;
	[prop: string]: any;
}

export const SectionRenderer: React.FunctionComponent<SectionRendererProps> = (allProps) => {
	const { classes, name, slug, content, components, sections, depth, description, pagePerSection } =
		allProps;

	return (
		<section className={classes.root} data-testid={`section-${slug}`}>
			{(name || description) && (
				<header className={classes.header}>
					{name && (
						<SectionHeading
							depth={depth}
							id={slug}
							slotName="sectionToolbar"
							pagePerSection={pagePerSection}
							slotProps={allProps}
						>
							{name}
						</SectionHeading>
					)}
					{description && (
						<div className={classes.description}>
							<Markdown text={description} />
						</div>
					)}
				</header>
			)}
			{content}
			{sections}
			{components}
		</section>
	);
};

SectionRenderer.propTypes = {
	classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
	name: PropTypes.string,
	description: PropTypes.string,
	slug: PropTypes.string.isRequired,
	content: PropTypes.any,
	components: PropTypes.any,
	sections: PropTypes.any,
	isolated: PropTypes.bool,
	depth: PropTypes.number.isRequired,
	pagePerSection: PropTypes.bool,
};

export default Styled<SectionRendererProps>(styles)(SectionRenderer);
