// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import glogg from 'glogg';
import { Parser } from 'acorn';
import type { Node } from 'acorn';
import getConfig from '../../scripts/config.js';
import generateStyleguideModule, { CLIENT_CONFIG_OPTIONS } from '../modules/styleguide.js';
import generatePropsModule from '../modules/props.js';
import generateExamplesModule, { resolveExampleImport } from '../modules/examples.js';
import { propsId, toPosix } from '../ids.js';
import type * as Rsg from '../../typings/index.js';

const logger = glogg('rsg');

// The generated modules must be valid ES modules: a parse failure would only show up
// in the browser otherwise
const parseModule = (code: string) =>
	Parser.parse(code, { ecmaVersion: 'latest', sourceType: 'module' }) as Node & { body: any[] };

/** The `init` expression of a top-level `const <name> = ...` declaration. */
const findDeclaration = (code: string, name: string): any => {
	for (const node of parseModule(code).body) {
		if (node.type === 'VariableDeclaration') {
			const declarator = node.declarations.find((item: any) => item.id.name === name);
			if (declarator) {
				return declarator.init;
			}
		}
	}
	throw new Error(`Declaration ${name} not found`);
};

/** Ids of the modules imported by the serializer (`import * as __rsg_N from "..."`). */
const importsOf = (code: string) =>
	parseModule(code)
		.body.filter(
			(node) =>
				node.type === 'ImportDeclaration' &&
				node.specifiers.some((specifier: any) => specifier.type === 'ImportNamespaceSpecifier')
		)
		.map((node) => node.source.value as string);

const testDir = path.resolve(import.meta.dirname, '../../../test');
const component = (name: string) => path.join(testDir, 'components', name);

const cwd = process.cwd();
let config: Rsg.SanitizedStyleguidistConfig;
beforeAll(() => {
	// getConfig() resolves paths against the current directory
	process.chdir(testDir);
	config = getConfig({
		components: 'components/**/[A-Z]*.js',
		defaultExample: true,
	});
});
afterAll(() => {
	process.chdir(cwd);
});
afterEach(() => {
	logger.removeAllListeners();
});

