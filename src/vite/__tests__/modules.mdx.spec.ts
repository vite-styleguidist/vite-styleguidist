// @vitest-environment node
/**
 * The `virtual:rsg-mdx?` virtual module. The contract the client codes against lives here: an
 * array of one `{ type: 'mdx', Content, examples }` chunk, whose examples are the same
 * runtime code examples a Markdown file produces.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import generateMdxModule, { prepareMdxProgram } from '../modules/mdx.js';
import type * as Rsg from '../../typings/index.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

let dir: string;
let file: string;

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-mdx-module-'));
	file = path.join(dir, 'Readme.mdx');
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

const config = () =>
	({
		configDir: REPO_ROOT,
		context: { cx: 'clsx' },
		mdx: {},
	}) as unknown as Rsg.SanitizedStyleguidistConfig;

const generate = async (
	source: string,
	options: Partial<Rsg.ExamplesModuleOptions> = {}
): Promise<string> =>
	(await generateMdxModule(config(), { file, ...options }, source, { isProduction: true })).code;

describe('the generated module', () => {
	it('should export an array of one mdx chunk with the page component and its examples', async () => {
		const code = await generate(['Prose', '```jsx\n<A/>\n```'].join('\n\n'));

		expect(code).toMatch('export default [');
		expect(code).toMatch('type: "mdx"');
		expect(code).toMatch('Content: MDXContent');
		expect(code).toMatch('"content": "<A/>"');
		// Every playground carries the same evalInContext binding the Markdown path gives it
		expect(code).toMatch('"evalInContext": _rsgEvalInContext');
	});

	it('should build the require map from the fences, React and the documented component', async () => {
		const componentPath = path.join(dir, 'Button.js');
		const code = await generate("```jsx\nimport chunk from 'lodash/chunk';\n<A/>\n```", {
			displayName: 'Button',
			componentPath,
		});

		expect(code).toMatch('"lodash/chunk":');
		expect(code).toMatch('"react":');
		expect(code).toMatch(JSON.stringify(componentPath.split(path.sep).join('/')));
		// `context` config option
		expect(code).toMatch('"clsx":');
	});

	it('should lower the JSX of the page (the React plugin never sees this module)', async () => {
		const code = await generate('# Hi');

		expect(code).toMatch('react/jsx-runtime');
		expect(code).not.toMatch(/<_components\.h1/);
	});

	it('should resolve relative page imports against the .mdx file', async () => {
		const code = await generate(
			["import Callout from './Callout.jsx';", '<Callout/>'].join('\n\n')
		);

		expect(code).toMatch(JSON.stringify(path.join(dir, 'Callout.jsx').split(path.sep).join('/')));
		expect(code).not.toMatch("'./Callout.jsx'");
	});

	it('should leave bare page imports to the plugin’s resolveId fallback', async () => {
		const code = await generate(["import cx from 'clsx';", '<p/>'].join('\n\n'));

		expect(code).toMatch('from "clsx"');
	});
});

describe('prepareMdxProgram', () => {
	it('should demote the default export to a local binding and report its name', () => {
		const result = prepareMdxProgram('export default function MDXContent() {}', '/a/b.mdx');

		expect(result.content).toBe('MDXContent');
		expect(result.code).toBe('function MDXContent() {}');
	});

	it('should demote an anonymous default export', () => {
		const result = prepareMdxProgram('export default (props) => props;', '/a/b.mdx');

		expect(result.content).toBe('_rsgMdxContent');
		expect(result.code).toBe('const _rsgMdxContent = ((props) => props);');
	});

	it('should demote named exports, which stay usable inside the page only', () => {
		const result = prepareMdxProgram(
			'export const answer = 42;\nexport default function C() { return answer; }',
			'/a/b.mdx'
		);

		expect(result.code).toMatch('const answer = 42;');
		expect(result.code).not.toMatch('export');
	});

	it('should drop re-exports', () => {
		const result = prepareMdxProgram(
			"export * from './x.js';\nexport {a} from './y.js';\nexport default function C() {}",
			'/a/b.mdx'
		);

		expect(result.code).not.toMatch('export');
		expect(result.code).not.toMatch('./x.js');
	});

	it('should throw when the compiled program has no default export', () => {
		expect(() => prepareMdxProgram('const a = 1;', '/a/b.mdx')).toThrow('no default export');
	});
});
