// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import checkProject, { collectComponentPatterns, collectConfigFiles } from '../checkProject.js';
import type { DoctorFinding } from '../types.js';
import type * as Rsg from '../../../typings/index.js';

const legacyApp = path.resolve(import.meta.dirname, '../../../../test/apps/legacy');
const defaultsApp = path.resolve(import.meta.dirname, '../../../../test/apps/defaults');

const byId = (findings: DoctorFinding[], id: string) =>
	findings.filter((finding) => finding.id === id);
const ids = (findings: DoctorFinding[]) => findings.map((finding) => finding.id);

/** A temporary project with the given files (nested paths are created). */
const createProject = (files: Record<string, string>): string => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-project-'));
	for (const [name, content] of Object.entries(files)) {
		const file = path.join(dir, name);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, content);
	}
	return dir;
};

const config = (overrides: Partial<Rsg.SanitizedStyleguidistConfig> = {}) =>
	overrides as Partial<Rsg.SanitizedStyleguidistConfig>;

describe('collectComponentPatterns', () => {
	it('should collect the components of the config and of every nested section', () => {
		expect(
			collectComponentPatterns(
				config({
					components: 'a/*.js',
					sections: [
						{ components: 'b/*.js', sections: [{ components: 'c/*.js' }] },
						{ name: 'Docs', content: 'Readme.md' },
					],
				} as any)
			)
		).toEqual(['a/*.js', 'b/*.js', 'c/*.js']);
	});

	it('should count a pattern once when the schema put it in sections too', () => {
		// What the schema produces for a config with a root `components` and no sections:
		// the same value in both places (see the `sections` entry of the schema)
		const components = 'a/*.js';
		expect(
			collectComponentPatterns(config({ components, sections: [{ components }] } as any))
		).toEqual(['a/*.js']);
	});
});

describe('collectConfigFiles', () => {
	it('should take the theme and styles files and the require entries that are files', () => {
		const dir = createProject({ 'theme.js': '', 'setup.js': '' });
		expect(
			collectConfigFiles(
				config({
					theme: path.join(dir, 'theme.js'),
					// A module id, not a file: nothing to scan
					require: ['core-js/stable', './setup.js'],
				} as any),
				dir
			)
		).toEqual([path.join(dir, 'theme.js'), path.join(dir, 'setup.js')]);
	});

	it('should leave an object theme alone', () => {
		expect(collectConfigFiles(config({ theme: { color: {} } } as any), '/pizza')).toEqual([]);
	});
});

describe('components', () => {
	it('should count the components the style guide would show', () => {
		const findings = checkProject(config({ components: 'src/components/*.js' }), defaultsApp);
		expect(byId(findings, 'project.components')[0]).toMatchObject({
			level: 'info',
			title: 'Found 2 components',
			meta: { count: 2 },
		});
	});

	it('should warn when a pattern matches nothing and blame case sensitivity', () => {
		// The exact case the migration guide warns about: `[A-Z]*.js` used to match `index.js`
		// on macOS and Windows, and does not any more
		const dir = createProject({ 'components/index.js': 'export default 1\n' });
		const findings = checkProject(config({ components: 'components/[A-Z]*.js' }), dir);
		expect(byId(findings, 'project.components')[0]).toMatchObject({
			level: 'warning',
			title: 'No components matched the components option',
			docs: expect.stringContaining('#components-patterns-are-case-sensitive'),
		});
	});

	it('should not warn about a style guide that asks for no components', () => {
		const dir = createProject({ 'Readme.md': '# Docs\n' });
		expect(
			byId(
				checkProject(config({ sections: [{ content: 'Readme.md' }] }), dir),
				'project.components'
			)[0]
		).toMatchObject({
			level: 'info',
			title: 'This config does not list any components',
		});
	});

	it('should report a components function that throws instead of crashing', () => {
		const findings = checkProject(
			config({
				components: () => {
					throw new Error('Boom');
				},
			}),
			defaultsApp
		);
		expect(byId(findings, 'project.components-failed')[0]).toMatchObject({
			level: 'error',
			detail: 'Boom',
		});
	});

	it('should report a failing components option once, not once per copy of it', () => {
		const components = () => {
			throw new Error('Boom');
		};
		const findings = checkProject(
			config({ components, sections: [{ components }] } as any),
			defaultsApp
		);
		expect(byId(findings, 'project.components-failed')).toHaveLength(1);
	});

	it('should not count the same pattern twice', () => {
		const findings = checkProject(
			config({ components: 'components/*.js', sections: [{ components: 'components/*.js' }] }),
			legacyApp
		);
		expect(byId(findings, 'project.components')[0]).toMatchObject({ meta: { patterns: 1 } });
	});
});

