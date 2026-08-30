import glogg from 'glogg';
import type { InlineConfig, Plugin } from 'vite';
import mergeViteConfig, { IGNORED_OPTIONS, hasReactPlugin } from '../mergeViteConfig.js';

const logger = glogg('rsg');
afterEach(() => {
	logger.removeAllListeners();
});

const baseConfig: InlineConfig = {
	root: '/project',
	base: './',
	appType: 'custom',
	configFile: false,
	define: { 'process.env.STYLEGUIDIST_ENV': '"production"' },
	server: { host: '0.0.0.0', port: 6060, strictPort: true },
	build: {
		outDir: '/project/styleguide',
		emptyOutDir: false,
		rolldownOptions: { input: { styleguide: 'virtual:rsg-entry' } },
	},
	optimizeDeps: { include: ['react'] },
};

describe('mergeViteConfig', () => {
	it('should merge user options into the base config', () => {
		const result = mergeViteConfig(baseConfig, { define: { __PIZZA__: '"yes"' } }, 'production');
		expect(result.define).toEqual({
			'process.env.STYLEGUIDIST_ENV': '"production"',
			__PIZZA__: '"yes"',
		});
		expect(result.root).toBe('/project');
	});

	it('should concatenate arrays', () => {
		const result = mergeViteConfig(
			baseConfig,
			{ optimizeDeps: { include: ['lodash'] } },
			'production'
		);
		expect(result.optimizeDeps?.include).toEqual(['react', 'lodash']);
	});

	it('should call a function config with the environment', () => {
		const userConfig = vi.fn((env: string) => ({ define: { __ENV__: JSON.stringify(env) } }));
		const result = mergeViteConfig(baseConfig, userConfig, 'development');
		expect(userConfig).toHaveBeenCalledWith('development');
		expect(result.define).toMatchObject({ __ENV__: '"development"' });
	});

	it('should return the base config when the user config is empty', () => {
		expect(mergeViteConfig(baseConfig, () => undefined as any, 'production')).toBe(baseConfig);
	});

	it('should ignore options Styleguidist controls', () => {
		const result = mergeViteConfig(
			baseConfig,
			{
				root: '/elsewhere',
				base: '/pizza/',
				appType: 'spa',
				configFile: 'vite.config.js',
				server: {
					host: 'localhost',
					port: 3000,
					strictPort: false,
					middlewareMode: true,
					open: true,
				},
				build: {
					outDir: 'dist',
					emptyOutDir: true,
					sourcemap: true,
					rolldownOptions: { input: 'index.html', external: ['pizza'], output: { format: 'es' } },
					rollupOptions: { input: 'index.html', external: ['pizza'] },
					lib: { entry: 'src/index.ts' },
				},
			} as any,
			'production'
		);
		expect(result.root).toBe('/project');
		expect(result.base).toBe('./');
		expect(result.appType).toBe('custom');
		expect(result.configFile).toBe(false);
		// (Vite’s mergeConfig() adds normalized `hmr`/`ws` entries, hence no toEqual)
		expect(result.server).toMatchObject({
			host: '0.0.0.0',
			port: 6060,
			strictPort: true,
			open: true,
		});
		expect(result.server).not.toHaveProperty('middlewareMode');
		expect(result.build?.outDir).toBe('/project/styleguide');
		expect(result.build?.emptyOutDir).toBe(false);
		expect(result.build?.sourcemap).toBe(true);
		// The project's library-build settings must not leak into the style guide bundle
		expect(result.build?.rolldownOptions).toEqual({
			input: { styleguide: 'virtual:rsg-entry' },
		});
		expect(result.build).not.toHaveProperty('lib');
		// (Vite keeps the legacy `rollupOptions` in sync with `rolldownOptions`)
		expect((result.build as any).rollupOptions?.input).not.toBe('index.html');
		expect((result.build as any).rollupOptions?.external).toBeUndefined();
	});

	it('should log the ignored options', () => {
		const debug = vi.fn();
		logger.once('debug', debug);
		mergeViteConfig(
			baseConfig,
			{ root: '/elsewhere', server: { port: 3000 }, build: { rolldownOptions: { input: 'x' } } },
			'production'
		);
		expect(debug).toHaveBeenCalledWith(
			'Ignoring Vite config options: root, build.rolldownOptions.input, server.port'
		);
	});

	it('should not mutate the user config', () => {
		const userConfig = {
			root: '/elsewhere',
			server: { port: 3000, open: true },
			build: { rolldownOptions: { input: 'x' } },
		};
		const snapshot = JSON.parse(JSON.stringify(userConfig));
		mergeViteConfig(baseConfig, userConfig, 'production');
		expect(userConfig).toEqual(snapshot);
	});

	it('should list the ignored options for the documentation', () => {
		expect(IGNORED_OPTIONS).toMatchObject({
			'': expect.arrayContaining(['root', 'base']),
			build: expect.arrayContaining(['outDir']),
			'build.rolldownOptions': expect.arrayContaining(['input', 'external', 'output']),
			server: expect.arrayContaining(['host', 'port']),
		});
	});
});

describe('hasReactPlugin', () => {
	const reactPlugin = { name: 'vite:react-babel' } as Plugin;
	const otherPlugin = { name: 'vite:pizza' } as Plugin;

	it('should return false for no plugins', () => {
		expect(hasReactPlugin(undefined)).toBe(false);
		expect(hasReactPlugin([])).toBe(false);
	});

	it('should detect a plugin by name prefix', () => {
		expect(hasReactPlugin(reactPlugin)).toBe(true);
		expect(hasReactPlugin({ name: 'vite:react-refresh' } as Plugin)).toBe(true);
		expect(hasReactPlugin(otherPlugin)).toBe(false);
	});

	// @vitejs/plugin-react returns an array of plugins, and Vite allows nesting
	it('should look into nested arrays', () => {
		expect(hasReactPlugin([otherPlugin, [null, false, [reactPlugin]]])).toBe(true);
		expect(hasReactPlugin([otherPlugin, [null, false, [otherPlugin]]])).toBe(false);
	});
});
