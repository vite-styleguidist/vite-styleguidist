// @vitest-environment node
/**
 * Integration test of the production build: builds a temporary project from the
 * TypeScript sources and checks the emitted files (index.html, build/ folder) and
 * that only the `build/` folder is cleaned between builds.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import styleguidist from '../../scripts/index.esm.js';

import { parseExamples } from '../modules/examples.js';
import type * as Rsg from '../../typings/index.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const FIXTURES = path.join(REPO_ROOT, 'test/components');

/** Where the config below records every react-docgen and chunkify run of the build. */
const PARSE_LOG = 'parses.log';

let projectDir: string;
let styleguideDir: string;

beforeAll(async () => {
	projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-build-'));
	styleguideDir = path.join(projectDir, 'styleguide');
	fs.cpSync(FIXTURES, path.join(projectDir, 'components'), { recursive: true });
	// Dependencies (react, prop-types, ...) resolve from the repository
	fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(projectDir, 'node_modules'));
	// Files users keep next to the generated style guide (e.g. a CNAME for GitHub Pages)
	fs.mkdirSync(path.join(styleguideDir, 'build'), { recursive: true });
	fs.writeFileSync(path.join(styleguideDir, 'CNAME'), 'example.com');
	fs.writeFileSync(path.join(styleguideDir, 'build/stale.js'), '// from a previous build');
	fs.writeFileSync(path.join(projectDir, 'global.css'), 'body { --rsg-test: 1; }\n');
	// `propsParser` and `updateExample` are the default behaviour plus a line in
	// parses.log, which is how the "every source is parsed once per build" test below
	// counts react-docgen and chunkify runs without any instrumentation of our own
	fs.writeFileSync(
		path.join(projectDir, 'styleguide.config.js'),
		`const fs = require('fs');
const parseLog = require('path').join(__dirname, ${JSON.stringify(PARSE_LOG)});
const record = (kind, file) => fs.appendFileSync(parseLog, kind + '\\t' + file + '\\n');

module.exports = {
	title: 'Build test',
	components: 'components/**/[A-Z]*.js',
	styleguideDir: 'styleguide',
	require: [require('path').join(__dirname, 'global.css')],
	template: { favicon: 'favicon.ico' },
	logger: { info() {}, warn() {}, debug() {} },
	propsParser(filePath, source, resolver, handlers) {
		record('props', filePath);
		return require('react-docgen').parse(source, { resolver, handlers, filename: filePath });
	},
	updateExample(props, file) {
		record('example', file);
		return props;
	},
};
`
	);
	await styleguidist(path.join(projectDir, 'styleguide.config.js')).build();
}, 120000);

afterAll(() => {
	fs.rmSync(projectDir, { recursive: true, force: true });
});

test('emits index.html referencing the bundle and the stylesheet with relative URLs', () => {
	const html = fs.readFileSync(path.join(styleguideDir, 'index.html'), 'utf8');
	expect(html).toContain('<title>Build test</title>');
	expect(html).toContain('href="favicon.ico"');
	expect(html).toContain('<div id="rsg-root"></div>');
	const script = html.match(/<script type="module" src="([^"]+)"/);
	const stylesheet = html.match(/<link rel="stylesheet" href="([^"]+)"/);
	expect(script?.[1]).toMatch(/^\.\/build\/bundle\.[\w-]+\.js$/);
	expect(stylesheet?.[1]).toMatch(/^\.\/build\/[\w.-]+\.css$/);
	expect(fs.existsSync(path.join(styleguideDir, script![1]))).toBe(true);
	expect(fs.existsSync(path.join(styleguideDir, stylesheet![1]))).toBe(true);
});

test('bundles the components and the examples', () => {
	const files = fs.readdirSync(path.join(styleguideDir, 'build'));
	const bundle = fs.readFileSync(
		path.join(
			styleguideDir,
			'build',
			files.find((file) => file.startsWith('bundle.'))!
		),
		'utf8'
	);
	// Component documentation and examples are inlined as data
	expect(bundle).toContain('Placeholder');
	expect(bundle).toContain('getImageUrl');
	// Function names survive minification (Styled() and the `styles` option depend on them)
	expect(bundle).toMatch(/\bStyleGuideRenderer\b/);
});

