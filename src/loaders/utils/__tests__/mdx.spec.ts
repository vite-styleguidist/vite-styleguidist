// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// The Markdown pipeline's compiler, so the heading-id tests below can compare the ids the
// two pipelines produce for the same document instead of hard-coding one of them.
import { compiler } from 'markdown-to-jsx/react';
// The `.md` pipeline's splitter: a Markdown page is rendered one chunk at a time, and that
// is what makes the two pipelines' heading ids comparable only chunk by chunk.
import chunkify from '../chunkify.js';
import parseMdx, {
	isMdxAvailable,
	isMdxFile,
	missingMdxMessage,
	toMdxCompileError,
	MissingMdxError,
} from '../mdx.js';
import type * as Rsg from '../../../typings/index.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');

let dir: string;
let file: string;

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-mdx-'));
	file = path.join(dir, 'Readme.mdx');
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

// @mdx-js/mdx is resolved from the style guide’s directory first, so point configDir at
// the repository: that is where the optional peer dependency is installed
const createConfig = (overrides: Partial<Rsg.SanitizedStyleguidistConfig> = {}) =>
	({
		configDir: REPO_ROOT,
		context: {},
		mdx: {},
		...overrides,
	}) as unknown as Rsg.SanitizedStyleguidistConfig;

const parse = (source: string, overrides?: Partial<Rsg.SanitizedStyleguidistConfig>) =>
	parseMdx(createConfig(overrides), { file }, source);

describe('isMdxFile', () => {
	it('should only accept the .mdx extension', () => {
		expect(isMdxFile('/a/Readme.mdx')).toBe(true);
		expect(isMdxFile('/a/Readme.MDX')).toBe(true);
		expect(isMdxFile('/a/Readme.md')).toBe(false);
		expect(isMdxFile('/a/mdx.js')).toBe(false);
	});
});

describe('playground fences', () => {
	it('should collect every playground language and no-language fences', async () => {
		const langs = ['js', 'jsx', 'javascript', 'ts', 'tsx', 'typescript'];
		const source = [
			...langs.map((lang) => '```' + lang + '\n<Button/>\n```'),
			'```\n<Button/>\n```',
		].join('\n\n');

		const { examples } = await parse(source);

		expect(examples).toHaveLength(langs.length + 1);
		expect(examples.map((example) => example.lang)).toEqual([...langs, undefined]);
		expect(examples.every((example) => example.type === 'code')).toBe(true);
	});

	it('should number the playgrounds in document order, prose not counted', async () => {
		const source = ['One', '```jsx\n<A/>\n```', 'Two', '```jsx\n<B/>\n```'].join('\n\n');

		const { code, examples, chunks } = await parse(source);

		expect(examples.map((example) => example.content)).toEqual(['<A/>', '<B/>']);
		// The placeholders the client renders carry the same ordinals
		expect(code).toMatch(/<RsgPlayground index=\{0\}/);
		expect(code).toMatch(/<RsgPlayground index=\{1\}/);
		expect(
			chunks.filter((chunk) => chunk.type === 'code').map((chunk: any) => chunk.index)
		).toEqual([0, 1]);
	});

	it('should parse space-separated and JSON modifiers, lowercasing the keys', async () => {
		const source = [
			'```jsx padded noeditor\n<A/>\n```',
			'```js { "props": { "className": "checks" }, "Padded": true }\n<B/>\n```',
		].join('\n\n');

		const { examples } = await parse(source);

		expect(examples[0].settings).toEqual({ padded: true, noeditor: true });
		expect(examples[1].settings).toEqual({ props: { className: 'checks' }, padded: true });
	});

	it('should show the same error as Markdown for malformed modifiers', async () => {
		const { code, examples } = await parse('```jsx {oops}\n<A/>\n```');

		expect(examples).toHaveLength(0);
		expect(code).toMatch('Cannot parse modifiers for');
	});
});