describe('code that Vite cannot run', () => {
	it('should find CommonJS in a theme file', () => {
		const dir = createProject({ 'theme.js': 'module.exports = { color: {} }\n' });
		const findings = checkProject(config({ theme: path.join(dir, 'theme.js') }), dir);
		expect(byId(findings, 'project.commonjs-theme')[0]).toMatchObject({
			level: 'error',
			files: [path.join(dir, 'theme.js')],
			docs: expect.stringContaining('#theme-and-styles-files'),
		});
	});

	it('should find a require() in a styles file', () => {
		const dir = createProject({ 'styles.js': "const x = require('./x.js')\nexport default {}\n" });
		const findings = checkProject(config({ styles: path.join(dir, 'styles.js') }), dir);
		expect(ids(findings)).toContain('project.commonjs-theme');
	});

	it('should not blame a theme file that only mentions module.exports in a comment', () => {
		const dir = createProject({
			'theme.js': '// was: module.exports = {}\n- module.exports = {}\nexport default {}\n',
		});
		const findings = checkProject(config({ theme: path.join(dir, 'theme.js') }), dir);
		expect(ids(findings)).not.toContain('project.commonjs-theme');
	});

	it('should not look for CommonJS in components, only in theme and styles files', () => {
		const dir = createProject({ 'components/Button.js': 'module.exports = Button\n' });
		const findings = checkProject(config({ components: 'components/*.js' }), dir);
		expect(ids(findings)).not.toContain('project.commonjs-theme');
	});

	it('should find require.context in a component', () => {
		const dir = createProject({
			'components/Button.js': "const icons = require.context('./icons', true)\n",
			'components/Card.js': 'export default Card\n',
		});
		const findings = checkProject(config({ components: 'components/*.js' }), dir);
		expect(byId(findings, 'project.require-context')[0]).toMatchObject({
			level: 'error',
			title: 'require.context() in 1 file',
			files: [path.join(dir, 'components/Button.js')],
		});
	});

	it('should not mistake a method called context for require.context', () => {
		const dir = createProject({
			'components/Button.js': 'canvas.require.context()\nfoo.context()\n',
		});
		const findings = checkProject(config({ components: 'components/*.js' }), dir);
		expect(ids(findings)).not.toContain('project.require-context');
	});
});