test('only cleans the build/ folder', () => {
	expect(fs.existsSync(path.join(styleguideDir, 'CNAME'))).toBe(true);
	expect(fs.existsSync(path.join(styleguideDir, 'build/stale.js'))).toBe(false);
});

test('emits the machine-readable docs next to index.html', () => {
	for (const name of ['docs.json', 'llms.txt', 'llms-full.txt']) {
		expect(fs.existsSync(path.join(styleguideDir, name)), `${name} should exist`).toBe(true);
	}
	const manifest = JSON.parse(fs.readFileSync(path.join(styleguideDir, 'docs.json'), 'utf8'));
	expect(manifest).toMatchObject({
		schemaVersion: 1,
		source: 'vite-styleguidist',
		name: 'Build test',
		version: null,
		generatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
	});
	expect(manifest.sections).toHaveLength(1);
	const components = manifest.sections[0].components;
	expect(components.map((component: any) => component.name)).toEqual([
		'Annotation',
		'Button',
		'Placeholder',
		'Price',
		'RandomButton',
	]);
	const button = components.find((component: any) => component.name === 'Button');
	expect(button).toMatchObject({
		filePath: 'components/Button/Button.js',
		href: 'index.html#button',
		description: 'The only true button.',
	});
	expect(button.props.map((prop: any) => prop.name)).toEqual(['children', 'color', 'size']);
	expect(button.examples[0]).toMatchObject({ lang: 'jsx', code: '<Button>Push Me</Button>' });
	expect(components.find((component: any) => component.name === 'Placeholder').methods).toEqual([
		expect.objectContaining({ name: 'getImageUrl' }),
	]);

	const llms = fs.readFileSync(path.join(styleguideDir, 'llms.txt'), 'utf8');
	expect(llms).toMatch(/^# Build test\n\n> /);
	expect(llms).toContain('- [Button](index.html#button): The only true button.');
	const full = fs.readFileSync(path.join(styleguideDir, 'llms-full.txt'), 'utf8');
	expect(full).toContain('## Button');
	expect(full).toContain('| `children` | string | yes |');
});

/**
 * Regression test for the duplicate-parse bug: `generateBundle` used to build the
 * machine-readable docs with no cache, so every component was handed to react-docgen twice
 * and every Markdown page chunkified twice in a single build — the same answer, at twice
 * the price (see src/vite/parseCache.ts).
 *
 * The counters are the public `propsParser` and `updateExample` options, so this measures
 * what a user's parser would actually be asked to do.
 */
test('parses every source exactly once per build', () => {
	const log = fs.readFileSync(path.join(projectDir, PARSE_LOG), 'utf8').trim().split('\n');
	const counts = new Map<string, number>();
	for (const line of log) {
		counts.set(line, (counts.get(line) || 0) + 1);
	}
	const countOf = (kind: string, file: string) => counts.get(`${kind}\t${file}`) || 0;

	// Every component of the guide: parsed once, not once per consumer
	const components = ['Annotation', 'Button', 'Placeholder', 'Price', 'RandomButton'];
	for (const name of components) {
		const file = path.join(projectDir, 'components', name, `${name}.js`);
		expect(countOf('props', file), `${name} should be parsed exactly once`).toBe(1);
	}
	expect([...counts.keys()].filter((key) => key.startsWith('props\t'))).toHaveLength(
		components.length
	);

	// Every examples file: chunkified once, so `updateExample` sees each code block once
	// (a file with no code block never reaches `updateExample`, so it cannot be counted
	// this way — the two fixtures below are the ones that have playgrounds)
	const examplesFiles = [
		...new Set(
			[...counts.keys()]
				.filter((key) => key.startsWith('example\t'))
				.map((key) => key.split('\t')[1])
		),
	];
	expect(examplesFiles).toEqual(
		expect.arrayContaining([
			path.join(projectDir, 'components/Button/Readme.md'),
			path.join(projectDir, 'components/Placeholder/Placeholder.md'),
		])
	);
	for (const file of examplesFiles) {
		const chunks = parseExamples(
			{} as Rsg.SanitizedStyleguidistConfig,
			{ file },
			fs.readFileSync(file, 'utf8')
		);
		const codeBlocks = chunks.filter((chunk) => chunk.type === 'code').length;
		expect(codeBlocks, `${file} should have examples to count`).toBeGreaterThan(0);
		expect(countOf('example', file), `${file} should be chunkified exactly once`).toBe(codeBlocks);
	}
});
