import path from 'node:path';
import styleguidist from '../index.esm.js';
import { MOCK_BUILD_OUTPUT } from '../__mocks__/build.js';
import { MOCK_SERVER } from '../__mocks__/server.js';
import testConfig from '../../../test/data/styleguide.config.js';

// Building or starting a real Vite server is out of scope here (see make-vite-config.spec.ts
// for the generated Vite config); the mocks only call back with canned values
vi.mock('../build.js', () => import('../__mocks__/build.js'));
vi.mock('../server.js', () => import('../__mocks__/server.js'));

const cwd = process.cwd();
afterEach(() => {
	process.chdir(cwd);
});

it('should return API methods', () => {
	const api = styleguidist(testConfig);
	expect(api).toBeTruthy();
	expect(typeof api.build).toBe('function');
	expect(typeof api.server).toBe('function');
	expect(typeof api.makeViteConfig).toBe('function');
});

it('should expose the normalized config', () => {
	const api = styleguidist(testConfig);
	expect(api.config).toMatchObject({
		title: 'React Style Guide Example',
		configDir: cwd,
		sections: [{ components: './components/**/[A-Z]*.js' }],
	});
});

it('should accept a config file path', () => {
	const api = styleguidist(path.resolve(cwd, 'test/apps/basic/styleguide.config.js'));
	expect(api.config).toMatchObject({
		title: 'React Style Guide Example',
		configDir: path.resolve(cwd, 'test/apps/basic'),
	});
});

it('should throw for an invalid config', () => {
	expect(() => styleguidist({ components: 42 } as any)).toThrow(
		'Something is wrong with your style guide config'
	);
});

describe('makeViteConfig', () => {
	it('should return production Vite config by default', async () => {
		const api = styleguidist(testConfig);
		const result = await api.makeViteConfig();
		expect(result.mode).toBe('production');
		expect(result.root).toBe(cwd);
	});

	it('should return development Vite config', async () => {
		const api = styleguidist(testConfig);
		const result = await api.makeViteConfig('development');
		expect(result.mode).toBe('development');
	});
});

describe('build', () => {
	it('should pass style guide config and build output to callback', async () => {
		const config = {
			components: '*.js',
		};
		const callback = vi.fn();
		const api = styleguidist(config);
		await api.build(callback);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback.mock.calls[0][0]).toBeNull();
		expect(callback.mock.calls[0][1].components).toBe(config.components);
		expect(callback.mock.calls[0][2]).toBe(MOCK_BUILD_OUTPUT);
	});

	it('should resolve to the build output without a callback', async () => {
		const api = styleguidist({});
		await expect(api.build()).resolves.toBe(MOCK_BUILD_OUTPUT);
	});
});

describe('server', () => {
	it('should pass style guide config and dev server to callback', async () => {
		const config = {
			components: '*.js',
		};
		const callback = vi.fn();
		const api = styleguidist(config);
		await api.server(callback);

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback.mock.calls[0][0]).toBeUndefined();
		expect(callback.mock.calls[0][1].components).toBe(config.components);
		expect(callback.mock.calls[0][2]).toBe(MOCK_SERVER);
	});

	it('should resolve to the dev server without a callback', async () => {
		const api = styleguidist({});
		await expect(api.server()).resolves.toBe(MOCK_SERVER);
	});
});
