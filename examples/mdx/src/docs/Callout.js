import React from 'react';
import PropTypes from 'prop-types';

import './Callout.css';

/**
 * Page furniture for the MDX pages of this example: a coloured box that the `.mdx` files
 * import and use as a JSX element. It lives outside the `components` glob on purpose, so it
 * is a building block of the documentation rather than a documented component itself.
 */
export default function Callout({ kind = 'info', children }) {
	return (
		<aside className={`callout callout-${kind}`}>
			<strong className="callout-kind">{kind}</strong>
			<div className="callout-body">{children}</div>
		</aside>
	);
}

Callout.propTypes = {
	/** Callout content */
	children: PropTypes.node,
	/** Which flavour of callout to render */
	kind: PropTypes.oneOf(['info', 'warning']),
};
