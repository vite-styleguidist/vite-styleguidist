// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Plugin } from 'vite';
import getConfig from '../../scripts/config.js';
import styleguidistPlugin from '../plugin.js';
import {
	ENTRY_ID,
	STYLEGUIDE_ID,
	RESOLVED_ENTRY_ID,
	RESOLVED_STYLEGUIDE_ID,
	NULL,
	propsId,
	examplesId,
	mdxId,
} from '../ids.js';
import { CACHE_DIR_NAME, CACHE_FILE_NAME } from '../persistentCache.js';
import type * as Rsg from '../../typings/index.js';

const testDir = path.resolve(import.meta.dirname, '../../../test');
const component = (name: string) => path.join(testDir, 'components', name);
const CLIENT_ENTRY = '/styleguidist/lib/client/index.js';

// Vite hooks may be plain functions or `{ handler }` objects; our plugin uses functions
// but the types don’t know that
const hook = <T>(value: T | { handler: T } | undefined): T => {
	if (!value) {
		throw new Error('Hook not defined');
	}
	return typeof value === 'function' ? value : (value as { handler: T }).handler;
};

// A minimal plugin context: our hooks only register watch files and emit assets
const context = () => ({ addWatchFile: vi.fn(), emitFile: vi.fn() });

const cwd = process.cwd();
let config: Rsg.SanitizedStyleguidistConfig;
beforeAll(() => {
	process.chdir(testDir);
	config = getConfig({
		components: 'components/**/[A-Z]*.js',
		require: ['core-js/stable', '/path/to/styles.css'],
	});
});
afterAll(() => {
	process.chdir(cwd);
});

const createPlugin = (
	overrides: Partial<Rsg.SanitizedStyleguidistConfig> = {},
	env: Rsg.StyleguidistEnv = 'development'
): Plugin =>
	styleguidistPlugin({
		config: { ...config, ...overrides },
		env,
		clientEntry: CLIENT_ENTRY,
	});

describe('resolveId', () => {
	// resolveId is async: bare imports from examples modules are delegated to Vite
	const resolveId = (id: string, importer?: string, ctx: any = {}) =>
		(hook(createPlugin().resolveId) as any).call(ctx, id, importer, {});

	it('should map virtual ids to their resolved (null-prefixed) ids', async () => {
		await expect(resolveId(ENTRY_ID)).resolves.toBe(RESOLVED_ENTRY_ID);
		await expect(resolveId(STYLEGUIDE_ID)).resolves.toBe(RESOLVED_STYLEGUIDE_ID);
	});

	it('should prefix props and examples ids', async () => {
		const props = propsId(component('Button/Button.js'));
		const examples = examplesId({ file: component('Button/Readme.md'), displayName: 'Button' });
		await expect(resolveId(props)).resolves.toBe(NULL + props);
		await expect(resolveId(examples)).resolves.toBe(NULL + examples);
	});

	it('should prefix mdx ids', async () => {
		const mdx = mdxId({ file: component('Button/Readme.mdx'), displayName: 'Button' });
		await expect(resolveId(mdx)).resolves.toBe(NULL + mdx);
	});

	it('should resolve bare imports from an MDX module against the .mdx file', async () => {
		const mdxFile = component('Button/Readme.mdx');
		const importer = NULL + mdxId({ file: mdxFile, displayName: 'Button' });
		const resolve = vi.fn().mockResolvedValue({ id: '/resolved/clsx.js' });
		await expect(resolveId('clsx', importer, { resolve })).resolves.toEqual({
			id: '/resolved/clsx.js',
		});
		expect(resolve).toHaveBeenCalledWith('clsx', mdxFile, { skipSelf: true });
	});

	it('should leave other ids to Vite', async () => {
		await expect(resolveId('react')).resolves.toBeNull();
		await expect(resolveId(component('Button/Button.js'))).resolves.toBeNull();
	});

	it('should resolve bare imports from an examples module against the Markdown file', async () => {
		const markdownFile = component('Button/Readme.md');
		const importer = NULL + examplesId({ file: markdownFile, displayName: 'Button' });
		const resolve = vi.fn().mockResolvedValue({ id: '/resolved/react.js' });
		await expect(resolveId('react', importer, { resolve })).resolves.toEqual({
			id: '/resolved/react.js',
		});
		expect(resolve).toHaveBeenCalledWith('react', markdownFile, { skipSelf: true });
		// Relative specifiers were already absolutized by the examples generator
		await expect(resolveId('./Button.js', importer, { resolve })).resolves.toBeNull();
	});
});

