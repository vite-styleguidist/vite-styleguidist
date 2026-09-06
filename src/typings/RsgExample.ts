import type { ComponentType } from 'react';

export interface MarkdownExample {
	type: 'markdown';
	content: string;
	settings?: Record<string, any>;
}

export interface CodeExample {
	type: 'code';
	content: string;
	lang?: string | null;
	settings?: Record<string, any>;
}

export interface RuntimeCodeExample extends CodeExample {
	evalInContext(a: string): () => any;
}

/**
 * A whole MDX page: one React component plus the playgrounds it contains.
 *
 * The `rsg-mdx:` virtual module exports an array of exactly one of these, so that the
 * consumers of `examples` and `content` (which are arrays) need no special case.
 */
export interface MdxExample {
	type: 'mdx';
	/** The compiled page. `components` maps element names and JSX tags to React components. */
	Content: ComponentType<{ components?: Record<string, unknown> }>;
	/** Playgrounds in document order; `examples[i]` is the i-th playground of the page. */
	examples: RuntimeCodeExample[];
}

export type Example = RuntimeCodeExample | MarkdownExample | MdxExample;
