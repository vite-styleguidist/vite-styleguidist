import fs from 'node:fs';
import path from 'node:path';
import getConfig from '../config.js';

const testComponent = (name: string) =>
	path.resolve(import.meta.dirname, '../../../test/components', name);
const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);

const cwd = process.cwd();
const configDir = testApp('defaults');

beforeEach(() => {
	process.chdir(configDir);
});
afterAll(() => {
	process.chdir(cwd);
});

it('should read a config file', () => {
	const result = getConfig('../basic/styleguide.config.js');
	expect(result).toMatchObject({ title: 'React Style Guide Example' });
});

it('should accept absolute path', () => {
	const result = getConfig(path.join(testApp('basic'), 'styleguide.config.js'));
	expect(result).toMatchObject({ title: 'React Style Guide Example' });
});

it('should throw when passed config file not found', () => {
	const fn = () => getConfig('pizza');
	expect(fn).toThrow('Styleguidist config not found');
});

it('should find config file automatically', () => {
	process.chdir('../basic');
	const result = getConfig();
	expect(result).toMatchObject({ title: 'React Style Guide Example' });
});

it('should find config file in a parent directory', () => {
	process.chdir('src/components');
	const result = getConfig();
	expect(result).toMatchObject({ configDir });
});

describe('config file formats', () => {
	// Styleguidist is an ES module but loads config files with `require()` (see
	// utils/loadModule.ts), which handles both module systems on supported Node versions.
	it('should load an ES module config file in a "type": "module" package', () => {
		process.chdir(testApp('esm'));
		expect(getConfig()).toMatchObject({ title: 'ESM Style Guide' });
	});

	it('should load a styleguide.config.mjs file', () => {
		process.chdir(testApp('mjs'));
		expect(getConfig()).toMatchObject({ title: 'MJS Style Guide' });
	});

	it('should load a styleguide.config.cjs file', () => {
		process.chdir(testApp('cjs'));
		expect(getConfig()).toMatchObject({ title: 'CJS Style Guide' });
	});

	it('should explain how to fix CommonJS syntax in an ES module package', () => {
		process.chdir(testApp('cjs-in-esm'));
		expect(() => getConfig()).toThrow(
			/uses the CommonJS `module`[\s\S]*"type": "module"[\s\S]*styleguide\.config\.cjs/
		);
	});

	// A `require()` on line 1 (the shape the Cookbook recipes use) throws before
	// `module.exports` is reached, so the message has to name the global that actually failed
	it('should explain how to fix a CommonJS require() in an ES module package', () => {
		process.chdir(testApp('require-in-esm'));
		expect(() => getConfig()).toThrow(
			/uses the CommonJS `require`[\s\S]*export default[\s\S]*import\.meta\.url[\s\S]*styleguide\.config\.cjs/
		);
	});
});

it('should accept config as an object', () => {
	const result = getConfig({
		title: 'Style guide',
	});
	expect(result).toMatchObject({ title: 'Style guide' });
});

it('should throw if config has errors', () => {
	expect(() =>
		getConfig({
			components: 42,
		} as any)
	).toThrow('should be string, function, or array');
});

it('should change the config using the update callback', () => {
	const result = getConfig(
		{
			title: 'Style guide',
		},
		(config) => {
			config.title = 'Pizza';
			return config;
		}
	);
	expect(result).toMatchObject({ title: 'Pizza' });
});

it('should have default getExampleFilename implementation', () => {
	const result = getConfig();
	expect(typeof result.getExampleFilename).toEqual('function');
});

it('default getExampleFilename should return Readme.md path if it exists', () => {
	process.chdir('../..');
	const result = getConfig();
	expect(result.getExampleFilename(testComponent('Button/Button.js'))).toEqual(
		testComponent('Button/Readme.md')
	);
});

it('default getExampleFilename should return Component.md path if it exists', () => {
	process.chdir('../..');
	const result = getConfig();
	expect(result.getExampleFilename(testComponent('Placeholder/Placeholder.js'))).toEqual(
		testComponent('Placeholder/Placeholder.md')
	);
});

it('default getExampleFilename should return Component.md path if it exists with index.js', () => {
	process.chdir('../..');
	const result = getConfig();
	result.components = './components/**/*.js';
	expect(result.getExampleFilename(testComponent('Label/Label.js'))).toEqual(
		testComponent('Label/Label.md')
	);
});

it('default getExampleFilename should return false if no examples file found', () => {
	process.chdir('../..');
	const result = getConfig();
	expect(result.getExampleFilename(testComponent('RandomButton/RandomButton.js'))).toBeFalsy();
});

it('should have default getComponentPathLine implementation', () => {
	const result = getConfig();
	expect(typeof result.getComponentPathLine).toEqual('function');
	expect(result.getComponentPathLine('components/Button.js')).toEqual('components/Button.js');
});

it('should have default title based on package.json name', () => {
	const result = getConfig();
	expect(result.title).toEqual('Pizza Style Guide');
});

it('configDir option should be a directory of a passed config', () => {
	const result = getConfig(path.join(configDir, 'styleguide.config.js'));
	expect(result).toMatchObject({ configDir });
});

it('configDir option should be a current directory if the config was passed as an object', () => {
	const result = getConfig({});
	expect(result).toMatchObject({ configDir: process.cwd() });
});

it('should absolutize assetsDir if it exists', () => {
	const assetsDir = 'src/components';
	const result = getConfig({
		assetsDir,
	});
	expect(result.assetsDir).toEqual(path.join(configDir, assetsDir));
});

