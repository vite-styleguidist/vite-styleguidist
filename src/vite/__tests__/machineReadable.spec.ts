// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getConfig from '../../scripts/config.js';
import { collectSections } from '../modules/styleguide.js';
import { parseExamples } from '../modules/examples.js';
import {
	buildManifest,
	createManifestCache,
	renderDocsJson,
	renderLlmsFullTxt,
	renderLlmsTxt,
	renderMachineReadableFiles,
	toManifestExamples,
	unhighlight,
	printPropType,
	flattenComponents,
	MACHINE_READABLE_FILES,
	shiftHeadings,
} from '../machineReadable.js';
import type { DocsManifest, ManifestComponent } from '../machineReadable.js';
import type * as Rsg from '../../typings/index.js';

const testDir = path.resolve(import.meta.dirname, '../../../test');
const NOW = new Date('2026-09-06T12:00:00.000Z');
const quiet = { info() {}, warn() {}, debug() {} };

// getConfig() resolves paths against the current directory
const configIn = (
	dir: string,
	options: Rsg.StyleguidistConfig
): Rsg.SanitizedStyleguidistConfig => {
	const cwd = process.cwd();
	process.chdir(dir);
	try {
		return getConfig({ logger: quiet, ...options });
	} finally {
		process.chdir(cwd);
	}
};

const findComponent = (manifest: DocsManifest, name: string): ManifestComponent => {
	const found = flattenComponents(manifest.sections).find(
		({ component }) => component.name === name
	);
	if (!found) {
		throw new Error(`Component ${name} not found`);
	}
	return found.component;
};

