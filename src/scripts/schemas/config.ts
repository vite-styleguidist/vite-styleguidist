// If you want to access any of these options in React, don’t forget to update CLIENT_CONFIG_OPTIONS array
// in src/vite/modules/styleguide.ts

import path from 'node:path';
import glogg from 'glogg';
import startCase from 'lodash/startCase.js';
import kleur from 'kleur';
import { builtinResolvers, defaultHandlers } from 'react-docgen';
import type { Handler, Resolver } from 'react-docgen';
import { DEFAULT_COMPILER_CONFIG } from '../../client/utils/compileCode.js';
import { COLOR_SCHEMES } from '../../client/styles/colorSchemes.js';
import FindAnnotatedExportsResolver from '../../loaders/utils/FindAnnotatedExportsResolver.js';
import getUserPackageJson from '../utils/getUserPackageJson.js';
import fileExistsCaseInsensitive from '../utils/findFileCaseInsensitive.js';
import dirname from '../utils/dirname.js';
import StyleguidistError from '../utils/error.js';
import * as consts from '../consts.js';
import type * as Rsg from '../../typings/index.js';

const { ChainResolver, FindAnnotatedDefinitionsResolver, FindExportedDefinitionsResolver } =
	builtinResolvers;

const EXTENSIONS = 'js,jsx,ts,tsx';
const DEFAULT_COMPONENTS_PATTERN =
	// HACK: on windows, the case insensitivity makes each component appear twice
	// to avoid this issue, the case management is removed on win32
	// it virtually changes nothing
	process.platform === 'win32'
		? /* istanbul ignore next: no windows on our test plan */ `src/components/**/*.{${EXTENSIONS}}`
		: `src/@(components|Components)/**/*.{${EXTENSIONS}}`;

const logger = glogg('rsg');

type NestedThemeValue = Record<string, unknown> | string;

export type StyleguidistConfigKey = keyof Rsg.SanitizedStyleguidistConfig;

export interface ConfigSchemaOptions<T> {
	process?(value: any, config: T, rootDir: string): any;
	default?: any;
	required?: boolean | ((config?: T) => string | boolean);
	deprecated?: string;
	removed?: string;
	type?: string | string[];
	example?: any;
}

const removedWebpackOption = (replacement: string) =>
	`Styleguidist now uses Vite instead of webpack. Use the "${replacement}" option instead:\n${consts.DOCS_VITE}`;

