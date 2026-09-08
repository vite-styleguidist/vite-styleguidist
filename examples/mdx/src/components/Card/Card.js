import React from 'react';
import PropTypes from 'prop-types';

import './Card.css';

/**
 * A titled box to group content. Documented in MDX, and its page imports a component of
 * its own to show that MDX prose and design-system components can be mixed.
 */
export default function Card({ title, children }) {
	return (
		<section className="card">
			{title && <h4 className="card-title">{title}</h4>}
			<div className="card-body">{children}</div>
		</section>
	);
}

Card.propTypes = {
	/** Heading shown at the top of the card */
	title: PropTypes.string,
	/** Card content */
	children: PropTypes.node,
};
