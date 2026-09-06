import React from 'react';
import PropTypes from 'prop-types';
import Pre from 'rsg-components/Markdown/Pre';

interface RsgStaticProps {
	/** Fence language, as written in the MDX (`html`, `css`, `bash`, …). */
	lang?: string;
	/** The fence content, already highlighted by Prism on the Node side. */
	html: string;
}

/**
 * The component the MDX loader puts in place of every fence that is *not* a playground.
 *
 * MDX has no raw HTML pass-through (raw HTML is JSX there), so the build-time Prism markup
 * travels in an attribute and is injected here. The `lang-*` class is the same signal the `.md`
 * path gives `PreRenderer`, which is what makes it inject the markup rather than escape it — so
 * static fences keep `styles.Pre`, the Prism theme and a `styleguideComponents.Pre` override.
 *
 * Without a language `highlightCode()` returns the source untouched, and the `.md` path renders
 * it as text; leaving the class off reproduces that exactly.
 */
const RsgStatic: React.FunctionComponent<RsgStaticProps> = ({ lang, html }) => (
	<Pre className={lang ? `lang-${lang}` : undefined}>{html}</Pre>
);

RsgStatic.propTypes = {
	lang: PropTypes.string,
	html: PropTypes.string.isRequired,
};

export default RsgStatic;