describe('buildManifest', () => {
	let config: Rsg.SanitizedStyleguidistConfig;
	let manifest: DocsManifest;
	beforeAll(async () => {
		config = configIn(testDir, {
			components: 'components/**/[A-Z]*.js',
			defaultExample: true,
			title: 'Fixtures',
			version: '1.2.3',
		});
		manifest = await buildManifest(config, collectSections(config), { now: NOW });
	});

	it('should describe the style guide', async () => {
		expect(manifest).toMatchObject({
			schemaVersion: 1,
			source: 'vite-styleguidist',
			name: 'Fixtures',
			version: '1.2.3',
			generatedAt: '2026-09-06T12:00:00.000Z',
		});
	});

	it('should list the components in sidebar order', async () => {
		expect(manifest.sections).toHaveLength(1);
		// The `components` shortcut creates an unnamed section
		expect(manifest.sections[0]).toMatchObject({ name: null, slug: 'section-untitled' });
		expect(manifest.sections[0].components.map((component) => component.name)).toEqual([
			'Annotation',
			'Button',
			'Placeholder',
			'Price',
			'RandomButton',
		]);
	});

	it('should describe a component like the UI does', async () => {
		const button = findComponent(manifest, 'Button');
		expect(button).toMatchObject({
			name: 'Button',
			displayName: 'Button',
			visibleName: null,
			slug: 'button',
			href: 'index.html#button',
			filePath: 'components/Button/Button.js',
			description: 'The only true button.',
			tags: {},
			methods: [],
		});
		// Props are sorted like the props table: required first, then by name;
		// `@ignore`d props are left out
		expect(button.props).toEqual([
			{
				name: 'children',
				type: 'string',
				required: true,
				defaultValue: null,
				description: 'Button label.',
				tags: {},
			},
			{
				name: 'color',
				type: 'string',
				required: false,
				defaultValue: "'#333'",
				description: '',
				tags: {},
			},
			{
				name: 'size',
				type: 'oneOf: small | normal | large',
				required: false,
				defaultValue: "'normal'",
				description: '',
				tags: {},
			},
		]);
	});

	it('should list the examples with the prose before them', async () => {
		const button = findComponent(manifest, 'Button');
		expect(button.examples).toEqual([
			{
				index: 1,
				lang: 'jsx',
				code: '<Button>Push Me</Button>',
				settings: {},
				description: 'Basic button:',
			},
			{
				index: 3,
				lang: 'jsx',
				code: '<Button size="large" color="deeppink">Click Me</Button>',
				settings: {},
				description: 'Big pink button:',
			},
			{
				// A ```javascript fence is a playground too, and keeps its language
				index: 5,
				lang: 'javascript',
				code: "import React from 'react'",
				settings: {},
				description: expect.stringMatching(/^And you \*can\* \*\*use\*\* `any`[\s\S]*snippet:$/),
			},
		]);
		expect(button.notes).toBe('');
	});

	it('should use the default example for components without an examples file', async () => {
		expect(findComponent(manifest, 'Price').examples).toEqual([
			{
				index: 0,
				lang: 'jsx',
				code: '<Price>Default Example Usage</Price>',
				settings: {},
				description: '',
			},
		]);
	});

	it('should list public methods, drop tooling tags and keep the @example file prose', async () => {
		const placeholder = findComponent(manifest, 'Placeholder');
		expect(placeholder.methods).toEqual([
			{ name: 'getImageUrl', params: [], returns: null, description: 'A public method.', tags: {} },
		]);
		// `@example ./examples.md` is consumed (the file is inlined), `@see` and `@link` stay
		expect(Object.keys(placeholder.tags)).toEqual(['see', 'link']);
		expect(placeholder.examples).toEqual([
			{
				index: 0,
				lang: 'jsx',
				code: '<Placeholder type="beard"/>',
				settings: {},
				description: '',
			},
		]);
		// examples.md (from the doclet) has no playground: its prose ends up in the notes
		expect(placeholder.notes).toBe('Hello world!');
	});

	it('should be deterministic', async () => {
		const again = await buildManifest(config, collectSections(config), { now: NOW });
		expect(again).toEqual(manifest);
	});

	it('should pin generatedAt to SOURCE_DATE_EPOCH when set', async () => {
		vi.stubEnv('SOURCE_DATE_EPOCH', '1700000000');
		try {
			expect((await buildManifest(config, collectSections(config))).generatedAt).toBe(
				'2023-11-14T22:13:20.000Z'
			);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('should not link the unnamed section the components shortcut creates', async () => {
		expect(manifest.sections[0].name).toBeNull();
		expect(manifest.sections[0].href).toBeNull();
	});

	it('should honor skipComponentsWithoutExample', async () => {
		const filtered = await buildManifest(
			{ ...config, skipComponentsWithoutExample: true },
			undefined,
			{
				now: NOW,
			}
		);
		expect(flattenComponents(filtered.sections).map(({ component }) => component.name)).toEqual([
			'Button',
			'Placeholder',
		]);
	});
});

describe('buildManifest with sections', () => {
	let dir: string;
	beforeAll(async () => {
		// realpath: getConfig() resolves paths against process.cwd(), which is the real
		// path (/private/var/… on macOS), and the cache is keyed by those paths
		dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-manifest-')));
		fs.mkdirSync(path.join(dir, 'components'));
		fs.mkdirSync(path.join(dir, 'docs'));
		fs.writeFileSync(
			path.join(dir, 'components/Documented.js'),
			`import React from 'react';
import PropTypes from 'prop-types';

/**
 * A documented component.
 *
 * \`\`\`js
 * alert('Hello & <world>');
 * \`\`\`
 *
 * @visibleName The Documented One
 * @deprecated Use something else
 * @since 1.0.0
 * @status beta
 */
export default class Documented extends React.Component {
	static propTypes = {
		/**
		 * The size.
		 *
		 * @since 1.1.0
		 */
		size: PropTypes.oneOf(['s', 'l']).isRequired,
		/**
		 * Gets called on click.
		 *
		 * @param {SyntheticEvent} event The React event
		 */
		onClick: PropTypes.func,
		items: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, label: PropTypes.string })),
		union: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		dict: PropTypes.objectOf(PropTypes.bool),
		when: PropTypes.instanceOf(Date),
	};

	/**
	 * Insert text at cursor position.
	 *
	 * @param {string} text The text
	 * @param {number} [at=0] Position
	 * @returns {boolean} Whether it worked
	 * @public
	 */
	insertAtCursor(text, at) {
		return !!text && at >= 0;
	}

	render() {
		return <div />;
	}
}
`
		);
		fs.writeFileSync(
			path.join(dir, 'components/Documented.md'),
			`Static code is not an example:

\`\`\`js static
import Documented from './Documented'
\`\`\`

Basic:

\`\`\`jsx padded
<Documented size="s" />
\`\`\`

\`\`\`tsx { "props": { "className": "checks" } }
<Documented size="l" />
\`\`\`

Closing remarks with \`<b>bold</b>\` HTML.
`
		);
		fs.writeFileSync(
			path.join(dir, 'components/Typed.tsx'),
			`import React from 'react';

interface Props {
	/** Which one */
	kind: 'a' | 'b';
	/** Handler */
	onChange?: (value: string) => void;
	count?: number;
}

/** A TypeScript component. */
export default function Typed({ kind }: Props) {
	return <span>{kind}</span>;
}
`
		);
		fs.writeFileSync(
			path.join(dir, 'docs/Intro.md'),
			`# Welcome

Some **intro** text.

\`\`\`jsx
<Documented size="s" />
\`\`\`

\`\`\`html
<b>&amp;</b>
\`\`\`
`
		);
	});
	afterAll(async () => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const sectionsConfig = (options: Rsg.StyleguidistConfig = {}) =>
		configIn(dir, {
			title: 'Sections',
			sections: [
				{
					name: 'Documentation',
					content: 'docs/Intro.md',
					description: 'Read me first',
					sections: [{ name: 'Typed', components: 'components/Typed.tsx' }],
					sectionDepth: 1,
				},
				{ name: 'Components', components: 'components/Documented.js' },
				{
					name: 'Elsewhere',
					href: 'https://example.com/',
					external: true,
				},
			],
			...options,
		});

	it('should nest sections and keep their content pages as Markdown', async () => {
		const manifest = await buildManifest(sectionsConfig(), undefined, { now: NOW });
		expect(manifest.sections.map((section) => section.name)).toEqual([
			'Documentation',
			'Components',
			'Elsewhere',
		]);
		const [documentation, components, elsewhere] = manifest.sections;
		expect(documentation).toMatchObject({
			slug: 'section-documentation',
			href: 'index.html#section-documentation',
			description: 'Read me first',
			components: [],
		});
		// Playgrounds are written back as fenced code, highlighted code is un-highlighted
		expect(documentation.content).toBe(
			[
				'# Welcome',
				'',
				'Some **intro** text.',
				'',
				'```jsx',
				'<Documented size="s" />',
				'```',
				'',
				'```html',
				'<b>&amp;</b>',
				'```',
			].join('\n')
		);
		expect(documentation.sections).toHaveLength(1);
		expect(documentation.sections[0]).toMatchObject({ name: 'Typed', slug: 'section-typed' });
		expect(documentation.sections[0].components.map((component) => component.name)).toEqual([
			'Typed',
		]);
		expect(components.components.map((component) => component.name)).toEqual(['Documented']);
		expect(elsewhere).toMatchObject({
			href: 'https://example.com/',
			content: null,
			components: [],
		});
	});

	it('should describe documented components: tags, methods, prop types', async () => {
		const manifest = await buildManifest(sectionsConfig(), undefined, { now: NOW });
		const documented = findComponent(manifest, 'Documented');
		expect(documented.visibleName).toBe('The Documented One');
		// Code in descriptions is un-highlighted (Prism runs on it in getProps)
		expect(documented.description).toBe(
			"A documented component.\n\n```js\nalert('Hello & <world>');\n```"
		);
		expect(documented.tags).toEqual({
			deprecated: [{ description: 'Use something else' }],
			since: [{ description: '1.0.0' }],
			status: [{ description: 'beta' }],
		});
		expect(documented.props.map((prop) => [prop.name, prop.type])).toEqual([
			['size', 'oneOf: s | l'],
			['dict', 'objectOf: bool'],
			['items', '(shape { id: number (required), label: string })[]'],
			['onClick', 'func'],
			['union', 'oneOfType: string | number'],
			['when', 'instanceOf: Date'],
		]);
		expect(documented.props[0]).toMatchObject({
			required: true,
			description: 'The size.',
			tags: { since: [{ description: '1.1.0' }] },
		});
		expect(documented.props.find((prop) => prop.name === 'onClick')?.tags).toEqual({
			param: [{ name: 'event', type: 'SyntheticEvent', description: 'The React event' }],
		});
		expect(documented.methods).toEqual([
			{
				name: 'insertAtCursor',
				params: [
					{ name: 'text', type: 'string', description: 'The text' },
					{ name: 'at', type: 'number?', description: 'Position' },
				],
				returns: { type: 'boolean', description: 'Whether it worked' },
				description: 'Insert text at cursor position.',
				tags: {},
			},
		]);
	});

	it('should keep example languages and settings, and prose after the last example', async () => {
		const manifest = await buildManifest(sectionsConfig(), undefined, { now: NOW });
		const documented = findComponent(manifest, 'Documented');
		expect(documented.examples).toEqual([
			{
				index: 1,
				lang: 'jsx',
				code: '<Documented size="s" />',
				settings: { padded: true },
				// The static block stays in the prose, as source code (chunkify drops the
				// modifiers of non-playground blocks)
				description:
					"Static code is not an example:\n\n```js\nimport Documented from './Documented'\n```\n\nBasic:",
			},
			{
				index: 2,
				lang: 'tsx',
				code: '<Documented size="l" />',
				settings: { props: { className: 'checks' } },
				description: '',
			},
		]);
		expect(documented.notes).toBe('Closing remarks with `<b>bold</b>` HTML.');
	});

	it('should print TypeScript types', async () => {
		const manifest = await buildManifest(sectionsConfig(), undefined, { now: NOW });
		const typed = findComponent(manifest, 'Typed');
		expect(typed.filePath).toBe('components/Typed.tsx');
		expect(typed.props.map((prop) => [prop.name, prop.type, prop.required])).toEqual([
			['kind', "'a' | 'b'", true],
			['count', 'number', false],
			['onChange', '(value: string) => void', false],
		]);
	});

	it('should link like the sidebar when pagePerSection is on', async () => {
		const manifest = await buildManifest(sectionsConfig({ pagePerSection: true }), undefined, {
			now: NOW,
		});
		const [documentation, components] = manifest.sections;
		expect(documentation.href).toBe('index.html#/Documentation');
		// A sub-section of a page (sectionDepth 1) is its own page…
		expect(documentation.sections[0].href).toBe('index.html#/Documentation/Typed');
		// …whose components (the sub-section has depth 0) are `?id=` anchors on it. The slug
		// is `typed-1`: the section took `typed` first, exactly like in the sidebar
		expect(findComponent(manifest, 'Typed').href).toBe(
			'index.html#/Documentation/Typed?id=typed-1'
		);
		// Components of a section with sectionDepth 0 are anchors on the section page
		expect(components.href).toBe('index.html#/Components');
		expect(findComponent(manifest, 'Documented').href).toBe('index.html#/Components?id=documented');
	});

	it('should apply updateDocs', async () => {
		const manifest = await buildManifest(
			sectionsConfig({
				updateDocs: (docs) => ({ ...docs, description: `${docs.description}\n\nUpdated.` }),
			}),
			undefined,
			{ now: NOW }
		);
		expect(findComponent(manifest, 'Typed').description).toMatch(/Updated\.$/);
	});

	it('should reuse cached docs until a file changes', async () => {
		const config = sectionsConfig();
		const cache = createManifestCache();
		const first = await buildManifest(config, undefined, { now: NOW, cache });
		const cachedDocs = cache.docs.get(path.join(dir, 'components/Typed.tsx'))?.docs;
		expect(cachedDocs).toBeDefined();
		expect(cache.examples.size).toBeGreaterThan(0);

		// Unchanged files: the very same parsed objects come back
		await buildManifest(config, undefined, { now: NOW, cache });
		expect(cache.docs.get(path.join(dir, 'components/Typed.tsx'))?.docs).toBe(cachedDocs);

		// A changed file (newer mtime) is parsed again
		const file = path.join(dir, 'components/Typed.tsx');
		fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('A TypeScript', 'An edited'));
		const later = new Date(fs.statSync(file).mtimeMs + 5000);
		fs.utimesSync(file, later, later);
		const second = await buildManifest(config, undefined, { now: NOW, cache });
		expect(findComponent(first, 'Typed').description).toBe('A TypeScript component.');
		expect(findComponent(second, 'Typed').description).toBe('An edited component.');
	});
});

describe('unhighlight', () => {
	it('should restore highlighted code inside fenced blocks only', async () => {
		const highlighted = [
			'Text with <span class="token keep">custom HTML</span> and &lt;entities&gt;.',
			'',
			'```js',
			'<span class="token function">alert</span><span class="token punctuation">(</span>' +
				'<span class="token string">\'a &lt; b &amp;&amp; c\'</span><span class="token punctuation">)</span>',
			'```',
			'',
			'```pizza',
			'not highlighted &lt;kept&gt;',
			'```',
		].join('\n');
		expect(unhighlight(highlighted)).toBe(
			[
				'Text with <span class="token keep">custom HTML</span> and &lt;entities&gt;.',
				'',
				'```js',
				"alert('a < b && c')",
				'```',
				'',
				'```pizza',
				'not highlighted &lt;kept&gt;',
				'```',
			].join('\n')
		);
	});

	it('should handle unterminated fences', async () => {
		expect(unhighlight('```js\n<span class="token keyword">const</span> a')).toBe('```js\nconst a');
	});

	it('should find fences inside list items and blockquotes', async () => {
		const highlighted = [
			'1. Install it:',
			'',
			'   ```bash',
			'   <span class="token function">npm</span> install',
			'',
			'   <span class="token function">npm</span> test',
			'   ```',
			'',
			'> ```html',
			'> <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>b</span><span class="token punctuation">></span></span>',
			'>',
			'> <span class="token comment">&lt;!-- a > b --></span>',
			'> ```',
		].join('\n');
		expect(unhighlight(highlighted)).toBe(
			[
				'1. Install it:',
				'',
				'   ```bash',
				'   npm install',
				'',
				'   npm test',
				'   ```',
				'',
				'> ```html',
				'> <b>',
				'>',
				'> <!-- a > b -->',
				'> ```',
			].join('\n')
		);
	});
});

describe('shiftHeadings', () => {
	it('should demote headings outside fenced code, capped at six', async () => {
		const text = '# Title\n\ntext\n\n```md\n# code\n```\n\n###### Deep\n#not a heading';
		expect(shiftHeadings(text, 2)).toBe(
			'### Title\n\ntext\n\n```md\n# code\n```\n\n###### Deep\n#not a heading'
		);
		expect(shiftHeadings(text, 0)).toBe(text);
	});
});

describe('toManifestExamples', () => {
	it('should pair every playground with the prose before it', async () => {
		const config = configIn(testDir, {});
		const chunks = parseExamples(
			config,
			{ file: '/virtual/Readme.md' },
			['Intro', '', '    <A />', '', 'Second', '', '```jsx', '<B />', '```', '', 'Bye'].join('\n')
		);
		expect(toManifestExamples(chunks)).toEqual({
			examples: [
				{ index: 1, lang: 'jsx', code: '<A />', settings: {}, description: 'Intro' },
				{ index: 3, lang: 'jsx', code: '<B />', settings: {}, description: 'Second' },
			],
			notes: 'Bye',
		});
	});
});

describe('printPropType', () => {
	const prop = (type: any): Rsg.PropDescriptor => ({ name: 'x', type }) as Rsg.PropDescriptor;

	it('should print PropTypes like the props table', async () => {
		expect(printPropType(prop({ name: 'string' }))).toBe('string');
		expect(printPropType(prop({ name: 'arrayOf', value: { name: 'string' } }))).toBe('string[]');
		expect(
			printPropType(
				prop({
					name: 'arrayOf',
					value: { name: 'enum', value: [{ value: "'a'" }, { value: "'b'" }] },
				})
			)
		).toBe('(oneOf: a | b)[]');
		expect(printPropType(prop({ name: 'enum', value: 'Object.keys(x)', computed: true }))).toBe(
			'oneOf: Object.keys(x)'
		);
		expect(printPropType({ name: 'x' } as Rsg.PropDescriptor)).toBe('unknown');
	});

	it('should print Flow and TypeScript types as written', async () => {
		expect(
			printPropType({
				name: 'x',
				tsType: { name: 'signature', type: 'function', raw: '() => void' },
			} as any)
		).toBe('() => void');
		expect(
			printPropType({
				name: 'x',
				flowType: {
					name: 'union',
					raw: '"a" | "b"',
					elements: [
						{ name: 'literal', value: '"a"' },
						{ name: 'literal', value: '"b"' },
					],
				},
			} as any)
		).toBe('oneOf: a | b');
	});
});

describe('renderers', () => {
	let manifest: DocsManifest;
	beforeAll(async () => {
		const config = configIn(testDir, {
			components: 'components/**/[A-Z]*.js',
			title: 'Fixtures',
			version: '1.2.3',
		});
		manifest = await buildManifest(config, undefined, { now: NOW });
	});

	it('should render llms.txt in the llmstxt.org shape', async () => {
		const text = renderLlmsTxt(manifest);
		const lines = text.split('\n');
		expect(lines[0]).toBe('# Fixtures');
		expect(lines[2]).toBe(
			'> Fixtures (version 1.2.3): a React component style guide with 5 components, generated by Vite Styleguidist.'
		);
		expect(text).toContain('\n## Components\n');
		expect(text).toContain('- [Button](index.html#button): The only true button.');
		expect(text).toContain('- [llms-full.txt](llms-full.txt)');
		expect(text).toContain('- [docs.json](docs.json)');
		// Components come in sidebar order
		const names = [...text.matchAll(/^- \[(\w+)\]\(index\.html#/gm)].map((match) => match[1]);
		expect(names).toEqual(['Annotation', 'Button', 'Placeholder', 'Price', 'RandomButton']);
	});

	it('should prefix links with the base URL when given', async () => {
		const text = renderLlmsTxt(manifest, { baseUrl: 'https://example.com/styleguide' });
		expect(text).toContain('(https://example.com/styleguide/index.html#button)');
		expect(text).toContain('(https://example.com/styleguide/llms-full.txt)');
	});

	it('should render llms-full.txt with a props table and fenced examples', async () => {
		const text = renderLlmsFullTxt(manifest);
		expect(text).toMatch(/^# Fixtures\n\n> Fixtures/);
		// Components of the unnamed section are top-level headings
		expect(text).toContain(
			'\n## Button\n\nSource: `components/Button/Button.js`\n\nThe only true button.\n'
		);
		expect(text).toContain(
			[
				'### Props',
				'',
				'| Prop | Type | Required | Default | Description |',
				'| --- | --- | --- | --- | --- |',
				'| `children` | string | yes |  | Button label. |',
				"| `color` | string | no | `'#333'` |  |",
				"| `size` | oneOf: small \\| normal \\| large | no | `'normal'` |  |",
			].join('\n')
		);
		expect(text).toContain(
			'### Examples\n\nBasic button:\n\n```jsx\n<Button>Push Me</Button>\n```\n'
		);
		expect(text).toContain('### Methods\n\n- `getImageUrl()`: A public method.');
		expect(text).toMatch(/\n$/);
		expect(text).not.toMatch(/\n{3,}/);
	});

	it('should render nested sections as nested headings', async () => {
		const nested: DocsManifest = {
			...manifest,
			sections: [
				{
					name: 'Components',
					slug: 'section-components',
					href: 'index.html#section-components',
					description: 'All of them',
					content: 'Intro page',
					format: 'md',
					components: [],
					sections: [
						{
							...manifest.sections[0],
							name: 'Buttons',
							components: manifest.sections[0].components.slice(1, 2),
						},
					],
				},
			],
		};
		const text = renderLlmsFullTxt(nested);
		expect(text).toContain(
			'\n## Components\n\nAll of them\n\nIntro page\n\n### Buttons\n\n#### Button\n'
		);
		expect(text).toContain('\n##### Props\n');
		expect(renderLlmsTxt(nested)).toContain(
			'- [Button](index.html#button): Components › Buttons — The only true button.'
		);
		expect(renderLlmsTxt(nested)).toContain(
			'## Sections\n\n- [Components](index.html#section-components): All of them'
		);
	});

	it('should demote headings inside content pages and descriptions', async () => {
		const button = manifest.sections[0].components.find((component) => component.name === 'Button');
		const nested: DocsManifest = {
			...manifest,
			sections: [
				{
					name: 'Guides',
					slug: 'guides',
					href: 'index.html#guides',
					description: null,
					content: '# Getting started\n\nIntro\n\n```md\n# not a heading\n```\n\n## Install',
					format: 'md',
					components: [{ ...(button as ManifestComponent), description: '## Usage\n\nText' }],
					sections: [],
				},
			],
		};
		const text = renderLlmsFullTxt(nested);
		expect(text).toContain(
			'\n## Guides\n\n### Getting started\n\nIntro\n\n```md\n# not a heading\n```\n\n#### Install\n'
		);
		expect(text).toContain('\n### Button\n');
		// A `##` in the description of a level-3 component nests two levels below it
		expect(text).toContain('\n##### Usage\n\nText\n');
	});

	it('should render docs.json as pretty JSON', async () => {
		const json = renderDocsJson(manifest);
		expect(JSON.parse(json)).toEqual(manifest);
		expect(json).toMatch(/^\{\n {2}"schemaVersion": 1,/);
		expect(json).toMatch(/\n$/);
	});

	it('should render all three files', async () => {
		const config = configIn(testDir, { components: 'components/**/[A-Z]*.js', title: 'Fixtures' });
		const files = await renderMachineReadableFiles(config, { now: NOW });
		expect(Object.keys(files)).toEqual([...MACHINE_READABLE_FILES]);
		expect(JSON.parse(files['docs.json']).name).toBe('Fixtures');
		expect(files['llms.txt']).toMatch(/^# Fixtures\n/);
		expect(files['llms-full.txt']).toMatch(/^# Fixtures\n/);
	});
});
