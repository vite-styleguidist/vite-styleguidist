// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