describe('static fences', () => {
	it('should highlight a non-playground language at build time', async () => {
		const { code, examples } = await parse('```html\n<button class="btn"/>\n```');

		expect(examples).toHaveLength(0);
		expect(code).toMatch('RsgStatic');
		expect(code).toMatch('lang="html"');
		expect(code).toMatch('token tag');
	});

	it('should route a `static` playground fence through RsgStatic too', async () => {
		const { code, examples } = await parse('```jsx static\nimport Button from "./Button";\n```');

		expect(examples).toHaveLength(0);
		expect(code).toMatch('RsgStatic');
		expect(code).toMatch('lang="jsx"');
	});
});

describe('updateExample', () => {
	it('should run before the static/playground decision, so it can flip a fence', async () => {
		const updateExample = vi.fn((props) =>
			props.settings?.flipme ? { ...props, settings: { static: true } } : props
		);

		const { examples } = await parse(
			['```jsx flipme\n<A/>\n```', '```jsx\n<B/>\n```'].join('\n\n'),
			{ updateExample }
		);

		expect(examples.map((example) => example.content)).toEqual(['<B/>']);
		expect(updateExample).toHaveBeenCalledWith(expect.objectContaining({ content: '<A/>' }), file);
	});
});

describe('__COMPONENT__', () => {
	it('should be expanded in a default example', async () => {
		const { examples } = await parseMdx(
			createConfig(),
			{ file, displayName: 'Pizza', shouldShowDefaultExample: true },
			'```jsx\n<__COMPONENT__/>\n```'
		);

		expect(examples[0].content).toBe('<Pizza/>');
	});
});

describe('chunks', () => {
	it('should keep prose, JSX and static fences, and drop the ESM machinery', async () => {
		const source = [
			"import Callout from './Callout.jsx';",
			'Some **prose**.',
			'<Callout kind="info">Hi</Callout>',
			'export const answer = 42;',
			'```jsx\n<A/>\n```',
			'```html\n<b/>\n```',
		].join('\n\n');

		const { chunks } = await parse(source);

		expect(chunks).toEqual([
			{ type: 'markdown', content: 'Some **prose**.\n\n<Callout kind="info">Hi</Callout>' },
			{ type: 'code', content: '<A/>', lang: 'jsx', settings: {}, index: 0 },
			{ type: 'markdown', content: '```html\n<b/>\n```' },
		]);
	});
});

/**
 * The heading ids of a compiled MDX module, in document order; `null` for a heading that
 * got none. The compiled JSX is `<_components.h2 id="...">`, see src/loaders/utils/mdx.ts.
 */