describe('generateStyleguideModule', () => {
	it('should generate an ES module exporting the style guide data', () => {
		const { code } = generateStyleguideModule(config);
		expect(code).toMatch(/^import \* as __rsg_0 from "/);
		expect(code).toMatch('\nexport default {');
		expect(() => parseModule(code)).not.toThrow();
	});

	it('should import components, their docs and metadata', () => {
		const { code } = generateStyleguideModule(config);
		const imports = importsOf(code);
		expect(imports).toContain(component('Button/Button.js'));
		expect(imports).toContain(propsId(component('Button/Button.js')));
		expect(imports).toContain(component('Placeholder/Placeholder.json'));
		// Section/component data references the imports
		expect(code).toMatch(/"module": __rsg_\d+,/);
		expect(code).toMatch(
			/"props": \(__rsg_\d+\.default !== undefined \? __rsg_\d+\.default : __rsg_\d+\)/
		);
	});

	it('should list component files and the directory to watch', () => {
		const { componentFiles, contextDirs, watchFiles } = generateStyleguideModule(config);
		expect(componentFiles).toEqual(
			expect.arrayContaining([component('Button/Button.js'), component('Price/Price.js')])
		);
		expect(componentFiles).not.toContain(component('Label/index.js'));
		expect(contextDirs).toEqual([path.join(testDir, 'components')]);
		expect(watchFiles).toEqual([]);
	});

	it('should use contextDependencies as directories to watch', () => {
		const { contextDirs } = generateStyleguideModule({
			...config,
			contextDependencies: ['/pizza', '/burger'],
		});
		expect(contextDirs).toEqual(['/pizza', '/burger']);
	});

	it('should pass only the client config options', () => {
		const { code } = generateStyleguideModule(config);
		const styleguide = findDeclaration(
			code.replace('export default', 'const styleguide ='),
			'styleguide'
		);
		const configKeys = styleguide.properties
			.find((prop: any) => prop.key.value === 'config')
			.value.properties.map((prop: any) => prop.key.value);
		expect(configKeys.sort()).toEqual([...CLIENT_CONFIG_OPTIONS].sort());
		expect(code).not.toMatch('"configDir"');
	});

	it('should import theme and styles files and watch them', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-theme-'));
		const theme = path.join(dir, 'theme.js');
		const styles = path.join(dir, 'styles.js');
		fs.writeFileSync(theme, 'export default {}');
		fs.writeFileSync(styles, 'export default {}');
		try {
			const { code, watchFiles } = generateStyleguideModule({ ...config, theme, styles });
			expect(importsOf(code)).toEqual(expect.arrayContaining([theme, styles]));
			expect(code).toMatch(/"theme": \(__rsg_\d+\.default !== undefined/);
			expect(watchFiles).toEqual([styles, theme]);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	// The schema resolves a relative `mdxComponents` path against the config file, so the
	// import the browser module gets is absolute and the watched file is a real path (C2)
	it('should import an mdxComponents module path given relative to the config', () => {
		const relative = 'components/Button/Button.js';
		const absolute = path.join(testDir, relative);
		const withComponents = getConfig({
			components: 'components/**/[A-Z]*.js',
			mdxComponents: { Callout: relative },
		});
		const { code, watchFiles } = generateStyleguideModule(withComponents);

		expect(importsOf(code)).toEqual(expect.arrayContaining([absolute]));
		expect(watchFiles).toEqual([absolute]);
		expect(code).toMatch(/"Callout": \(__rsg_\d+\.default !== undefined/);
	});

	it('should serialize an mdxComponents component value without importing anything', () => {
		const withComponents = {
			...config,
			mdxComponents: { Callout: function Callout() {} },
		} as unknown as Rsg.SanitizedStyleguidistConfig;
		const { code, watchFiles } = generateStyleguideModule(withComponents);

		expect(watchFiles).toEqual([]);
		expect(code).toMatch('function Callout()');
	});

	it('should show the welcome screen when nothing matches', () => {
		// The welcome screen only lists array patterns (getComponentPatternsFromSections)
		const emptyConfig = getConfig({ components: ['nothing/**/*.js'] });
		const { code, componentFiles, contextDirs } = generateStyleguideModule(emptyConfig);
		expect(componentFiles).toEqual([]);
		expect(contextDirs).toEqual([]);
		expect(code).toMatch('"welcomeScreen": true');
		expect(code).toMatch('"patterns": [\n\t\t"nothing/**/*.js"\n\t]');
	});
});

describe('generatePropsModule', () => {
	const file = component('Button/Button.js');
	const source = fs.readFileSync(file, 'utf8');
	// The generated module always has props as a (sorted) array
	const propNames = (docs: Rsg.PropsObject) =>
		(docs.props as Rsg.PropDescriptor[]).map((prop) => prop.name);

	it('should generate an ES module with the component documentation', () => {
		const { code, docs } = generatePropsModule(config, file, source);
		expect(() => parseModule(code)).not.toThrow();
		expect(code).toMatch('\nexport default {');
		expect(docs.displayName).toBe('Button');
		// Descriptions go through remark, which ends them with a newline
		expect(docs.description).toMatch(/^The only true button\.\s*$/);
		expect(propNames(docs)).toEqual(['children', 'color', 'size']);
	});

	it('should reference the examples module', () => {
		const { code, docs } = generatePropsModule(config, file, source);
		expect(docs.examples).toEqual({
			__rsgImport: expect.stringMatching(
				/^virtual:rsg-examples\?file=.*Button\/Readme\.md&displayName=Button/
			),
			__rsgDefault: true,
		});
		expect(importsOf(code)).toEqual([
			`virtual:rsg-examples?file=${toPosix(component('Button/Readme.md'))}&displayName=Button&component=${toPosix(file)}&rsg`,
		]);
	});

	it('should use the default example when a component has no examples file', () => {
		const randomButton = component('RandomButton/RandomButton.js');
		const { docs } = generatePropsModule(
			config,
			randomButton,
			fs.readFileSync(randomButton, 'utf8')
		);
		expect(docs.examples?.__rsgImport).toMatch(
			/^virtual:rsg-examples\?file=.*DefaultExample\.md&.*&default=1&rsg$/
		);
	});

	it('should have no examples without an examples file nor default example', () => {
		const randomButton = component('RandomButton/RandomButton.js');
		const { docs } = generatePropsModule(
			{ ...config, defaultExample: false },
			randomButton,
			fs.readFileSync(randomButton, 'utf8')
		);
		expect(docs.examples).toBeNull();
	});

	it('should apply the sortProps and updateDocs options', () => {
		const sortProps = vi.fn((props: Rsg.PropDescriptor[]) => [...props].reverse());
		const updateDocs = vi.fn((docs: Rsg.PropsObject) => ({ ...docs, pizza: true }));
		const { docs } = generatePropsModule({ ...config, sortProps, updateDocs } as any, file, source);
		expect(sortProps).toHaveBeenCalledTimes(1);
		expect(updateDocs).toHaveBeenCalledWith(
			expect.objectContaining({ displayName: 'Button' }),
			file
		);
		expect(propNames(docs)).toEqual(['size', 'color', 'children']);
		expect(docs).toMatchObject({ pizza: true });
	});

	it('should use a custom propsParser', () => {
		const propsParser = vi.fn(() => ({ displayName: 'Pizza', description: 'Yum' }));
		const { docs } = generatePropsModule({ ...config, propsParser } as any, file, source);
		expect(propsParser).toHaveBeenCalledWith(file, source, config.resolver, expect.any(Array));
		expect(docs).toMatchObject({
			displayName: 'Pizza',
			description: expect.stringMatching(/^Yum\s*$/),
			props: [],
		});
	});

	it('should warn about files without a component and fall back to the file name', () => {
		const warn = vi.fn();
		logger.once('warn', warn);
		const { docs } = generatePropsModule(
			config,
			component('Price/Pizza.js'),
			'export const x = 1;'
		);
		expect(warn).toHaveBeenCalledWith(expect.stringMatching('doesn’t export a component'));
		expect(docs.displayName).toBe('Pizza');
	});
});

describe('resolveExampleImport', () => {
	const markdown = component('Button/Readme.md');

	it('should resolve relative paths against the Markdown file', () => {
		expect(resolveExampleImport('./Button', markdown)).toBe(component('Button/Button'));
		expect(resolveExampleImport('../Label/index.js', markdown)).toBe(component('Label/index.js'));
	});

	it('should pass other requests through', () => {
		expect(resolveExampleImport('react', markdown)).toBe('react');
		expect(resolveExampleImport('lodash/map', markdown)).toBe('lodash/map');
		expect(resolveExampleImport('~/components', markdown)).toBe('~/components');
		expect(resolveExampleImport('/abs/path.js', markdown)).toBe('/abs/path.js');
	});
});

describe('generateExamplesModule', () => {
	const file = component('Button/Readme.md');
	const options: Rsg.ExamplesModuleOptions = {
		file,
		displayName: 'Button',
		componentPath: component('Button/Button.js'),
	};
	const source = fs.readFileSync(file, 'utf8');

	const requireMapKeys = (code: string): string[] =>
		findDeclaration(code, 'requireMap').properties.map((prop: any) => prop.key.value);
	const header = (code: string): string =>
		findDeclaration(code, 'evalInContext').arguments[1].value;

	it('should generate an ES module exporting the examples', () => {
		const { code } = generateExamplesModule(config, options, source);
		const ast = parseModule(code);
		expect(ast.body.at(-1)?.type).toBe('ExportDefaultDeclaration');
		expect(code).toMatch(
			/import requireInRuntimeBase from ".*\/loaders\/utils\/client\/requireInRuntime\.[jt]s";/
		);
		expect(code).toMatch(
			/import evalInContextBase from ".*\/loaders\/utils\/client\/evalInContext\.[jt]s";/
		);
		expect(code).toMatch('const requireInRuntime = requireInRuntimeBase.bind(null, requireMap);');
	});

	it('should split Markdown and code examples', () => {
		const { code } = generateExamplesModule(config, options, source);
		expect(code).toMatch('"type": "markdown"');
		expect(code).toMatch('"type": "code"');
		expect(code).toMatch('"content": "<Button>Push Me</Button>"');
		// Only code examples get an evalInContext function (an identifier, not a serialized function)
		expect(code).toMatch('"evalInContext": evalInContext');
	});

	it('should import React and the current component implicitly', () => {
		const { code } = generateExamplesModule(config, options, source);
		expect(importsOf(code)).toEqual(
			expect.arrayContaining(['react', component('Button/Button.js')])
		);
		expect(header(code)).toBe(
			[
				'const React$0 = require("react");',
				'const React = React$0.default || React$0["React"] || React$0;',
				`const Button$0 = require(${JSON.stringify(component('Button/Button.js'))});`,
				'const Button = Button$0.default || Button$0["Button"] || Button$0;',
			].join('\n')
		);
	});

	it('should key the require map by the request as written in the examples', () => {
		const markdown = [
			'    import map from "lodash/map";',
			'    import Label from "../Label";',
			'    const Price = require("./Price.js");',
			'    <Button />',
		].join('\n');
		const { code } = generateExamplesModule(config, options, markdown);
		expect(requireMapKeys(code)).toEqual([
			'lodash/map',
			'../Label',
			'./Price.js',
			'react',
			component('Button/Button.js'),
		]);
		// Relative requests are imported relative to the Markdown file
		expect(importsOf(code)).toEqual(
			expect.arrayContaining(['lodash/map', component('Label'), component('Button/Price.js')])
		);
	});

	it('should make context modules available in examples', () => {
		const { code } = generateExamplesModule(
			{ ...config, context: { map: 'lodash/map', 'Foo.Bar': 'foo-bar' } },
			options,
			source
		);
		expect(importsOf(code)).toEqual(expect.arrayContaining(['lodash/map', 'foo-bar']));
		expect(requireMapKeys(code)).toEqual(expect.arrayContaining(['lodash/map', 'foo-bar']));
		expect(header(code)).toMatch('const map$0 = require("lodash/map");');
		// Names that aren’t valid identifiers are sanitized
		expect(header(code)).toMatch('const FooBar$0 = require("foo-bar");');
	});

	it('should expand the component placeholder of the default example', () => {
		const { code } = generateExamplesModule(
			config,
			{ ...options, shouldShowDefaultExample: true },
			'    <__COMPONENT__>Default</__COMPONENT__>'
		);
		expect(code).toMatch('"content": "<Button>Default</Button>"');
		expect(code).not.toMatch('__COMPONENT__');
	});

	it('should not expand the placeholder of a regular examples file', () => {
		const { code } = generateExamplesModule(config, options, '    <__COMPONENT__ />');
		expect(code).toMatch('__COMPONENT__');
	});

	it('should work without a component (section content)', () => {
		const { code } = generateExamplesModule(config, { file }, '# Hello\n\n    <Button />');
		expect(importsOf(code)).toEqual(['react']);
		expect(header(code)).not.toMatch('Button');
	});

	it('should call updateExample for each code example', () => {
		const updateExample = vi.fn((props: any) => ({
			...props,
			content: `/* updated */ ${props.content}`,
		}));
		const { code } = generateExamplesModule({ ...config, updateExample }, options, source);
		expect(updateExample).toHaveBeenCalledWith(
			expect.objectContaining({ content: '<Button>Push Me</Button>' }),
			file
		);
		expect(code).toMatch('"content": "/* updated */ <Button>Push Me</Button>"');
	});
});

// Coverage restored from the deleted webpack loader specs (verified by mutation:
// removing the code under test fails these, see the migration review)
describe('config wiring lost with the webpack loaders', () => {
	const repoRoot = path.resolve(import.meta.dirname, '../../..');
	const fixturesConfig = () =>
		getConfig({
			components: path.join(repoRoot, 'test/components/**/[A-Z]*.js'),
			logger: { info() {}, warn() {}, debug() {} },
		});

	it('skipComponentsWithoutExample removes components without an examples file', () => {
		const withAll = generateStyleguideModule(fixturesConfig());
		expect(withAll.code).toMatch('virtual:rsg-props?');
		expect(withAll.code).toMatch(/virtual:rsg-props\?file=[^"]*RandomButton\.js/);

		const filtered = generateStyleguideModule({
			...fixturesConfig(),
			skipComponentsWithoutExample: true,
		});
		// Button has a Readme.md, RandomButton has no examples file
		expect(filtered.code).toMatch(/virtual:rsg-props\?file=[^"]*Button\.js/);
		expect(filtered.code).not.toMatch(/virtual:rsg-props\?file=[^"]*RandomButton\.js/);
	});

	it('warns when a component file cannot be parsed', () => {
		const warn = vi.fn();
		logger.once('warn', warn);
		const file = path.join(repoRoot, 'test/components/Button/Button.js');
		const { docs } = generatePropsModule(fixturesConfig(), file, '# Not JavaScript {');
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^Cannot parse /));
		// The style guide still renders, with the file name as a fallback
		expect(docs.displayName).toBe('Button');
	});
});
