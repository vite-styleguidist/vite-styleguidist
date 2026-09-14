import React, { isValidElement, PropsWithChildren } from 'react';
import PropTypes from 'prop-types';
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

export const Pre = (props: PreProps) => {
	if (isValidElement(props.children)) {
		// Avoid rendering <Code> inside <Pre>
		return <PreBase {...(props.children.props as PreProps)} />;
	}
	return <PreBase {...props} />;
};
Pre.propTypes = {
	children: PropTypes.node,
};

/**
 * One HTML element of a Markdown document mapped onto a style guide component, in the shape
 * markdown-to-jsx’s `overrides` option takes: the component plus the props that are fixed for
 * that element (the heading level, the semantic tag).
 */
export interface MarkdownRenderer {
	component: React.FC<any>;
	props?: Record<string, unknown>;
}

/**
 * The style guide’s renderers for the HTML elements a document can produce.
 *
 * Shared on purpose by the two prose pipelines so they cannot drift and a
 * `styleguideComponents` override lands in both:
 *
 * - `Markdown.tsx` passes this object to markdown-to-jsx as its `overrides` map (`.md`
 *   examples, section content, component descriptions, JSDoc text);
 * - `MdxPage/mdxComponents.tsx` turns it into MDX’s flat `components` map (`.mdx` pages).
 *
 * Keep it in the `overrides` shape rather than plain components: markdown-to-jsx reads
 * `{component, props}` directly, so the `.md` path stays byte for byte what it was before the
 * extraction, and the MDX side binds the fixed props itself (it is the shorter of the two adapters).
 */
export const markdownRenderers: Record<string, MarkdownRenderer> = {
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

export default markdownRenderers;
