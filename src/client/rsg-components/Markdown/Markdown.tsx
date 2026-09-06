import React, { isValidElement, PropsWithChildren } from 'react';
import PropTypes from 'prop-types';
import { compiler } from 'markdown-to-jsx/react';
import stripHtmlComments from 'strip-html-comments';
import Link from 'rsg-components/Link';
import Text from 'rsg-components/Text';
import Para from 'rsg-components/Para';
import MarkdownHeading from 'rsg-components/Markdown/MarkdownHeading';
import List from 'rsg-components/Markdown/List';
import Blockquote from 'rsg-components/Markdown/Blockquote';
import PreBase, { PreProps } from 'rsg-components/Markdown/Pre';
import Code from 'rsg-components/Code';
import Checkbox from 'rsg-components/Markdown/Checkbox';
import Hr from 'rsg-components/Markdown/Hr';
import Img from 'rsg-components/Markdown/Img';
import { Details, DetailsSummary } from 'rsg-components/Markdown/Details';
import { Table, TableHead, TableBody, TableRow, TableCell } from 'rsg-components/Markdown/Table';

const Pre = (props: PreProps) => {
	if (isValidElement(props.children)) {
		// Avoid rendering <Code> inside <Pre>
		return <PreBase {...(props.children.props as PreProps)} />;
	}
	return <PreBase {...props} />;
};
Pre.propTypes = {
	children: PropTypes.node,
};

export const baseOverrides = {
	a: {
		component: Link as React.FC,
	},
	h1: {
		component: MarkdownHeading as React.FC,
		props: {
			level: 1,
		},
	},
	h2: {
		component: MarkdownHeading as React.FC,
		props: {
			level: 2,
		},
	},
	h3: {
		component: MarkdownHeading as React.FC,
		props: {
			level: 3,
		},
	},
	h4: {
		component: MarkdownHeading as React.FC,
		props: {
			level: 4,
		},
	},
	h5: {
		component: MarkdownHeading as React.FC,
		props: {
			level: 5,
		},
	},
	h6: {
		component: MarkdownHeading as React.FC,
		props: {
			level: 6,
		},
	},
	p: {
		component: Para as React.FC,
		props: {
			semantic: 'p',
		},
	},
	em: {
		component: Text as React.FC,
		props: {
			semantic: 'em',
		},
	},
	strong: {
		component: Text as React.FC,
		props: {
			semantic: 'strong',
		},
	},
	ul: {
		component: List as React.FC,
	},
	ol: {
		component: List as React.FC,
		props: {
			ordered: true,
		},
	},
	blockquote: {
		component: Blockquote as React.FC,
	},
	code: {
		component: Code as React.FC,
	},
	pre: {
		component: Pre as React.FC<PropsWithChildren>,
	},
	input: {
		component: Checkbox as React.FC,
	},
	hr: {
		component: Hr as React.FC,
	},
	img: {
		component: Img as React.FC,
	},
	table: {
		component: Table as React.FC,
	},
	thead: {
		component: TableHead as React.FC,
	},
	th: {
		component: TableCell as React.FC,
		props: {
			header: true,
		},
	},
	tbody: {
		component: TableBody as React.FC,
	},
	tr: {
		component: TableRow as React.FC,
	},
	td: {
		component: TableCell as React.FC,
	},
	details: {
		component: Details as React.FC,
	},
	summary: {
		component: DetailsSummary as React.FC,
	},
};

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
