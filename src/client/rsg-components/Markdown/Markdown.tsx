import React, { isValidElement, PropsWithChildren } from 'react';
import PropTypes from 'prop-types';
import { compiler } from 'markdown-to-jsx/react';
import stripHtmlComments from 'strip-html-comments';
import Text from 'rsg-components/Text';
import markdownRenderers from 'rsg-components/Markdown/markdownRenderers';

/**
 * The element map markdown-to-jsx renders documents with.
 *
 * It lives in `markdownRenderers.tsx` so the MDX page renderer can build its own component
 * map from the very same renderers (`MdxPage/mdxComponents.tsx`); this alias is kept because
 * `baseOverrides` is the name the option has always had here.
 */
export const baseOverrides = markdownRenderers;

export const inlineOverrides = {
	...baseOverrides,
	p: {
		component: Text,
	},
};

interface MarkdownProps {
	text: string;
	inline?: boolean;
}

/**
 * Rebuild markdown-to-jsx output through React.createElement so it renders
 * under Preact too.
 *
 * markdown-to-jsx v9 fabricates elements as plain object literals instead of
 * calling createElement, and its `createElement` option is bypassed for the
 * `forceBlock` root wrapper and some raw-HTML nodes (verified in v9.10.2's
 * source), so that option alone cannot fix this. React renders the fabricated
 * objects fine, but Preact's diff silently drops any vnode whose `constructor`
 * is not `undefined` (its JSON-injection guard) — so with `react` aliased to
 * `preact/compat` (see examples/preact) every piece of markdown would render
 * as nothing. Recreating each node via createElement yields real elements of
 * whichever implementation `react` resolves to; under real React the rendered
 * HTML is byte-identical, so this is a no-op there.
 */
function reviveElements(node: React.ReactNode): React.ReactNode {
	if (Array.isArray(node)) {
		return node.map(reviveElements);
	}
	if (isValidElement(node)) {
		// `isValidElement` matches the fabricated nodes in both React and
		// preact/compat because markdown-to-jsx stamps them with the `$$typeof`
		// it probes from the host's own createElement.
		const { children, ...props } = (node.props ?? {}) as PropsWithChildren<Record<string, unknown>>;
		if (node.key != null) {
			// createElement extracts `key` from the props object it receives.
			props.key = node.key;
		}
		if (children !== undefined) {
			props.children = reviveElements(children);
		}
		return React.createElement(node.type as React.ElementType, props);
	}
	return node;
}

export const Markdown: React.FunctionComponent<MarkdownProps> = ({ text, inline }) => {
	const overrides = inline ? inlineOverrides : baseOverrides;
	return reviveElements(compiler(stripHtmlComments(text), { overrides, forceBlock: true }));
};

Markdown.propTypes = {
	text: PropTypes.string.isRequired,
	inline: PropTypes.bool,
};

export default Markdown;
