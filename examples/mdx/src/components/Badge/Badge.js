import React from 'react';
import PropTypes from 'prop-types';

import './Badge.css';

/**
 * A small status label. This one is deliberately still documented in `Readme.md`: a style
 * guide may mix Markdown and MDX pages freely, and `.md` wins when both files exist.
 */
export default function Badge({ tone = 'neutral', children }) {
	return <span className={`badge badge-${tone}`}>{children}</span>;
}

Badge.propTypes = {
	/** Badge label */
	children: PropTypes.node.isRequired,
	/** Visual tone of the badge */
	tone: PropTypes.oneOf(['neutral', 'success', 'warning']),
};
