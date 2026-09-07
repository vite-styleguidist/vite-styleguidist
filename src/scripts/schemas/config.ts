// If you want to access any of these options in React, don’t forget to update CLIENT_CONFIG_OPTIONS array
// in src/vite/modules/styleguide.ts

import path from 'node:path';
import glogg from 'glogg';
import mapValues from 'lodash/mapValues.js';
import startCase from 'lodash/startCase.js';
import kleur from 'kleur';
import { builtinResolvers, defaultHandlers } from 'react-docgen';
import type { Handler, Resolver } from 'react-docgen';
import { DEFAULT_COMPILER_CONFIG } from '../../client/utils/compileCode.js';
import { COLOR_SCHEMES } from '../../client/styles/colorSchemes.js';
import { SCROLL_SYNC_MODES } from '../../client/consts.js';
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

/**
 * Default `getExampleFilename`: the examples file of a component, `.md` before `.mdx` for
 * the same base name so that a style guide that has both keeps rendering the Markdown one.
 *
 * The *extension of the returned path selects the pipeline*: `.mdx` goes through
 * @mdx-js/mdx, anything else through the Markdown one. That is what makes a custom
 * `getExampleFilename` work with MDX without a new config option.
 *
 * Exported so the discovery code can tell a file it found itself (warn and skip when
 * @mdx-js/mdx is missing) from one the user named explicitly (a hard error).
 */
export function defaultGetExampleFilename(componentPath: string): string | boolean {
	const dir = path.dirname(componentPath);
	const extension = path.extname(componentPath);
	const files = [
		path.join(dir, 'Readme.md'),
		path.join(dir, 'Readme.mdx'),
		// ComponentName.md
		componentPath.replace(extension, '.md'),
		componentPath.replace(extension, '.mdx'),
		// FolderName.md when component definition file is index.js
		path.join(dir, path.basename(dir) + '.md'),
		path.join(dir, path.basename(dir) + '.mdx'),
	];
	for (const file of files) {
		const existingFile = fileExistsCaseInsensitive(file);
		if (existingFile) {
			return existingFile;
		}
	}
	return false;
}

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
	// Named after Vite’s own `envPrefix` because it selects variables the same way (a list
	// of name prefixes) and because that is the word people already know. It is a separate
	// option, not a copy: Vite’s governs `import.meta.env`, this one governs the
	// `process.env.NAME` replacements, which is what a style guide migrating from webpack
	// (and from `REACT_APP_`) actually has in its components. See getEnvDefine() in
	// src/scripts/make-vite-config.ts.
	envPrefix: {
		type: ['string', 'array'],
		default: [],
		example: ['REACT_APP_'],
		process: (value?: unknown): unknown => {
			// Runs before the default is applied, so undefined must pass through; anything that
			// is neither a string nor an array is left alone for the schema’s own type error.
			if (value === undefined || (!Array.isArray(value) && typeof value !== 'string')) {
				return value;
			}
			const prefixes = typeof value === 'string' ? [value] : value;
			prefixes.forEach((prefix) => {
				// An empty (or blank) prefix matches every variable name, which would inline the
				// whole environment of the build machine — tokens included — into a public bundle.
				// Vite rejects it in its own `envPrefix` for the same reason.
				if (typeof prefix !== 'string' || prefix.trim() === '') {
					throw new StyleguidistError(
						`${kleur.bold(
							'envPrefix'
						)} config option must contain non-empty strings, got ${JSON.stringify(
							prefix
						)}. An empty prefix would expose every environment variable of the machine that builds the style guide.`,
						'envPrefix'
					);
				}
			});
			return prefixes;
		},
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
		default: defaultGetExampleFilename,
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
	mdx: {
		type: 'object',
		default: {},
		example: { remarkPlugins: [] },
	},
	mdxComponents: {
		type: 'object',
		default: {},
		example: { Callout: 'src/docs/Callout' },
		// String values are module paths the browser bundle imports (see
		// src/vite/modules/styleguide.ts), and the virtual module they end up in has no
		// directory of its own, so a relative specifier would be resolved against the
		// package instead of the project. Resolve them here, against the config file’s
		// folder, exactly as `styles` and `theme` resolve their path form — which also
		// makes the watched file absolute. Component values are passed through: a config
		// that is itself bundled can carry a real component.
		process: (
			val: Record<string, unknown> | undefined,
			config: unknown,
			configDir: string
		): Record<string, unknown> | undefined =>
			val &&
			mapValues(val, (value) =>
				typeof value === 'string' ? path.resolve(configDir, value) : value
			),
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
	pageNav: {
		// An object is accepted by the schema but rejected by `process()` below, on purpose:
		// the option is a boolean today and the object form (`{ minLevel, maxLevel, title }`)
		// is the way it is meant to grow (ADR 0016). Accepting `{}` silently now would let a
		// config that means something specific do nothing, and *rejecting* it here is what
		// keeps the future addition non-breaking: nobody can already have one in the wild.
		type: ['boolean', 'object'],
		default: false,
		example: true,
		process: (value?: boolean | Record<string, unknown>): boolean | undefined => {
			// Runs before the default is applied, so undefined must pass through
			if (value !== undefined && typeof value !== 'boolean') {
				throw new StyleguidistError(
					`${kleur.bold('pageNav')} config option must be a boolean, got ${JSON.stringify(
						value
					)}. Per-page options (levels, title) are not implemented yet.`,
					'pageNav'
				);
			}
			return value;
		},
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
	scrollSync: {
		type: ['boolean', 'string'],
		default: 'selection',
		example: 'hash',
		process: (value?: boolean | string): boolean | string | undefined => {
			// Runs before the default is applied, so undefined must pass through. `true` is
			// rejected rather than aliased to 'selection': the option has two “on” modes and
			// guessing which one a boolean meant would be a coin toss.
			if (value !== undefined && !SCROLL_SYNC_MODES.includes(value as Rsg.ScrollSync)) {
				throw new StyleguidistError(
					`${kleur.bold('scrollSync')} config option must be one of ${SCROLL_SYNC_MODES.map(
						(mode) => JSON.stringify(mode)
					).join(', ')}, got ${JSON.stringify(value)}.`,
					'scrollSync'
				);
			}
			return value;
		},
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
