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
 * A whole `.mdx` page: one compiled React component plus the playgrounds it renders.
 *
 * The `rsg-mdx:` virtual module exports an array holding a single chunk of this type (see
 * docs/decisions/0014-mdx-examples.md), so every consumer of `component.props.examples` and
 * `section.content` keeps seeing an array and needs no special case. `Content` is what
 * `@mdx-js/mdx` compiled; its `components` prop maps element names and JSX tags to React
 * components.
 *
 * `examples[i]` is the i-th playground **of the page**: unlike the `.md` chunk list, prose is
 * not counted, because an MDX page has no prose chunks to count. That is the number the
 * isolated-example URL uses (`#!/Button/1` is the second playground).
 */
export interface MdxExample {
	type: 'mdx';
	Content: ComponentType<{ components?: Record<string, unknown> }>;
	examples: RuntimeCodeExample[];
}

export type Example = RuntimeCodeExample | MarkdownExample | MdxExample;