describe('load', () => {
	// `load` is async: MDX modules are compiled there
	const load = (plugin: Plugin, id: string, ctx = context()) =>
		(hook(plugin.load) as any).call(ctx, id, {});

	it('should load the entry: require config items, then the client', async () => {
		expect(await load(createPlugin(), RESOLVED_ENTRY_ID)).toBe(
			[
				'import "core-js/stable";',
				'import "/path/to/styles.css";',
				`import "${CLIENT_ENTRY}";`,
			].join('\n') + '\n'
		);
	});

	it('should load the styleguide module', async () => {
		const ctx = context();
		const code = await load(createPlugin(), RESOLVED_STYLEGUIDE_ID, ctx);
		expect(code).toMatch('export default {');
		expect(code).toMatch(component('Button/Button.js'));
		expect(ctx.addWatchFile).not.toHaveBeenCalled();
	});

	it('should watch theme and styles files of the styleguide module', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-plugin-theme-'));
		const theme = path.join(dir, 'theme.js');
		fs.writeFileSync(theme, 'export default {}');
		try {
			const ctx = context();
			load(createPlugin({ theme }), RESOLVED_STYLEGUIDE_ID, ctx);
			expect(ctx.addWatchFile).toHaveBeenCalledWith(theme);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should load component docs and watch the component', async () => {
		const file = component('Button/Button.js');
		const ctx = context();
		const code = await load(createPlugin(), NULL + propsId(file), ctx);
		expect(code).toMatch('"displayName": "Button"');
		expect(code).toMatch('export default {');
		expect(ctx.addWatchFile).toHaveBeenCalledWith(file);
	});

	it('should load examples and watch the Markdown file', async () => {
		const file = component('Button/Readme.md');
		const ctx = context();
		const code = await load(
			createPlugin(),
			NULL +
				examplesId({ file, displayName: 'Button', componentPath: component('Button/Button.js') }),
			ctx
		);
		expect(code).toMatch('"content": "<Button>Push Me</Button>"');
		expect(code).toMatch('export default [');
		expect(ctx.addWatchFile).toHaveBeenCalledWith(file);
	});

	it('should load an MDX page and watch the .mdx file', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-plugin-mdx-'));
		const mdxFile = path.join(dir, 'Readme.mdx');
		fs.writeFileSync(mdxFile, 'Prose.\n\n```jsx\n<Button>Push Me</Button>\n```\n');
		try {
			const ctx = context();
			const code = await load(createPlugin(), NULL + mdxId({ file: mdxFile }), ctx);
			expect(code).toMatch('type: "mdx"');
			expect(code).toMatch('"content": "<Button>Push Me</Button>"');
			expect(ctx.addWatchFile).toHaveBeenCalledWith(mdxFile);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should report an MDX syntax error with the file, line and column', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-plugin-mdx-bad-'));
		const mdxFile = path.join(dir, 'Readme.mdx');
		fs.writeFileSync(mdxFile, 'Fine.\n\n<Callout>\n');
		try {
			const error: any = await load(createPlugin(), NULL + mdxId({ file: mdxFile })).catch(
				(err: unknown) => err
			);
			expect(error.message).toMatch(mdxFile);
			expect(error.loc).toEqual({ file: mdxFile, line: 3, column: 0 });
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should leave other ids to Vite', async () => {
		expect(await load(createPlugin(), component('Button/Button.js'))).toBeNull();
	});
});

