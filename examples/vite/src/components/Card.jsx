import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

/**
 * A box with a title and some content.
 */
export default function Card({ title, children }) {
	return (
		<section className="card">
			{title && <h2 className="card__title">{title}</h2>}
			<div className="card__body">{children}</div>
		</section>
	);
}

Card.propTypes = {
	/** Card heading */
	title: PropTypes.string,
	/** Card content */
	children: PropTypes.node.isRequired,
};
