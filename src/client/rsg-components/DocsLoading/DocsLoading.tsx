import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DocsLoadingRenderer from 'rsg-components/DocsLoading/DocsLoadingRenderer';

/**
 * How long a pending state stays invisible.
 *
 * Most loads finish well inside this: the documentation of a component is one small module
 * from the same server the page came from, and on the dev server or a warm cache it is
 * back in a few dozen milliseconds. A spinner that appears and disappears again inside a
 * tenth of a second is worse than no spinner at all — it reads as a flicker, not as
 * progress — so nothing is drawn until a load has been slow enough to be worth mentioning.
 * 200 ms is about where a delay stops feeling instantaneous.
 */
export const DOCS_LOADING_GRACE = 200;

export interface DocsLoadingProps {
	/** `loading` while the documentation is on its way, `error` once a load has failed. */
	status?: 'loading' | 'error';
	/** The component whose documentation this stands in for. */
	name: string;
	/** The message of the failed load, when there is one. */
	error?: string;
}

/**
 * The body of a component whose documentation has not arrived (`lazyDocs`, ADR 0019).
 *
 * This is the grace period and nothing else; the drawing is `DocsLoadingRenderer`, and both
 * halves are replaceable through `styleguideComponents`. An error is shown at once — it is
 * not going to resolve itself, and by definition the load it comes from was not fast.
 */
const DocsLoading: React.FunctionComponent<DocsLoadingProps> = ({
	status = 'loading',
	name,
	error,
}) => {
	const [graceElapsed, setGraceElapsed] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setGraceElapsed(true), DOCS_LOADING_GRACE);
		return () => clearTimeout(timer);
	}, []);

	if (status === 'loading' && !graceElapsed) {
		return null;
	}

	return <DocsLoadingRenderer status={status} name={name} error={error} />;
};

DocsLoading.propTypes = {
	status: PropTypes.oneOf(['loading', 'error'] as const),
	name: PropTypes.string.isRequired,
	error: PropTypes.string,
};

export default DocsLoading;
