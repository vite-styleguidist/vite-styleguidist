// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import type { Alias, PluginOption } from 'vite';
import getConfig from '../config.js';
import makeViteConfig, {
	findExampleDependencies,
	getAliases,
	getAliasNames,
	getReactRootFlavor,
} from '../make-vite-config.js';
import type * as Rsg from '../../typings/index.js';

const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);
const clientDir = path.resolve(import.meta.dirname, '../../client');

const cwd = process.cwd();
afterEach(() => {
	process.chdir(cwd);
});

/** Load a fixture app config (getConfig() resolves paths against the current directory). */
const loadConfig = (app: string, config: Rsg.StyleguidistConfig = {}) => {
	process.chdir(testApp(app));
	return getConfig(config);
};

/** Names of all plugins, nested arrays flattened. */
const pluginNames = (plugins: PluginOption[] | PluginOption | undefined): string[] => {
	if (Array.isArray(plugins)) {
		return plugins.flatMap((plugin) => pluginNames(plugin));
	}
	return plugins && typeof plugins === 'object' && 'name' in plugins ? [plugins.name] : [];
};

/** Create a temporary directory with the given files and return its path. */
const createTempDir = (files: Record<string, string>): string => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-vite-config-'));
	Object.entries(files).forEach(([name, content]) => {
		fs.writeFileSync(path.join(dir, name), content);
	});
	return dir;
};

describe('getAliases', () => {
	const findOf = (alias: Alias) => (alias.find instanceof RegExp ? alias.find.source : alias.find);

	it('should always resolve rsg-components, the React root and the assert shim', () => {
		const aliases = getAliases(loadConfig('defaults'));
		expect(aliases).toEqual([
			{ find: 'rsg-components', replacement: path.join(clientDir, 'rsg-components') },
			// The repo develops against React 19, so the fixture app resolves the modern root
			{
				find: /^rsg-react-root$/,
				replacement: expect.stringMatching(/\/client\/utils\/reactRoot\.modern\.ts$/),
			},
			{
				find: /^assert$/,
				replacement: expect.stringMatching(/\/client\/utils\/assertShim\.cjs$/),
			},
		]);
	});

	it('should add moduleAliases as string aliases first', () => {
		const aliases = getAliases(
			loadConfig('defaults', {
				moduleAliases: { '~': '/project/src', components: '/project/components' },
			})
		);
		expect(aliases.slice(0, 2)).toEqual([
			{ find: '~', replacement: '/project/src' },
			{ find: 'components', replacement: '/project/components' },
		]);
	});

	it('should alias custom style guide components before the rsg-components catch-all', () => {
		const aliases = getAliases(
			loadConfig('defaults', {
				styleguideComponents: {
					LogoRenderer: '/project/styleguide/Logo.js',
					Wrapper: '/project/styleguide/Wrapper.js',
				},
			})
		);
		expect(aliases.map(findOf)).toEqual([
			'^rsg-components\\/Logo\\/LogoRenderer$',
			'^rsg-components\\/Wrapper$',
			'rsg-components',
			'^rsg-react-root$',
			'^assert$',
		]);
		expect(aliases[0].replacement).toBe('/project/styleguide/Logo.js');
		expect(aliases[1].replacement).toBe('/project/styleguide/Wrapper.js');
	});

	// The two halves of PageNav (ADR 0016) are replaceable like any other component, and the
	// aliases have to match the specifiers the code imports: `rsg-components/PageNav` in
	// StyleGuide, `rsg-components/PageNav/PageNavRenderer` in PageNav itself.
	it('should alias both halves of PageNav', () => {
		const [nav, renderer] = getAliases(
			loadConfig('defaults', {
				styleguideComponents: {
					PageNav: '/project/styleguide/PageNav.js',
					PageNavRenderer: '/project/styleguide/PageNavRenderer.js',
				},
			})
		);
		expect((nav.find as RegExp).test('rsg-components/PageNav')).toBe(true);
		expect((nav.find as RegExp).test('rsg-components/PageNav/PageNav')).toBe(false);
		expect(nav.replacement).toBe('/project/styleguide/PageNav.js');
		expect((renderer.find as RegExp).test('rsg-components/PageNav/PageNavRenderer')).toBe(true);
		expect(renderer.replacement).toBe('/project/styleguide/PageNavRenderer.js');
	});

	// A custom Wrapper typically imports the default one from `rsg-components/Wrapper/Wrapper`:
	// the alias must match the exact module only, not everything under it
	it('should match custom style guide components exactly', () => {
		const [logo, wrapper] = getAliases(
			loadConfig('defaults', {
				styleguideComponents: { LogoRenderer: '/l.js', Wrapper: '/w.js' },
			})
		);
		expect((wrapper.find as RegExp).test('rsg-components/Wrapper')).toBe(true);
		expect((wrapper.find as RegExp).test('rsg-components/Wrapper/Wrapper')).toBe(false);
		expect((wrapper.find as RegExp).test('rsg-components/WrapperFoo')).toBe(false);
		expect((logo.find as RegExp).test('rsg-components/Logo/LogoRenderer')).toBe(true);
		expect((logo.find as RegExp).test('rsg-components/Logo')).toBe(false);
	});

	// A Vite alias is a plain rewrite and the importer is Styleguidist’s own component
	// inside node_modules, so a relative path only means anything once it is resolved here
	it('should resolve relative styleguideComponents paths against the config file', () => {
		const config = loadConfig('defaults', {
			styleguideComponents: {
				Wrapper: './styleguide/Wrapper',
				LogoRenderer: '../shared/Logo.js',
				// Absolute paths and package names are imports in their own right: untouched
				PathlineRenderer: '/absolute/Pathline.js',
				SectionsRenderer: 'my-design-system/Sections',
			},
		});
		const aliases = getAliases(config);
		expect(aliases.slice(0, 4).map((alias) => alias.replacement)).toEqual([
			path.join(config.configDir, 'styleguide/Wrapper'),
			path.resolve(config.configDir, '../shared/Logo.js'),
			'/absolute/Pathline.js',
			'my-design-system/Sections',
		]);
	});
});