describe('process.env', () => {
	it('should list the variables that are not replaced', () => {
		const dir = createProject({
			'components/Button.js':
				'const url = process.env.API_URL\nconst key = process.env["SECRET_KEY"]\n',
		});
		const findings = checkProject(config({ components: 'components/*.js' }), dir);
		expect(byId(findings, 'project.process-env')[0]).toMatchObject({
			level: 'warning',
			title: 'process.env variables that are not replaced: API_URL, SECRET_KEY',
			meta: { variables: ['API_URL', 'SECRET_KEY'] },
			docs: expect.stringContaining('#environment-variables'),
		});
	});

	it('should ignore the variables an envPrefix exposes', () => {
		const dir = createProject({
			'components/Button.js': 'const title = process.env.REACT_APP_TITLE\n',
		});
		expect(
			ids(
				checkProject(
					config({ components: 'components/*.js', envPrefix: ['REACT_APP_'] } as any),
					dir
				)
			)
		).not.toContain('project.process-env');
	});

	it('should say what the configured envPrefix covers when it reports a name', () => {
		const dir = createProject({
			'components/Button.js': 'const url = process.env.API_URL\n',
		});
		const findings = checkProject(
			config({ components: 'components/*.js', envPrefix: ['REACT_APP_'] } as any),
			dir
		);
		expect(byId(findings, 'project.process-env')[0]).toMatchObject({
			level: 'warning',
			title: 'process.env variables that are not replaced: API_URL',
			detail: expect.stringContaining('envPrefix option adds REACT_APP_'),
		});
	});

	it('should ignore the two variables Styleguidist replaces', () => {
		const dir = createProject({
			'components/Button.js':
				"const dev = process.env.NODE_ENV !== 'production'\nconst env = process.env.STYLEGUIDIST_ENV\n",
		});
		expect(ids(checkProject(config({ components: 'components/*.js' }), dir))).not.toContain(
			'project.process-env'
		);
	});
});

describe('the old package', () => {
	it('should find files that still name react-styleguidist', () => {
		const dir = createProject({
			'components/Button.js': "import { A } from 'react-styleguidist/lib/client/x.js'\n",
		});
		const findings = checkProject(config({ components: 'components/*.js' }), dir);
		expect(byId(findings, 'project.old-package')[0]).toMatchObject({
			// A warning and not an error: this is a text match, not a parse
			level: 'warning',
			title: '1 file still mentions react-styleguidist',
		});
	});

	it('should not match the new package name', () => {
		const dir = createProject({
			'components/Button.js': "import styleguidist from 'vite-styleguidist'\n",
		});
		expect(ids(checkProject(config({ components: 'components/*.js' }), dir))).not.toContain(
			'project.old-package'
		);
	});
});

describe('bundler configs', () => {
	it('should say a webpack config is not needed when there is no Vite config', () => {
		const dir = createProject({ 'webpack.config.js': 'module.exports = {}\n' });
		expect(byId(checkProject(config(), dir), 'project.webpack-config')[0]).toMatchObject({
			level: 'info',
			file: path.join(dir, 'webpack.config.js'),
		});
	});

	it('should stay quiet when the project has a Vite config too', () => {
		const dir = createProject({
			'webpack.config.js': 'module.exports = {}\n',
			'vite.config.ts': 'export default {}\n',
		});
		expect(ids(checkProject(config(), dir))).not.toContain('project.webpack-config');
	});
});

describe('bounds', () => {
	it('should stop after the given number of files and say so', () => {
		const findings = checkProject(config({ components: 'components/*.js' }), legacyApp, {
			maxFiles: 1,
		});
		expect(byId(findings, 'project.scan-capped')[0]).toMatchObject({
			level: 'info',
			meta: { scanned: 1 },
		});
	});

	it('should skip a file bigger than the cap', () => {
		const dir = createProject({
			'components/Huge.js': `// ${'x'.repeat(2000)}\nrequire.context('./icons')\n`,
		});
		const findings = checkProject(config({ components: 'components/*.js' }), dir, {
			maxFileSize: 100,
		});
		expect(ids(findings)).not.toContain('project.require-context');
	});
});

it('should find every problem of a 13.x project in one pass', () => {
	const findings = checkProject(
		config({
			components: 'components/**/[A-Z]*.js',
			theme: path.join(legacyApp, 'theme.js'),
			styles: path.join(legacyApp, 'styles.js'),
			require: ['./setup.js'],
		}),
		legacyApp
	);
	expect(ids(findings).sort()).toEqual([
		'project.commonjs-theme',
		'project.components',
		'project.old-package',
		'project.process-env',
		'project.require-context',
		'project.webpack-config',
	]);
});
