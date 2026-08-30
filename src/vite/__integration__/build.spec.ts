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

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const FIXTURES = path.join(REPO_ROOT, 'test/components');

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
	fs.writeFileSync(
		path.join(projectDir, 'styleguide.config.js'),
		`module.exports = {
	title: 'Build test',
	components: 'components/**/[A-Z]*.js',
	styleguideDir: 'styleguide',
	require: [require('path').join(__dirname, 'global.css')],
	template: { favicon: 'favicon.ico' },
	logger: { info() {}, warn() {}, debug() {} },
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