describe('configureServer', () => {
	const createServer = () => ({
		middlewares: { use: vi.fn() },
		watcher: { add: vi.fn() },
		transformIndexHtml: vi.fn(async (_url: string, html: string) => `${html}<!-- vite -->`),
	});

	const configure = (plugin: Plugin, server = createServer()) => {
		const postHook = (hook(plugin.configureServer) as any).call({}, server);
		return { server, postHook };
	};

	it('should call the configureServer config option with the middlewares, env and server', () => {
		const configureServer = vi.fn();
		const { server } = configure(createPlugin({ configureServer }));
		expect(configureServer).toHaveBeenCalledWith(server.middlewares, 'development', server);
	});

	it('should serve static assets from assetsDir after the style guide page', () => {
		const { server, postHook } = configure(
			createPlugin({ assetsDir: [testDir, path.join(testDir, 'components')] })
		);
		// Static assets are registered in the post hook, AFTER the page middleware and the
		// machine-readable docs: an index.html (or docs.json) inside assetsDir must not
		// shadow the generated files
		expect(server.middlewares.use).not.toHaveBeenCalled();
		postHook();
		expect(server.middlewares.use).toHaveBeenCalledTimes(4);
		expect(server.middlewares.use).toHaveBeenCalledWith(expect.any(Function));
	});

	it('should not serve the machine-readable docs when the option is off', () => {
		const { server, postHook } = configure(createPlugin({ machineReadable: false }));
		postHook();
		expect(server.middlewares.use).toHaveBeenCalledTimes(1);
	});

	it('should watch the components directory for added and removed files', () => {
		const plugin = createPlugin();
		const { server } = configure(plugin);
		(hook(plugin.load) as any).call(context(), RESOLVED_STYLEGUIDE_ID, {});
		expect(server.watcher.add).toHaveBeenCalledWith(path.join(testDir, 'components'));
	});

	const response = () => ({ statusCode: 0, setHeader: vi.fn(), end: vi.fn() });

	describe('HTML middleware', () => {
		const getMiddleware = () => {
			const { server, postHook } = configure(createPlugin({ machineReadable: false }));
			postHook();
			return { server, middleware: server.middlewares.use.mock.calls.at(-1)?.[0] };
		};

		it('should be registered after Vite’s own middlewares', () => {
			const { server, postHook } = configure(createPlugin({ machineReadable: false }));
			expect(server.middlewares.use).not.toHaveBeenCalled();
			postHook();
			expect(server.middlewares.use).toHaveBeenCalledTimes(1);
		});

		it('should serve the style guide page for the root URL', async () => {
			const { server, middleware } = getMiddleware();
			const res = response();
			const next = vi.fn();
			await middleware({ url: '/?foo=bar', originalUrl: '/?foo=bar' }, res, next);
			expect(next).not.toHaveBeenCalled();
			expect(server.transformIndexHtml).toHaveBeenCalledWith(
				'/?foo=bar',
				expect.stringMatching('<!DOCTYPE html>'),
				'/?foo=bar'
			);
			expect(res.statusCode).toBe(200);
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
			const html = res.end.mock.calls[0][0];
			expect(html).toMatch(`<div id="${config.mountPointId}"></div>`);
			// The entry is a virtual module: Vite serves it under /@id/ with an encoded null byte
			expect(html).toMatch('<script type="module" src="/@id/__x00__virtual:rsg-entry"></script>');
			expect(html).toMatch('<!-- vite -->');
		});

		it('should serve the style guide page for index.html', async () => {
			const { middleware } = getMiddleware();
			const res = response();
			await middleware({ url: '/index.html' }, res, vi.fn());
			expect(res.end).toHaveBeenCalled();
		});

		it('should pass other requests on', async () => {
			const { middleware } = getMiddleware();
			const res = response();
			const next = vi.fn();
			await middleware({ url: '/src/Button.js' }, res, next);
			expect(next).toHaveBeenCalledWith();
			expect(res.end).not.toHaveBeenCalled();
		});

		it('should pass errors on', async () => {
			const { server, middleware } = getMiddleware();
			const error = new Error('pizza');
			server.transformIndexHtml.mockRejectedValueOnce(error);
			const next = vi.fn();
			await middleware({ url: '/' }, response(), next);
			expect(next).toHaveBeenCalledWith(error);
		});
	});

	describe('machine-readable docs middleware', () => {
		// Registered right after the page middleware, before the static assets
		const getMiddleware = (overrides: Partial<Rsg.SanitizedStyleguidistConfig> = {}) => {
			const { server, postHook } = configure(createPlugin(overrides));
			postHook();
			return server.middlewares.use.mock.calls[1][0];
		};

		it('should serve docs.json, regenerated from the sources', async () => {
			const middleware = getMiddleware();
			const res = response();
			const next = vi.fn();
			await middleware({ method: 'GET', url: '/docs.json?nocache' }, res, next);
			expect(next).not.toHaveBeenCalled();
			expect(res.statusCode).toBe(200);
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
			expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
			const manifest = JSON.parse(res.end.mock.calls[0][0]);
			expect(manifest.source).toBe('vite-styleguidist');
			expect(manifest.sections[0].components.map((c: any) => c.name)).toContain('Button');
		});

		// One page that cannot be compiled used to 500 all three files for the whole guide
		// in development (C8); the build keeps failing, see machineReadable.spec.ts
		it('should serve the rest of the guide when one MDX page does not compile', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-plugin-mdx-manifest-'));
			const broken = path.join(dir, 'Broken.mdx');
			fs.writeFileSync(broken, 'Prose.\n\n<Callout>\n');
			try {
				const middleware = getMiddleware({
					sections: [
						{ name: 'Broken', content: broken },
						{ name: 'Components', components: 'components/**/[A-Z]*.js' },
					],
				});
				const res = response();
				const next = vi.fn();
				await middleware({ method: 'GET', url: '/docs.json' }, res, next);

				expect(next).not.toHaveBeenCalled();
				expect(res.statusCode).toBe(200);
				const manifest = JSON.parse(res.end.mock.calls[0][0]);
				expect(manifest.sections[0].error).toMatch(broken);
				expect(manifest.sections[1].components.map((c: any) => c.name)).toContain('Button');
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('should serve llms.txt and llms-full.txt as text', async () => {
			const middleware = getMiddleware({ title: 'Served' });
			for (const url of ['/llms.txt', '/llms-full.txt']) {
				const res = response();
				await middleware({ method: 'GET', url }, res, vi.fn());
				expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
				expect(res.end.mock.calls[0][0]).toMatch(/^# Served\n/);
			}
		});

		it('should pass other requests and methods on', () => {
			const middleware = getMiddleware();
			for (const req of [
				{ method: 'GET', url: '/docs.json.map' },
				{ method: 'GET', url: '/build/docs.json' },
				{ method: 'POST', url: '/docs.json' },
			]) {
				const next = vi.fn();
				const res = response();
				middleware(req, res, next);
				expect(next).toHaveBeenCalledWith();
				expect(res.end).not.toHaveBeenCalled();
			}
		});

		it('should pass errors on', async () => {
			// A section content file that disappeared makes getSections() throw
			const middleware = getMiddleware({
				sections: [{ name: 'Gone', content: 'nope.md' }],
			});
			const next = vi.fn();
			await middleware({ method: 'GET', url: '/llms.txt' }, response(), next);
			expect(next).toHaveBeenCalledWith(expect.any(Error));
		});
	});
});

describe('hotUpdate', () => {
	const button = component('Button/Button.js');
	const readme = component('Button/Readme.md');

	const createGraph = (ids: string[]) => {
		const idToModuleMap = new Map(ids.map((id) => [id, { id }]));
		return {
			idToModuleMap,
			getModuleById: (id: string) => idToModuleMap.get(id),
			invalidateModule: vi.fn(),
		};
	};

	const hotUpdate = (
		plugin: Plugin,
		graph: ReturnType<typeof createGraph>,
		options: {
			file: string;
			type: 'create' | 'update' | 'delete';
			modules?: any[];
			envName?: string;
		}
	) =>
		(hook(plugin.hotUpdate) as any).call(
			{ environment: { name: options.envName || 'client', moduleGraph: graph } },
			{
				file: options.file,
				timestamp: 42,
				modules: options.modules || [],
				type: options.type,
				read: () => Promise.resolve(''),
				server: {},
			}
		);

	it('should only handle the client environment', () => {
		const graph = createGraph([NULL + propsId(button)]);
		const result = hotUpdate(createPlugin(), graph, {
			file: button,
			type: 'update',
			envName: 'ssr',
		});
		expect(result).toBeUndefined();
		expect(graph.invalidateModule).not.toHaveBeenCalled();
	});

	it('should regenerate the docs of a changed component', () => {
		const propsModule = NULL + propsId(button);
		const graph = createGraph([propsModule]);
		const ownModules = [{ id: button }];
		const result = hotUpdate(createPlugin(), graph, {
			file: button,
			type: 'update',
			modules: ownModules,
		});
		expect(graph.invalidateModule).toHaveBeenCalledWith({ id: propsModule }, new Set(), 42, true);
		// Vite’s own modules (Fast Refresh of the component) are kept
		expect(result).toEqual([...ownModules, { id: propsModule }]);
	});

	it('should do nothing for files without generated modules', () => {
		const graph = createGraph([]);
		const ownModules = [{ id: button }];
		const result = hotUpdate(createPlugin(), graph, {
			file: button,
			type: 'update',
			modules: ownModules,
		});
		expect(result).toBeUndefined();
		expect(graph.invalidateModule).not.toHaveBeenCalled();
	});

	it('should rescan components when a file is added to the components directory', () => {
		const graph = createGraph([RESOLVED_STYLEGUIDE_ID]);
		const plugin = createPlugin();
		// The plugin learns the directories to watch when generating the styleguide module
		(hook(plugin.load) as any).call(context(), RESOLVED_STYLEGUIDE_ID, {});
		hotUpdate(plugin, graph, { file: component('New/New.js'), type: 'create' });
		expect(graph.invalidateModule).toHaveBeenCalledWith(
			{ id: RESOLVED_STYLEGUIDE_ID },
			new Set(),
			42,
			true
		);
	});

	it('should not rescan components when a file changes', () => {
		const graph = createGraph([RESOLVED_STYLEGUIDE_ID]);
		const plugin = createPlugin();
		(hook(plugin.load) as any).call(context(), RESOLVED_STYLEGUIDE_ID, {});
		hotUpdate(plugin, graph, { file: button, type: 'update' });
		expect(graph.invalidateModule).not.toHaveBeenCalled();
	});

	it('should regenerate the docs of a component when its examples file appears', () => {
		const propsModule = NULL + propsId(button);
		const graph = createGraph([propsModule, NULL + propsId(component('Price/Price.js'))]);
		const plugin = createPlugin();
		// The plugin learns the components of the guide when generating the styleguide module
		(hook(plugin.load) as any).call(context(), RESOLVED_STYLEGUIDE_ID, {});
		const result = hotUpdate(plugin, graph, { file: readme, type: 'create' });
		expect(graph.invalidateModule).toHaveBeenCalledTimes(1);
		expect(graph.invalidateModule).toHaveBeenCalledWith({ id: propsModule }, new Set(), 42, true);
		expect(result).toEqual([{ id: propsModule }]);
	});

	it('should regenerate the docs of a component when an .mdx examples file appears', () => {
		const propsModule = NULL + propsId(button);
		const graph = createGraph([propsModule]);
		const getExampleFilename = (file: string) =>
			file === button ? component('Button/Readme.mdx') : false;
		const plugin = createPlugin({ getExampleFilename });
		(hook(plugin.load) as any).call(context(), RESOLVED_STYLEGUIDE_ID, {});
		const result = hotUpdate(plugin, graph, {
			file: component('Button/Readme.mdx'),
			type: 'create',
		});
		expect(graph.invalidateModule).toHaveBeenCalledWith({ id: propsModule }, new Set(), 42, true);
		expect(result).toEqual([{ id: propsModule }]);
	});

	it('should return only the regenerated modules when a file is deleted', () => {
		const propsModule = NULL + propsId(button);
		const graph = createGraph([propsModule]);
		const plugin = createPlugin();
		(hook(plugin.load) as any).call(context(), RESOLVED_STYLEGUIDE_ID, {});
		const result = hotUpdate(plugin, graph, {
			file: readme,
			type: 'delete',
			modules: [{ id: readme }],
		});
		expect(result).toEqual([{ id: propsModule }]);
	});
});

describe('generateBundle', () => {
	const generateBundle = async (plugin: Plugin, bundle: Record<string, any>, ctx = context()) => {
		await (hook(plugin.generateBundle) as any).call(ctx, {}, bundle, false);
		return ctx;
	};

	const bundle = () => ({
		'build/bundle.abc.js': {
			type: 'chunk',
			isEntry: true,
			fileName: 'build/bundle.abc.js',
			imports: [],
			viteMetadata: { importedCss: new Set() },
		},
	});

	it('should emit index.html referencing the entry chunk and its CSS', async () => {
		const ctx = await generateBundle(createPlugin({ machineReadable: false }), {
			'build/bundle.abc.js': {
				type: 'chunk',
				isEntry: true,
				fileName: 'build/bundle.abc.js',
				imports: ['build/vendor.def.js'],
				viteMetadata: { importedCss: new Set(['build/bundle.abc.css']) },
			},
			'build/vendor.def.js': {
				type: 'chunk',
				isEntry: false,
				fileName: 'build/vendor.def.js',
				imports: ['build/bundle.abc.js'],
				viteMetadata: { importedCss: new Set(['build/vendor.def.css']) },
			},
			'build/bundle.abc.css': { type: 'asset', fileName: 'build/bundle.abc.css' },
		});
		expect(ctx.emitFile).toHaveBeenCalledTimes(1);
		const { type, fileName, source } = ctx.emitFile.mock.calls[0][0];
		expect(type).toBe('asset');
		expect(fileName).toBe('index.html');
		expect(source).toMatch('<script type="module" src="./build/bundle.abc.js"></script>');
		expect(source).toMatch('<link rel="stylesheet" href="./build/bundle.abc.css">');
		// CSS of imported chunks (a circular import must not loop forever)
		expect(source).toMatch('<link rel="stylesheet" href="./build/vendor.def.css">');
		expect(source).not.toMatch('vendor.def.js');
	});

	it('should emit nothing without an entry chunk', async () => {
		const ctx = await generateBundle(createPlugin(), {
			'build/style.css': { type: 'asset', fileName: 'build/style.css' },
		});
		expect(ctx.emitFile).not.toHaveBeenCalled();
	});

	it('should emit the machine-readable docs next to index.html', async () => {
		const ctx = await generateBundle(createPlugin({ title: 'Built' }), bundle());
		const emitted = ctx.emitFile.mock.calls.map((call) => call[0]);
		expect(emitted.map((file) => file.fileName)).toEqual([
			'index.html',
			'docs.json',
			'llms.txt',
			'llms-full.txt',
		]);
		expect(emitted.every((file) => file.type === 'asset')).toBe(true);
		expect(JSON.parse(emitted[1].source)).toMatchObject({
			name: 'Built',
			source: 'vite-styleguidist',
		});
		expect(emitted[2].source).toMatch(/^# Built\n/);
		expect(emitted[3].source).toMatch(/^# Built\n/);
	});

	it('should emit only index.html when machineReadable is off', async () => {
		const ctx = await generateBundle(createPlugin({ machineReadable: false }), bundle());
		expect(ctx.emitFile).toHaveBeenCalledTimes(1);
	});
});

describe('closeBundle', () => {
	const setup = () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-plugin-assets-'));
		const assets = path.join(dir, 'assets');
		const styleguideDir = path.join(dir, 'styleguide');
		fs.mkdirSync(path.join(assets, 'images'), { recursive: true });
		fs.writeFileSync(path.join(assets, 'images', 'logo.png'), 'PNG');
		fs.writeFileSync(path.join(assets, 'CNAME'), 'pizza.example');
		return { dir, assets, styleguideDir };
	};

	// `closeBundle` is async since it also tears down the parse pool (see parsePool.ts), so
	// the copy it does afterwards has to be awaited before the folder is inspected
	it('should copy assetsDir folders into the style guide folder', async () => {
		const { dir, assets, styleguideDir } = setup();
		try {
			await (
				hook(createPlugin({ assetsDir: assets, styleguideDir }, 'production').closeBundle) as any
			).call({});
			expect(fs.readFileSync(path.join(styleguideDir, 'images', 'logo.png'), 'utf8')).toBe('PNG');
			expect(fs.readFileSync(path.join(styleguideDir, 'CNAME'), 'utf8')).toBe('pizza.example');
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should never overwrite the generated style guide files', async () => {
		const { dir, assets, styleguideDir } = setup();
		fs.writeFileSync(path.join(assets, 'index.html'), 'THE USER APP');
		fs.mkdirSync(styleguideDir, { recursive: true });
		fs.writeFileSync(path.join(styleguideDir, 'index.html'), 'THE STYLE GUIDE');
		try {
			await (
				hook(createPlugin({ assetsDir: assets, styleguideDir }, 'production').closeBundle) as any
			).call({});
			expect(fs.readFileSync(path.join(styleguideDir, 'index.html'), 'utf8')).toBe(
				'THE STYLE GUIDE'
			);
			expect(fs.readFileSync(path.join(styleguideDir, 'CNAME'), 'utf8')).toBe('pizza.example');
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should copy nothing when the dev server shuts down', async () => {
		const { dir, assets, styleguideDir } = setup();
		try {
			await (
				hook(createPlugin({ assetsDir: assets, styleguideDir }, 'development').closeBundle) as any
			).call({});
			expect(fs.existsSync(styleguideDir)).toBe(false);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

/**
 * The `cache` option wired into `load` (see ./persistentCache.ts). The plugin only opens the
 * cache in `configResolved`, because Vite is the one that knows where its `cacheDir` is.
 */
describe('the parse cache', () => {
	const cacheFile = (dir: string) =>
		path.join(dir, CACHE_DIR_NAME, CACHE_FILE_NAME);

	/** A plugin with its cache pointed at a fresh directory, ready to load modules. */
	const withCache = (dir: string, overrides: Partial<Rsg.SanitizedStyleguidistConfig> = {}) => {
		const plugin = createPlugin(overrides);
		(hook(plugin.configResolved) as any).call({}, { cacheDir: dir });
		return plugin;
	};

	const loadProps = (plugin: Plugin, file: string) =>
		(hook(plugin.load) as any).call(context(), NULL + propsId(file));

	let dir: string;
	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-plugin-cache-'));
	});
	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('should write what it parsed and serve it to the next run', async () => {
		const file = component('Button/Button.js');
		const first = withCache(dir);
		const parsed = await loadProps(first, file);
		await (hook(first.buildEnd) as any).call({});
		expect(fs.existsSync(cacheFile(dir))).toBe(true);

		// Prove the second run reads the file instead of parsing again: the stored module
		// source is replaced with a sentinel no parser could produce
		const stored = JSON.parse(fs.readFileSync(cacheFile(dir), 'utf8'));
		const [key] = Object.keys(stored.docs);
		stored.docs[key].code = 'export default "FROM THE CACHE";';
		fs.writeFileSync(cacheFile(dir), JSON.stringify(stored));

		const second = withCache(dir);
		expect(await loadProps(second, file)).toBe('export default "FROM THE CACHE";');
		expect(parsed).toContain('displayName');
	});

	it('should re-parse a component whose content changed', async () => {
		const source = fs.readFileSync(component('Button/Button.js'), 'utf8');
		const file = path.join(dir, 'Changing.js');
		fs.writeFileSync(file, source);

		const first = withCache(dir);
		await loadProps(first, file);
		await (hook(first.buildEnd) as any).call({});

		fs.writeFileSync(file, source.replace('The only true button.', 'EDITED DESCRIPTION'));
		const second = withCache(dir);
		expect(await loadProps(second, file)).toContain('EDITED DESCRIPTION');
	});

	it('should write nothing when the option is off', async () => {
		const plugin = createPlugin({ cache: false });
		(hook(plugin.configResolved) as any).call({}, { cacheDir: dir });
		await loadProps(plugin, component('Button/Button.js'));
		await (hook(plugin.buildEnd) as any).call({});
		expect(fs.existsSync(cacheFile(dir))).toBe(false);
	});

	it('should cache examples modules too', async () => {
		const file = component('Button/Readme.md');
		const id = NULL + examplesId({ file, displayName: 'Button' });
		const first = withCache(dir);
		await (hook(first.load) as any).call(context(), id);
		await (hook(first.buildEnd) as any).call({});

		const stored = JSON.parse(fs.readFileSync(cacheFile(dir), 'utf8'));
		expect(Object.keys(stored.examples)).toHaveLength(1);
		const [key] = Object.keys(stored.examples);
		stored.examples[key].code = 'export default "EXAMPLES FROM THE CACHE";';
		fs.writeFileSync(cacheFile(dir), JSON.stringify(stored));

		const second = withCache(dir);
		expect(await (hook(second.load) as any).call(context(), id)).toBe(
			'export default "EXAMPLES FROM THE CACHE";'
		);
	});
});

describe('buildStart', () => {
	it('should load a module-path propsParser before anything is parsed', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-plugin-parser-'));
		try {
			const parser = path.join(dir, 'parser.cjs');
			fs.writeFileSync(parser, 'throw new Error("the parser exploded");');
			const plugin = createPlugin({ propsParser: parser as never });
			// Named after the option, not after whatever the module threw deep in a load hook
			expect(() => (hook(plugin.buildStart) as any).call({})).toThrow(/propsParser/);
			expect(() => (hook(plugin.buildStart) as any).call({})).toThrow(/the parser exploded/);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should do nothing for the default parser', () => {
		expect(() => (hook(createPlugin().buildStart) as any).call({})).not.toThrow();
	});
});

/**
 * The worker pool end to end through the plugin: the modules it produces must be the ones a
 * main-thread run produces, and `closeBundle` has to terminate the workers (an undead worker
 * keeps the whole process alive, so `styleguidist build` would never exit).
 */
describe('parallel parsing', () => {
	it('should produce the same modules as the main thread, and shut its workers down', async () => {
		const file = component('Button/Button.js');
		const parallel = createPlugin({ parallel: 2 });
		const single = createPlugin({ parallel: false });
		// The styleguide module is what tells the plugin how many components there are
		await (hook(parallel.load) as any).call(context(), RESOLVED_STYLEGUIDE_ID);
		const fromWorkers = await (hook(parallel.load) as any).call(context(), NULL + propsId(file));
		const fromMainThread = await (hook(single.load) as any).call(context(), NULL + propsId(file));
		expect(fromWorkers).toBe(fromMainThread);
		await expect((hook(parallel.closeBundle) as any).call({})).resolves.toBeUndefined();
	});
});