describe('getReactRootFlavor', () => {
	/** A fake project whose node_modules holds the given react-dom version. */
	const createProject = (reactDomVersion?: string): string => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-react-root-'));
		fs.writeFileSync(path.join(dir, 'package.json'), '{ "name": "pizza" }');
		if (reactDomVersion) {
			const pkgDir = path.join(dir, 'node_modules/react-dom');
			fs.mkdirSync(pkgDir, { recursive: true });
			fs.writeFileSync(
				path.join(pkgDir, 'package.json'),
				JSON.stringify({ name: 'react-dom', version: reactDomVersion, main: 'index.js' })
			);
			fs.writeFileSync(path.join(pkgDir, 'index.js'), '');
		}
		return dir;
	};

	it.each([
		['16.14.0', 'legacy'],
		['17.0.2', 'legacy'],
		['18.3.1', 'modern'],
		['19.2.8', 'modern'],
		// The experimental channel is 19-based and has no render(), despite the 0 major
		['0.0.0-experimental-abc', 'modern'],
		// A version we cannot parse tells us nothing: prefer the API that still exists
		['garbage', 'modern'],
	])('should pick the root API for react-dom %s', (version, flavor) => {
		const dir = createProject(version);
		try {
			expect(getReactRootFlavor(dir)).toBe(flavor);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should fall back to the modern root when react-dom is not installed', () => {
		const dir = createProject();
		try {
			expect(getReactRootFlavor(dir)).toBe('modern');
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should resolve react-dom from the style guide config directory', () => {
		// The fixture apps have no node_modules of their own: the repo's React 19 is found
		expect(getReactRootFlavor(testApp('defaults'))).toBe('modern');
	});
});

describe('findExampleDependencies', () => {
	it('should collect bare module specifiers from imports and requires', () => {
		const dir = createTempDir({
			'Readme.md': [
				'    import map from "lodash/map";',
				"    import { Foo } from '@scope/pkg/sub';",
				'    const cx = require("classnames");',
				"    import 'side-effect';",
				'    <Button />',
			].join('\n'),
			'Other.md': "```jsx\nimport map from 'lodash/map';\nimport React from 'react';\n```",
		});
		try {
			expect(
				findExampleDependencies([path.join(dir, 'Readme.md'), path.join(dir, 'Other.md')])
			).toEqual(['lodash/map', '@scope/pkg/sub', 'classnames', 'side-effect', 'react']);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should skip relative, absolute and aliased specifiers', () => {
		const dir = createTempDir({
			'Readme.md': [
				"    import Button from './Button';",
				"    import Label from '../Label/Label.js';",
				"    import abs from '/abs/path.js';",
				"    import win from 'C:\\\\abs\\\\path.js';",
				"    import virtual from 'virtual:pizza';",
				"    import aliased from '~/components/Button';",
				"    import alias from '~';",
				"    import notAlias from '~pizza';",
				"    import react from 'react';",
			].join('\n'),
		});
		try {
			expect(findExampleDependencies([path.join(dir, 'Readme.md')], ['~'])).toEqual([
				'~pizza',
				'react',
			]);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should ignore missing files', () => {
		expect(findExampleDependencies(['/does/not/exist.md'])).toEqual([]);
	});
});

describe('getAliasNames', () => {
	it('should return moduleAliases names', () => {
		const config = loadConfig('defaults', { moduleAliases: { '~': '/src', components: '/c' } });
		expect(getAliasNames(config)).toEqual(['~', 'components']);
	});

	it('should add user Vite aliases in object form', () => {
		const config = loadConfig('defaults', { moduleAliases: { '~': '/src' } });
		expect(getAliasNames(config, { resolve: { alias: { '@': '/src', pizza: '/pizza' } } })).toEqual(
			['~', '@', 'pizza']
		);
	});

	it('should add user Vite aliases in array form, skipping RegExp ones', () => {
		const config = loadConfig('defaults');
		expect(
			getAliasNames(config, {
				resolve: {
					alias: [
						{ find: '@', replacement: '/src' },
						{ find: /^pizza\//, replacement: '/pizza/' },
					],
				},
			})
		).toEqual(['@']);
	});
});

describe('makeViteConfig', () => {
	it('should create a config rooted at the style guide config directory', async () => {
		const config = loadConfig('defaults');
		const result = await makeViteConfig(config, 'development');
		expect(result).toMatchObject({
			configFile: false,
			root: config.configDir,
			mode: 'development',
			base: '/',
			appType: 'custom',
			publicDir: false,
			define: { 'process.env.STYLEGUIDIST_ENV': '"development"' },
		});
	});

	it('should use relative asset URLs in production', async () => {
		const result = await makeViteConfig(loadConfig('defaults'), 'production');
		expect(result.mode).toBe('production');
		expect(result.base).toBe('./');
	});

	it('should configure the dev server from serverHost and serverPort', async () => {
		const config = loadConfig('defaults', { serverHost: 'localhost', serverPort: 1234 });
		const result = await makeViteConfig(config, 'development');
		expect(result.server).toMatchObject({ host: 'localhost', port: 1234, strictPort: true });
		// Styleguidist’s own files may live outside the project
		expect(result.server?.fs?.allow).toEqual(
			expect.arrayContaining([config.configDir, path.resolve(import.meta.dirname, '../../..')])
		);
	});

	it('should build into styleguideDir/build', async () => {
		const config = loadConfig('defaults', { styleguideDir: 'docs/styleguide', minimize: false });
		const result = await makeViteConfig(config, 'production');
		expect(result.build).toMatchObject({
			outDir: path.join(config.configDir, 'docs/styleguide'),
			emptyOutDir: false,
			assetsDir: 'build',
			minify: false,
			rolldownOptions: {
				input: { styleguide: 'virtual:rsg-entry' },
				output: {
					entryFileNames: 'build/bundle.[hash].js',
					chunkFileNames: 'build/[name].[hash].js',
					assetFileNames: 'build/[name].[hash][extname]',
					keepNames: true,
				},
			},
		});
		expect((await makeViteConfig(loadConfig('defaults'), 'production')).build?.minify).toBe('oxc');
	});

	it('should register the React and Styleguidist plugins', async () => {
		const result = await makeViteConfig(loadConfig('defaults'), 'development');
		const names = pluginNames(result.plugins);
		expect(names).toContain('vite:react-babel');
		expect(names.slice(-3)).toEqual(['rsg:absolute-paths', 'rsg:jsx-in-js', 'rsg:styleguidist']);
	});

	it('should point the dependency scanner at the client entry and the components', async () => {
		const config = loadConfig('defaults');
		const result = await makeViteConfig(config, 'development');
		expect(result.optimizeDeps?.entries).toEqual([
			expect.stringMatching(/\/client\/index\.[jt]s$/),
			path.join(config.configDir, 'src/components/Button.js'),
			path.join(config.configDir, 'src/components/Placeholder.js'),
		]);
		expect(result.optimizeDeps?.rolldownOptions).toEqual({ moduleTypes: { '.js': 'jsx' } });
	});

	it('should pre-bundle dependencies imported from examples', async () => {
		const dir = createTempDir({
			'package.json': '{ "name": "pizza" }',
			'Button.js': 'export default () => null;',
			'Button.md': "    import map from 'lodash/map';\n    import x from '~/x';\n    <Button />",
		});
		try {
			process.chdir(dir);
			const config = getConfig({ components: 'Button.js', moduleAliases: { '~': dir } });
			const result = await makeViteConfig(config, 'development');
			expect(result.optimizeDeps?.include).toEqual(['lodash/map']);
		} finally {
			process.chdir(cwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should add aliases for moduleAliases and styleguideComponents', async () => {
		const config = loadConfig('defaults', {
			moduleAliases: { '~': '/src' },
			styleguideComponents: { Wrapper: '/w.js' },
		});
		const result = await makeViteConfig(config, 'development');
		expect(result.resolve?.alias).toEqual([
			{ find: '~', replacement: '/src' },
			{ find: /^rsg-components\/Wrapper$/, replacement: '/w.js' },
			{ find: 'rsg-components', replacement: expect.any(String) },
			{ find: /^rsg-react-root$/, replacement: expect.any(String) },
			{ find: /^assert$/, replacement: expect.any(String) },
		]);
	});

	it('should alias the React root matching the project’s react-dom', async () => {
		const dir = createTempDir({ 'package.json': '{ "name": "pizza" }' });
		const pkgDir = path.join(dir, 'node_modules/react-dom');
		fs.mkdirSync(pkgDir, { recursive: true });
		fs.writeFileSync(
			path.join(pkgDir, 'package.json'),
			'{ "version": "16.14.0", "main": "index.js" }'
		);
		fs.writeFileSync(path.join(pkgDir, 'index.js'), '');
		try {
			process.chdir(dir);
			const result = await makeViteConfig(getConfig({}), 'production');
			expect(result.resolve?.alias).toContainEqual({
				find: /^rsg-react-root$/,
				replacement: expect.stringMatching(/\/client\/utils\/reactRoot\.legacy\.ts$/),
			});
		} finally {
			process.chdir(cwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	describe('user Vite config', () => {
		it('should merge the viteConfig option', async () => {
			const config = loadConfig('defaults', {
				viteConfig: {
					define: { __PIZZA__: '"yes"' },
					build: { outDir: 'elsewhere', sourcemap: true },
					server: { port: 1, open: true },
				},
			});
			const result = await makeViteConfig(config, 'production');
			expect(result.define).toMatchObject({
				__PIZZA__: '"yes"',
				'process.env.STYLEGUIDIST_ENV': '"production"',
			});
			expect(result.build?.sourcemap).toBe(true);
			expect(result.build?.outDir).toBe(path.join(config.configDir, 'styleguide'));
			expect(result.server).toMatchObject({ port: 6060, open: true });
		});

		it('should call the viteConfig function with the environment', async () => {
			const viteConfig = vi.fn((env: string) => ({ define: { __ENV__: JSON.stringify(env) } }));
			const result = await makeViteConfig(loadConfig('defaults', { viteConfig }), 'development');
			expect(viteConfig).toHaveBeenCalledWith('development');
			expect(result.define).toMatchObject({ __ENV__: '"development"' });
		});

		// Vite’s mergeConfig() puts the merged-in aliases first so that they take precedence
		it('should give user aliases priority over Styleguidist’s', async () => {
			const config = loadConfig('defaults', {
				viteConfig: { resolve: { alias: { components: '/project/components' } } },
			});
			const result = await makeViteConfig(config, 'development');
			expect(result.resolve?.alias).toEqual([
				{ find: 'components', replacement: '/project/components' },
				{ find: 'rsg-components', replacement: expect.any(String) },
				{ find: /^rsg-react-root$/, replacement: expect.any(String) },
				{ find: /^assert$/, replacement: expect.any(String) },
			]);
		});

		it('should not add @vitejs/plugin-react when the user config has it', async () => {
			const config = loadConfig('defaults', { viteConfig: { plugins: [react()] } });
			const names = pluginNames((await makeViteConfig(config, 'development')).plugins);
			expect(names.filter((name) => name === 'vite:react-babel')).toHaveLength(1);
			expect(names).toContain('rsg:styleguidist');
		});

		it('should load vite.config.* next to the style guide config', async () => {
			const dir = createTempDir({
				'package.json': '{ "name": "pizza" }',
				'vite.config.mjs': 'export default { define: { __FROM_VITE_CONFIG__: "true" } };',
			});
			try {
				process.chdir(dir);
				const result = await makeViteConfig(getConfig({}), 'development');
				expect(result.define).toMatchObject({ __FROM_VITE_CONFIG__: 'true' });
			} finally {
				process.chdir(cwd);
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('should pass the command and mode to a vite.config.* function', async () => {
			const dir = createTempDir({
				'package.json': '{ "name": "pizza" }',
				'vite.config.mjs':
					'export default ({ command, mode }) => ({ define: { __COMMAND__: JSON.stringify(command), __MODE__: JSON.stringify(mode) } });',
			});
			try {
				process.chdir(dir);
				const result = await makeViteConfig(getConfig({}), 'production');
				expect(result.define).toMatchObject({ __COMMAND__: '"build"', __MODE__: '"production"' });
			} finally {
				process.chdir(cwd);
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('should prefer the viteConfig option over vite.config.*', async () => {
			const dir = createTempDir({
				'package.json': '{ "name": "pizza" }',
				'vite.config.mjs': 'export default { define: { __FROM_VITE_CONFIG__: "true" } };',
			});
			try {
				process.chdir(dir);
				const result = await makeViteConfig(
					getConfig({ viteConfig: { define: { __FROM_OPTION__: 'true' } } }),
					'development'
				);
				expect(result.define).toMatchObject({ __FROM_OPTION__: 'true' });
				expect(result.define).not.toHaveProperty('__FROM_VITE_CONFIG__');
			} finally {
				process.chdir(cwd);
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('should work without any user Vite config', async () => {
			const config = loadConfig('no-vite-config');
			const result = await makeViteConfig(config, 'development');
			expect(result.root).toBe(config.configDir);
			expect(pluginNames(result.plugins)).toContain('vite:react-babel');
		});
	});

	it('should apply dangerouslyUpdateViteConfig last', async () => {
		const dangerouslyUpdateViteConfig = vi.fn((viteConfig: any, env: string) => ({
			...viteConfig,
			define: { ...viteConfig.define, __ENV__: JSON.stringify(env) },
		}));
		const config = loadConfig('defaults', {
			viteConfig: { define: { __PIZZA__: '"yes"' } },
			dangerouslyUpdateViteConfig,
		});
		const result = await makeViteConfig(config, 'production');
		expect(dangerouslyUpdateViteConfig).toHaveBeenCalledWith(
			expect.objectContaining({ define: expect.objectContaining({ __PIZZA__: '"yes"' }) }),
			'production'
		);
		expect(result.define).toMatchObject({ __PIZZA__: '"yes"', __ENV__: '"production"' });
	});
});