const mdxHeadingIds = (code: string): (string | null)[] =>
	[...code.matchAll(/<_components\.h[1-6](?:\s+id="([^"]*)")?/g)].map((match) => match[1] ?? null);

/** The heading ids one `compiler()` call — one rendered `<Markdown>` block — produces. */
const compiledHeadingIds = (markdown: string): (string | null)[] => {
	const ids: (string | null)[] = [];
	const walk = (node: any): void => {
		if (Array.isArray(node)) {
			node.forEach(walk);
			return;
		}
		if (node && typeof node === 'object' && node.props) {
			if (typeof node.type === 'string' && /^h[1-6]$/.test(node.type)) {
				ids.push(node.props.id ?? null);
			}
			walk(node.props.children);
		}
	};
	walk(compiler(markdown, { forceBlock: true }));
	return ids;
};

/**
 * The heading ids markdown-to-jsx puts in the DOM for the same source — the `.md` pipeline
 * as the client actually runs it.
 *
 * Not one `compiler()` call over the document: `chunkify` splits a Markdown page at every
 * fence and Examples renders one `<Markdown>` per markdown chunk (Examples.tsx), so one
 * call is one *chunk*. That matters because markdown-to-jsx's duplicate-heading table lives
 * inside a call: compiling the whole document at once hides the only shape in which the two
 * pipelines disagree, which is exactly what this comparison is here to catch.
 */
const markdownHeadingIds = (source: string): (string | null)[] =>
	chunkify(source).flatMap((chunk) =>
		chunk.type === 'markdown' ? compiledHeadingIds(chunk.content) : []
	);

describe('heading ids', () => {
	it('should give every heading an id, so fragment links work on an MDX page', async () => {
		const { code } = await parse('# Page title\n\n## Usage & setup\n\n### Nested *heading*');

		expect(mdxHeadingIds(code)).toEqual(['page-title', 'usage--setup', 'nested-heading']);
	});

	it('should suffix a heading repeated in the same file', async () => {
		const { code } = await parse('## Usage\n\n## Usage\n\n### usage');

		expect(mdxHeadingIds(code)).toEqual(['usage', 'usage-1', 'usage-2']);
	});

	it('should start the numbering again for the next file (one slugger per file)', async () => {
		const source = '## Usage\n\n## Usage';

		const first = await parse(source);
		const second = await parse(source);

		// A slugger shared between files would number the second file usage-2, usage-3, and the
		// same page would then get different ids depending on what was compiled before it
		expect(mdxHeadingIds(first.code)).toEqual(mdxHeadingIds(second.code));
	});

	it('should ignore a `#` inside a fenced code block', async () => {
		const { code } = await parse(
			[
				'## Real heading',
				'```jsx\n# Not a heading\n<A/>\n```',
				'```html\n<h1># Nope</h1>\n```',
			].join('\n\n')
		);

		// One heading, and the two fences became the elements the client renders
		expect(mdxHeadingIds(code)).toEqual(['real-heading']);
		expect(code).toMatch('<RsgPlayground index={0}');
		expect(code).toMatch('RsgStatic');
		// Nothing inside the fences grew an id
		expect(code).not.toMatch('not-a-heading');
		expect(code).not.toMatch('nope');
	});

	it('should give a heading nested in a blockquote or a list an id too', async () => {
		const { code } = await parse('> ## Quoted heading\n\n- item\n\n## Plain heading');

		expect(mdxHeadingIds(code)).toEqual(['quoted-heading', 'plain-heading']);
	});

	it('should leave a heading with nothing to slugify alone rather than emit an empty id', async () => {
		// markdown-to-jsx drops every character it cannot transliterate, so this heading has an
		// empty id on a `.md` page as well — neither is a link target, and an empty attribute is
		// the worse of the two. The second one must not become `id="-1"` either.
		const { code } = await parse('## 日本語の見出し\n\n## 見出し\n\n## Fine');

		expect(mdxHeadingIds(code)).toEqual([null, null, 'fine']);
	});

	it('should produce exactly the ids the Markdown pipeline produces for the same document', async () => {
		// The contract this pass exists for: a link written against a page must keep working when
		// the page is rewritten from `.md` to `.mdx`. It also pins markdown-to-jsx: an upgrade
		// that changed its slug algorithm fails here instead of silently breaking every link.
		const source = [
			'# Top level',
			'## Usage & setup',
			'### `useFoo()` hook',
			'## Ünïcode — dash',
			'## 1. First step',
			'## Props / API',
			'## Some Heading, with punctuation!',
			'### Deep *emphasis* heading',
			'## CamelCase Name',
			'## a--b',
			'## emoji 🎉 heading',
			'## 100% done',
			'## Hello_World-Test',
			'## [A link](https://example.com) heading',
			'## Usage & setup',
		].join('\n\n');

		const { code } = await parse(source);

		expect(mdxHeadingIds(code)).toEqual(markdownHeadingIds(source));
		// …and not vacuously equal because both are empty
		expect(mdxHeadingIds(code)).toEqual([
			'top-level',
			'usage--setup',
			'usefoo-hook',
			'unicode--dash',
			'1-first-step',
			'props--api',
			'some-heading-with-punctuation',
			'deep-emphasis-heading',
			'camelcase-name',
			'a--b',
			'emoji--heading',
			'100-done',
			'helloworld-test',
			'a-link-heading',
			'usage--setup-1',
		]);
	});

	it('should differ from the Markdown pipeline only for a heading repeated across an example', async () => {
		// The one shape where the two disagree, pinned so it cannot widen unnoticed. A `.md`
		// page is rendered one chunk at a time and markdown-to-jsx counts duplicates within a
		// chunk, so the second `## Usage` here starts a new count; the MDX pass has one
		// slugger per file and suffixes it. Component Readme files, where headings and
		// playgrounds alternate, are exactly this shape — Documenting.md says so.
		const source = ['## Usage', '```jsx', '<Button />', '```', '## Usage'].join('\n\n');

		const { code } = await parse(source);

		expect(mdxHeadingIds(code)).toEqual(['usage', 'usage-1']);
		expect(markdownHeadingIds(source)).toEqual(['usage', 'usage']);
		// …and with nothing between them, one chunk, the two agree again
		const together = '## Usage\n\n## Usage';
		expect(markdownHeadingIds(together)).toEqual(['usage', 'usage-1']);
		expect(mdxHeadingIds((await parse(together)).code)).toEqual(['usage', 'usage-1']);
	});

	it('should let a user remark plugin override the id', async () => {
		// `mdx.remarkPlugins` run after this pass, which is the precedence a user expects from a
		// plugin they added on purpose (remark-heading-id and friends set the same field).
		const ownIds = () => (tree: any) => {
			for (const node of tree.children) {
				if (node.type === 'heading') {
					node.data = { hProperties: { id: 'mine' } };
				}
			}
		};

		const { code } = await parse('## Usage', { mdx: { remarkPlugins: [ownIds] } });

		expect(mdxHeadingIds(code)).toEqual(['mine']);
	});
});

describe('GFM', () => {
	it('should be enabled by default', async () => {
		const { code } = await parse('| a | b |\n| - | - |\n| 1 | 2 |');

		expect(code).toMatch('_components.table');
	});

	it('should be replaced by the mdx.remarkPlugins option', async () => {
		const { code } = await parse('| a | b |\n| - | - |\n| 1 | 2 |', { mdx: { remarkPlugins: [] } });

		expect(code).not.toMatch('_components.table');
	});
});

describe('errors', () => {
	it('should name the file, the reason and the position of a syntax error', async () => {
		const source = 'Fine.\n\n<Callout>\n';

		const error: any = await parse(source).catch((err) => err);

		expect(error.message).toMatch(file);
		expect(error.message).toMatch('Callout');
		// The position lives only inside the reason text for this class of error
		expect(error.loc).toEqual({ file, line: 3, column: 0 });
		expect(error.frame).toMatch('> 3 | <Callout>');
	});

	it('should build a code frame pointing at the failing line', () => {
		const error = toMdxCompileError(
			{ reason: 'Boom', line: 2, column: 3 },
			'/a/b.mdx',
			'a\nbcd\ne'
		);

		expect(error.message).toBe('/a/b.mdx: Boom');
		expect(error.loc).toEqual({ file: '/a/b.mdx', line: 2, column: 2 });
		expect(error.frame).toBe(['  1 | a', '> 2 | bcd', '  3 | e', '    |   ^'].join('\n'));
	});

	it('should tell the user which package to install when @mdx-js/mdx is missing', () => {
		const message = missingMdxMessage('/a/Readme.mdx');

		expect(message).toMatch('npm install --save-dev @mdx-js/mdx');
		expect(message).toMatch('/a/Readme.mdx');
		expect(new MissingMdxError('/a/Readme.mdx').message).toBe(message);
	});

	it('should find the optional peer dependency from the style guide directory', () => {
		expect(isMdxAvailable(REPO_ROOT)).toBe(true);
	});
});