const configSchema: Record<StyleguidistConfigKey, ConfigSchemaOptions<Rsg.StyleguidistConfig>> = {
	assetsDir: {
		type: ['array', 'existing directory path'],
		example: 'assets',
	},
	tocMode: {
		type: 'string',
		default: 'expand',
	},
	colorScheme: {
		type: 'string',
		default: 'system',
		example: 'dark',
		process: (value?: string): string | undefined => {
			// Runs before the default is applied, so undefined must pass through
			if (value !== undefined && !COLOR_SCHEMES.includes(value as Rsg.ColorScheme)) {
				throw new StyleguidistError(
					`${kleur.bold('colorScheme')} config option must be one of ${COLOR_SCHEMES.map((scheme) => `"${scheme}"`).join(', ')}, got ${JSON.stringify(value)}.`,
					'colorScheme'
				);
			}
			return value;
		},
	},
	compilerConfig: {
		type: 'object',
		// Options for sucrase’s transform(), used to compile examples in the browser
		// (see src/client/utils/compileCode.ts for the rationale of each default)
		default: DEFAULT_COMPILER_CONFIG,
	},
	// `components` is a shortcut for { sections: [{ components }] },
	// see `sections` below
	components: {
		type: ['string', 'function', 'array'],
		example: 'components/**/[A-Z]*.js',
	},
	configDir: {
		process: (value: string, config: Rsg.StyleguidistConfig, rootDir: string): string => rootDir,
	},
	context: {
		type: 'object',
		default: {},
		example: {
			map: 'lodash/map',
		},
	},
	contextDependencies: {
		type: 'array',
	},
	configureServer: {
		type: 'function',
	},
	dangerouslyUpdateViteConfig: {
		type: 'function',
	},
	dangerouslyUpdateWebpackConfig: {
		type: 'function',
		removed: removedWebpackOption('dangerouslyUpdateViteConfig'),
	},
	defaultExample: {
		type: ['boolean', 'existing file path'],
		default: false,
		process: (val: boolean | string): string | boolean =>
			val === true
				? path.resolve(dirname(import.meta.url), '../../../templates/DefaultExample.md')
				: val,
	},
	exampleMode: {
		type: 'string',
		process: (value: string, config: Rsg.StyleguidistConfig): string => {
			return config.showCode === undefined ? value : config.showCode ? 'expand' : 'collapse';
		},
		default: 'collapse',
	},
	getComponentPathLine: {
		type: 'function',
		default: (componentPath: string): string => componentPath,
	},
	getExampleFilename: {
		type: 'function',
		default: (componentPath: string): string | boolean => {
			const files = [
				path.join(path.dirname(componentPath), 'Readme.md'),
				// ComponentName.md
				componentPath.replace(path.extname(componentPath), '.md'),
				// FolderName.md when component definition file is index.js
				path.join(path.dirname(componentPath), path.basename(path.dirname(componentPath)) + '.md'),
			];
			for (const file of files) {
				const existingFile = fileExistsCaseInsensitive(file);
				if (existingFile) {
					return existingFile;
				}
			}
			return false;
		},
	},
	handlers: {
		type: 'function',
		// react-docgen’s default handlers already include displayNameHandler; when it
		// can’t infer a name, Styleguidist falls back to the file name (see getProps).
		default: (): Handler[] => defaultHandlers,
	},
	ignore: {
		type: 'array',
		default: [
			'**/__tests__/**',
			`**/*.test.{${EXTENSIONS}}`,
			`**/*.spec.{${EXTENSIONS}}`,
			'**/*.d.ts',
		],
	},
	editorConfig: {
		process: (value?: unknown): void => {
			if (value) {
				throw new StyleguidistError(
					`${kleur.bold(
						'editorConfig'
					)} config option was removed. Use “theme” option to change syntax highlighting.`
				);
			}
		},
	},
	logger: {
		type: 'object',
	},
	// docs.json + llms.txt + llms-full.txt next to index.html (see src/vite/machineReadable.ts).
	// On by default: a deployed style guide is public already, and the files are what AI
	// tools and the planned MCP server read.
	machineReadable: {
		type: 'boolean',
		default: true,
	},
	minimize: {
		type: 'boolean',
		default: true,
	},
	moduleAliases: {
		type: 'object',
		default: {},
	},
	mountPointId: {
		type: 'string',
		default: 'rsg-root',
	},
	pagePerSection: {
		type: 'boolean',
		default: false,
	},
	previewDelay: {
		type: 'number',
		default: 500,
	},
	printBuildInstructions: {
		type: 'function',
	},
	printServerInstructions: {
		type: 'function',
	},
	propsParser: {
		type: 'function',
	},
	require: {
		type: 'array',
		default: [],
		example: ['core-js/stable', 'path/to/styles.css'],
	},
	resolver: {
		// react-docgen resolvers are either functions or class instances with a `resolve()` method
		type: ['function', 'class instance'],
		// Find all exported components plus anything marked with a `@component` annotation
		// (react-docgen’s own annotated resolver ignores styled-components tagged templates)
		default: new ChainResolver(
			[
				new FindAnnotatedExportsResolver(),
				new FindAnnotatedDefinitionsResolver(),
				new FindExportedDefinitionsResolver(),
			],
			{ chainingLogic: ChainResolver.Logic.ALL }
		) as Resolver,
	},
	ribbon: {
		type: 'object',
		example: {
			url: 'http://example.com/',
			text: 'Fork me on GitHub',
		},
	},
	sections: {
		type: 'array',
		default: [],
		process: (val: Rsg.ConfigSection[], config: Rsg.StyleguidistConfig): Rsg.ConfigSection[] => {
			if (!val) {
				// If root `components` isn't empty, make it a first section
				// If `components` and `sections` weren’t specified, use default pattern
				const components = config.components || DEFAULT_COMPONENTS_PATTERN;
				return [
					{
						components,
					},
				];
			}
			return val;
		},
		example: [
			{
				name: 'Documentation',
				content: 'Readme.md',
			},
			{
				name: 'Components',
				components: './lib/components/**/[A-Z]*.js',
			},
		],
	},
	serverHost: {
		type: 'string',
		default: '0.0.0.0',
	},
	serverPort: {
		type: 'number',
		default: parseInt(process.env.NODE_PORT as string) || 6060,
	},
	showCode: {
		type: 'boolean',
		default: false,
		deprecated: 'Use exampleMode option instead',
	},
	showUsage: {
		type: 'boolean',
		default: false,
		deprecated: 'Use usageMode option instead',
	},
	showSidebar: {
		type: 'boolean',
		default: true,
	},
	skipComponentsWithoutExample: {
		type: 'boolean',
		default: false,
	},
	sortProps: {
		type: 'function',
	},
	styleguideComponents: {
		type: 'object',
	},
	styleguideDir: {
		type: 'directory path',
		default: 'styleguide',
	},
	styles: {
		type: ['object', 'existing file path', 'function'],
		default: {},
		example: {
			Logo: {
				logo: {
					fontStyle: 'italic',
				},
			},
		},
		process: (val: NestedThemeValue, config: unknown, configDir: string): NestedThemeValue => {
			return typeof val === 'string' ? path.resolve(configDir, val) : val;
		},
	},
	template: {
		type: ['object', 'function'],
		default: {},
		process: (val: any) => {
			if (typeof val === 'string') {
				throw new StyleguidistError(
					`${kleur.bold(
						'template'
					)} config option format has been changed, you need to update your config.`,
					'template'
				);
			}
			return val;
		},
	},
	theme: {
		type: ['object', 'existing file path'],
		default: {},
		example: {
			link: 'firebrick',
			linkHover: 'salmon',
		},
		process: (val: NestedThemeValue, config: unknown, configDir: string): NestedThemeValue =>
			typeof val === 'string' ? path.resolve(configDir, val) : val,
	},
	title: {
		type: 'string',
		process: (val?: string): string => {
			if (val) {
				return val;
			}
			const name = getUserPackageJson().name || '';
			return `${startCase(name)} Style Guide`;
		},
		example: 'My Style Guide',
	},
	updateDocs: {
		type: 'function',
	},
	updateExample: {
		type: 'function',
		default: (props: { lang: string }): { lang: string } => {
			if (props.lang === 'example') {
				props.lang = 'js';
				logger.warn(
					'"example" code block language is deprecated. Use "js", "jsx" or "javascript" instead:\n' +
						consts.DOCS_DOCUMENTING
				);
			}
			return props;
		},
	},
	updateWebpackConfig: {
		type: 'function',
		removed: removedWebpackOption('viteConfig'),
	},
	usageMode: {
		type: 'string',
		process: (value: string, config: Rsg.StyleguidistConfig) => {
			return config.showUsage === undefined ? value : config.showUsage ? 'expand' : 'collapse';
		},
		default: 'collapse',
	},
	verbose: {
		type: 'boolean',
		default: false,
	},
	version: {
		type: 'string',
	},
	viteConfig: {
		// When omitted, Styleguidist looks for vite.config.{js,mjs,ts,cjs,mts,cts}
		// next to the style guide config (see src/scripts/make-vite-config.ts).
		type: ['object', 'function'],
		example: {
			resolve: {
				alias: {
					components: '/absolute/path/to/components',
				},
			},
		},
	},
	webpackConfig: {
		type: ['object', 'function'],
		removed: removedWebpackOption('viteConfig'),
	},
};

export default configSchema;
