import React from 'react';
import PropTypes from 'prop-types';
import Section from 'rsg-components/Section';
import SectionsRenderer from 'rsg-components/Sections/SectionsRenderer';
import type * as Rsg from '../../../typings/index.js';

const Sections: React.FunctionComponent<{
	sections: Rsg.Section[];
	depth: number;
	/** The list on the root page; by default the list at depth 1 (StyleGuide renders it so) */
	root?: boolean;
}> = ({ sections, depth, root = depth === 1 }) => {
	return (
		<SectionsRenderer root={root}>
			{sections
				.filter((section) => !section.externalLink)
				.map((section, idx) => (
					<Section key={idx} section={section} depth={depth} />
				))}
		</SectionsRenderer>
	);
};

Sections.propTypes = {
	sections: PropTypes.array.isRequired,
	depth: PropTypes.number.isRequired,
	root: PropTypes.bool,
};

export default Sections;
