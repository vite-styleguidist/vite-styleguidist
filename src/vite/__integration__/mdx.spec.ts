// @vitest-environment node
/**
 * Integration test of the MDX pipeline: builds a style guide whose component and section
 * pages are `.mdx`, then checks the emitted bundle (the compiled page and its playgrounds)
 * and the machine-readable docs (prose, playgrounds, `format`).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import styleguidist from '../../scripts/index.esm.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const FENCE = '```';

const fence = (lang: string, code: string) => `${FENCE}${lang}\n${code}\n${FENCE}`;

const README_MDX = [
	'Buttons are **clickable**.',
	fence('jsx', '<Button>Push Me</Button>'),
	'<span className="rsg-mdx-inline">Rendered by MDX</span>',
	fence('html', '<button class="btn">Push</button>'),
].join('\n\n');

const INTRO_MDX = ['# Intro', 'A section page written in MDX.', fence('jsx', '<Button/>')].join(
	'\n\n'
);

let projectDir: string;
let styleguideDir: string;

beforeAll(async () => {
	projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-mdx-build-'));
	styleguideDir = path.join(projectDir, 'styleguide');
	const buttonDir = path.join(projectDir, 'components/Button');
	fs.mkdirSync(buttonDir, { recursive: true });
	// Dependencies (react, @mdx-js/mdx, ...) resolve from the repository
	fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(projectDir, 'node_modules'));
	fs.writeFileSync(
		path.join(buttonDir, 'Button.js'),
		`import React from 'react';
import PropTypes from 'prop-types';
/** A button. */
export default function Button({ children }) {
	return <button type="button">{children}</button>;
}
Button.propTypes = { children: PropTypes.node };
`
	);
	fs.writeFileSync(path.join(buttonDir, 'Readme.mdx'), README_MDX);
	fs.writeFileSync(path.join(projectDir, 'intro.mdx'), INTRO_MDX);
	fs.writeFileSync(
		path.join(projectDir, 'styleguide.config.js'),
		`module.exports = {
	title: 'MDX test',
	styleguideDir: 'styleguide',
	minimize: false,
	sections: [
		{ name: 'Intro', content: 'intro.mdx' },
		{ name: 'Components', components: 'components/**/[A-Z]*.js' },
	],
	logger: { info() {}, warn() {}, debug() {} },
};
`
	);
	await styleguidist(path.join(projectDir, 'styleguide.config.js')).build();
}, 180000);

afterAll(() => {
	fs.rmSync(projectDir, { recursive: true, force: true });
});

/**
 * Every script of the build, concatenated. With `lazyDocs` on (ADR 0019) a component’s
 * documentation is in a chunk of its own rather than in the entry, so “is it in the
 * bundle” is a question about the whole output folder.
 */
const readBundle = () => {
	const dir = path.join(styleguideDir, 'build');
	return fs
		.readdirSync(dir)
		.filter((file) => file.endsWith('.js'))
		.map((file) => fs.readFileSync(path.join(dir, file), 'utf8'))
		.join('\n');
};

test('bundles the compiled MDX page with its playgrounds', () => {
	const bundle = readBundle();
	// The page component and the prose it renders
	expect(bundle).toContain('Buttons are ');
	expect(bundle).toContain('rsg-mdx-inline');
	// The playground, as a plain code example the existing Playground can render
	expect(bundle).toContain('<Button>Push Me</Button>');
	expect(bundle).toContain('RsgPlayground');
	// The non-JS fence was highlighted at build time, no Prism in the browser
	expect(bundle).toContain('RsgStatic');
	expect(bundle).toContain('token attr-name');
	// The chunk shape the client switches on
	expect(bundle).toMatch(/type:\s*"mdx"/);
});

test('describes the MDX component page in docs.json', () => {
	const manifest = JSON.parse(fs.readFileSync(path.join(styleguideDir, 'docs.json'), 'utf8'));
	const components = manifest.sections.flatMap((section: any) => section.components);
	const button = components.find((component: any) => component.name === 'Button');

	expect(button.format).toBe('mdx');
	expect(button.examples).toEqual([
		{
			// MDX pages number their playgrounds, so the isolate URL is #!/Button/0
			index: 0,
			lang: 'jsx',
			code: '<Button>Push Me</Button>',
			settings: {},
			description: 'Buttons are **clickable**.',
		},
	]);
	// JSX is kept verbatim, the static fence stays a fence
	expect(button.notes).toContain('<span className="rsg-mdx-inline">Rendered by MDX</span>');
	expect(button.notes).toContain('```html');
});

test('describes the MDX section page in docs.json', () => {
	const manifest = JSON.parse(fs.readFileSync(path.join(styleguideDir, 'docs.json'), 'utf8'));
	const intro = manifest.sections.find((section: any) => section.name === 'Intro');

	expect(intro.format).toBe('mdx');
	expect(intro.content).toContain('# Intro');
	expect(intro.content).toContain('A section page written in MDX.');
	// Playgrounds are written back as fences, like a Markdown content page
	expect(intro.content).toContain('```jsx\n<Button/>\n```');
});

test('writes the MDX prose into llms-full.txt', () => {
	const text = fs.readFileSync(path.join(styleguideDir, 'llms-full.txt'), 'utf8');

	expect(text).toContain('A section page written in MDX.');
	expect(text).toContain('```jsx\n<Button>Push Me</Button>\n```');
});