it('should throw if assetsDir does not exist', () => {
	const fn = () =>
		getConfig({
			assetsDir: 'pizza',
		});
	expect(fn).toThrow();
});

it('should use embedded default example template if defaultExample=true', () => {
	const result = getConfig({
		defaultExample: true,
	});
	if (typeof result.defaultExample !== 'string') {
		throw new Error(`Expected a file path, got ${String(result.defaultExample)}`);
	}
	expect(fs.existsSync(result.defaultExample)).toBeTruthy();
});

it('should absolutize defaultExample if it is a string', () => {
	const result = getConfig({
		defaultExample: 'src/components/Button.md',
	});
	expect(result.defaultExample).toMatch(/^\//);
});

it('should throw if defaultExample does not exist', () => {
	expect(() =>
		getConfig({
			defaultExample: 'pizza',
		})
	).toThrow('does not exist');
});

it('should use components option as the first sections if there’s no sections option', () => {
	const components = 'components/*/*.js';
	const result = getConfig({
		components,
	});
	expect(result.sections).toHaveLength(1);
	expect(result.sections[0].components).toEqual(components);
});

it('should use default components option both components and sections options weren’t specified', () => {
	const result = getConfig();
	expect(result.sections).toHaveLength(1);
	expect(result.sections[0].components).toMatch('**');
});

it('should ignore components option there’s sections options', () => {
	const components = 'components/*/*.js';
	const result = getConfig({
		components: 'components/Button/*.js',
		sections: [
			{
				components,
			},
		],
	});
	expect(result.sections).toHaveLength(1);
	expect(result.sections[0].components).toEqual(components);
});

describe('Vite options', () => {
	it('should return viteConfig option as is', () => {
		const viteConfig = { define: { __PIZZA__: '"pepperoni"' } };
		const result = getConfig({
			viteConfig,
		});
		expect(result.viteConfig).toBe(viteConfig);
	});

	it('should accept viteConfig as a function', () => {
		const viteConfig = () => ({});
		const result = getConfig({
			viteConfig,
		});
		expect(result.viteConfig).toBe(viteConfig);
	});

	it('should read viteConfig from a config file', () => {
		process.chdir('../basic');
		const result = getConfig();
		expect(result.viteConfig).toMatchObject({
			resolve: { alias: { components: expect.stringMatching(/lib$/) } },
		});
	});

	it('should not require a Vite config', () => {
		process.chdir('../no-vite-config');
		expect(() => getConfig()).not.toThrow();
		expect(getConfig().viteConfig).toBeUndefined();
	});

	// The webpack options are kept in the schema only to point users at their replacement
	it.each([
		['webpackConfig', {}],
		['dangerouslyUpdateWebpackConfig', () => ({})],
		['updateWebpackConfig', () => ({})],
	])('should throw a helpful error for the removed %s option', (option, value) => {
		expect(() => getConfig({ [option]: value })).toThrow(
			/config option was removed[\s\S]*now uses Vite instead of webpack/
		);
	});
});

it('should throw when old template as a string option passed', () => {
	expect(() =>
		getConfig({
			template: 'pizza',
		} as any)
	).toThrow('format has been changed');
});

it('should throw when editorConfig option passed', () => {
	expect(() =>
		getConfig({
			editorConfig: { theme: 'foo' },
		})
	).toThrow('config option was removed');
});

it('mountPointId should have default value', () => {
	const result = getConfig();
	expect(result.mountPointId).toEqual('rsg-root');
});

it('resolver should default to a react-docgen resolver instance', () => {
	const result = getConfig();
	expect(typeof result.resolver).toBe('object');
	expect(typeof (result.resolver as { resolve?: unknown }).resolve).toBe('function');
});

it('compilerConfig should default to the in-browser compiler options', () => {
	const result = getConfig();
	expect(result.compilerConfig).toMatchObject({ transforms: expect.arrayContaining(['jsx']) });
});

it('should set the exampleMode to expand if the flag showCode is on', () => {
	const result = getConfig({
		showCode: true,
	});
	expect(result.exampleMode).toBe('expand');
});

it('should set the exampleMode to collapse if the flag showCode is off', () => {
	const result = getConfig({
		showCode: false,
	});
	expect(result.exampleMode).toBe('collapse');
});

it('should set the usageMode to expand if the flag showUsage is on', () => {
	const result = getConfig({
		showUsage: true,
	});
	expect(result.usageMode).toBe('expand');
});

it('should set the usageMode to collapse if the flag showUsage is off', () => {
	const result = getConfig({
		showUsage: false,
	});
	expect(result.usageMode).toBe('collapse');
});

describe('mdxComponents', () => {
	// The values become imports of a virtual module with no directory of its own, so a
	// relative path only works if it is resolved here, against the config file (C2/C3)
	it('should resolve a relative module path against the config directory', () => {
		const result = getConfig({
			mdxComponents: { Callout: 'src/docs/Callout' },
		});
		expect(result.mdxComponents).toEqual({
			Callout: path.join(configDir, 'src/docs/Callout'),
		});
	});

	it('should leave an absolute module path alone', () => {
		const absolute = path.join(configDir, 'src/docs/Callout');
		const result = getConfig({ mdxComponents: { Callout: absolute } });
		expect(result.mdxComponents).toEqual({ Callout: absolute });
	});

	it('should pass a component value through untouched', () => {
		const Callout = () => null;
		const result = getConfig({ mdxComponents: { Callout } });
		expect(result.mdxComponents).toEqual({ Callout });
	});

	it('should default to an empty map', () => {
		expect(getConfig().mdxComponents).toEqual({});
	});
});
