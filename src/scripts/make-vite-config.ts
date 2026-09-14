import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadConfigFromFile, loadEnv, searchForWorkspaceRoot } from 'vite';
import type { Alias, InlineConfig, PluginOption, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import escapeRegExp from 'lodash/escapeRegExp.js';
import forEach from 'lodash/forEach.js';
import isFunction from 'lodash/isFunction.js';
import uniq from 'lodash/uniq.js';
import createLogger from 'glogg';
import dirname from './utils/dirname.js';
import getComponentFilesFromSections from '../loaders/utils/getComponentFilesFromSections.js';
import getAllContentFiles from '../loaders/utils/getAllContentFiles.js';
import mergeViteConfig, { hasReactPlugin } from '../vite/mergeViteConfig.js';
import styleguidistPlugin from '../vite/plugin.js';
import jsxInJs, { scanGlobJsxInJs } from '../vite/jsxInJs.js';
import absolutePaths from '../vite/absolutePaths.js';
import deepImports, { isLegacyPackageInstalled } from '../vite/deepImports.js';
import { ENTRY_ID, toPosix } from '../vite/ids.js';
import type * as Rsg from '../typings/index.js';

const logger = createLogger('rsg');

const RENDERER_REGEXP = /Renderer$/;

// This file lives in lib/scripts (or src/scripts), the browser code in lib/client (or src/client)
const CLIENT_DIR = path.resolve(dirname(import.meta.url), '../client');
const PACKAGE_DIR = path.resolve(dirname(import.meta.url), '../..');

/**
 * Absolute path of a file of the browser code: `.ts` when running from sources
 * (tests), `.js` in the published package.
 */
const findClientFile = (name: string): string => {
	for (const ext of ['.js', '.ts']) {
		const candidate = path.join(CLIENT_DIR, `${name}${ext}`);
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	return path.join(CLIENT_DIR, `${name}.js`);
};

const findClientEntry = (): string => findClientFile('index');

const isBareSpecifier = (request: string) =>
	!request.startsWith('.') &&
	!request.startsWith('/') &&
	!/^[a-zA-Z]:[\\/]/.test(request) &&
	!request.includes(':');

/**
 * Collect bare module specifiers imported from examples files (`import x from 'lodash'`),
 * so Vite can pre-bundle them at startup instead of discovering them lazily (which
 * causes a page reload the first time an example is rendered).
 *
 * The regex matches both forms an `.mdx` file can carry: the imports of its fences and the
 * page's own ESM imports.
 */
export function findExampleDependencies(exampleFiles: string[], aliases: string[] = []): string[] {
	const deps: string[] = [];
	// Specifiers starting with a user alias point at project files, which must not be
	// pre-bundled (they need hot module replacement, not dependency optimization)
	const isAliased = (request: string) =>
		aliases.some((alias) => request === alias || request.startsWith(alias + '/'));
	// `import 'x'` (no `from`) must be matched at the start of a line, which in Markdown
	// examples is usually indented (indented code blocks)
	const IMPORT_REGEXP = /(?:\bfrom\s*|\brequire\(\s*|^\s*import\s*)['"]([^'"\n]+)['"]/gm;
	exampleFiles.forEach((file) => {
		let source = '';
		try {
			source = fs.readFileSync(file, 'utf8');
		} catch {
			return;
		}
		let match: RegExpExecArray | null;
		while ((match = IMPORT_REGEXP.exec(source))) {
			if (isBareSpecifier(match[1]) && !isAliased(match[1])) {
				deps.push(match[1]);
			}
		}
	});
	return uniq(deps);
}

/** Where the `react-dom` a root flavour was chosen from was found. */
export type ReactDomSource = 'project' | 'package';

export interface ReactRoot {
	/** Which of src/client/utils/reactRoot.{modern,legacy}.ts the client will import. */
	flavor: 'modern' | 'legacy';
	/** Version of the `react-dom` the flavour was chosen from, undefined when there is none. */
	version?: string;
	/** Where that `react-dom` was found, undefined when there is none. */
	source?: ReactDomSource;
}

/**
 * The `react-dom` that will end up in the bundle, resolved the way Vite resolves it.
 *
 * Two steps, in Vite’s own order: from the project first (`config.configDir`), then from
 * this package’s own directory. `resolve.dedupe` (see the Vite config below) pins React to
 * the copy it finds from the project root, and when the project root has none Vite keeps
 * the one it resolved from the importer instead — our client code, which lives inside this
 * package. A config directory outside any project tree (a temporary folder, as
 * test/e2e/config-restart.spec.ts uses, or a config kept next to a design system the
 * components are not part of) therefore resolves nothing in step one and this package’s own
 * `react-dom` in step two, which is exactly the copy the bundle gets.
 *
 * `react-dom/package.json` resolves on every supported version: 16 and 17 have no `exports`
 * map, 18 and 19 export it.
 */
function resolveReactDom(
	configDir: string
): { version: string; source: ReactDomSource } | undefined {
	const anchors: [ReactDomSource, string][] = [
		['project', path.join(configDir, 'package.json')],
		// PACKAGE_DIR is this package’s own root, the anchor findClientFile() walks from
		['package', path.join(PACKAGE_DIR, 'package.json')],
	];
	for (const [source, anchor] of anchors) {
		try {
			const { version } = createRequire(anchor)('react-dom/package.json') as { version: string };
			return { version, source };
		} catch {
			// Not resolvable from there, try the next anchor
		}
	}
	return undefined;
}

/**
 * Which React root API the `react-dom` the bundle will use supports: `modern`
 * (`createRoot()`, React 18 and newer) or `legacy` (`ReactDOM.render()`, React 16.14 and 17),
 * and which `react-dom` that was (the doctor reports both, see checkEnvironment.ts).
 *
 * The two implementations live in src/client/utils/reactRoot.{modern,legacy}.ts and the
 * client imports whichever one the `rsg-react-root` alias points at (see reactRoot.ts for
 * why the choice cannot be made at runtime). It has to agree with the React that is really
 * bundled, so the copy is looked up exactly as Vite looks it up (see resolveReactDom()
 * above): mounting with `createRoot()` against a bundled React 16 throws inside the mount
 * and the whole style guide stays blank.
 *
 * Resolvable nowhere (Preact-only projects, unusual layouts) falls back to `modern`, the
 * only behaviour before React 16 support; `preact/compat` provides both APIs anyway.
 */
export function resolveReactRoot(configDir: string): ReactRoot {
	const reactDom = resolveReactDom(configDir);
	if (!reactDom) {
		logger.debug(
			'Cannot resolve react-dom from the project or from vite-styleguidist, mounting with createRoot()'
		);
		return { flavor: 'modern' };
	}
	const { version, source } = reactDom;
	// A major of 0 is React’s experimental channel (`0.0.0-experimental-<hash>-<date>`), which
	// tracks the newest React and no longer exports `render()`; an unparseable version is a
	// custom build we know nothing about. Both are safer on the modern branch: `createRoot()`
	// has existed since 18 and is the only API the experimental builds still ship.
	const major = parseInt(version, 10);
	const flavor = major >= 18 || major === 0 || Number.isNaN(major) ? 'modern' : 'legacy';
	logger.debug(
		`Found react-dom ${version} in ${
			source === 'project' ? 'the project' : 'vite-styleguidist'
		}, mounting with ${flavor === 'modern' ? 'createRoot()' : 'ReactDOM.render()'}`
	);
	return { flavor, version, source };
}

/** Shorthand for the flavour alone, which is all the alias below needs. */
export function getReactRootFlavor(configDir: string): 'modern' | 'legacy' {
	return resolveReactRoot(configDir).flavor;
}

/**
 * Environment variables Styleguidist and Vite define themselves: `NODE_ENV` is Vite’s
 * (it is what tells React which build to use) and `STYLEGUIDIST_ENV` is set below. A
 * prefix wide enough to match one of them must not be able to overwrite it.
 */
const RESERVED_ENV_NAMES = ['NODE_ENV', 'STYLEGUIDIST_ENV'];

/**
 * A variable name that can be used in a `define` key: `process.env.<name>` has to stay a
 * valid member expression, and the process environment can hold names that aren’t
 * (`npm_config_//registry.npmjs.org/:_authToken`, anything `export`ed by a shell trick).
 */
const ENV_NAME_REGEXP = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * `define` entries implementing the `envPrefix` option: the environment variables whose
 * name starts with one of the prefixes, as `process.env.NAME` replacements.
 *
 * Opt-in and empty by default. Two habits meet here: components written for webpack (and
 * for Create React App) read `process.env.REACT_APP_*`, which Vite doesn’t define, while
 * Vite’s own `envPrefix` only governs `import.meta.env`. This option covers the first
 * without touching the second — set `viteConfig.envPrefix` as well if the same variables
 * should also appear on `import.meta.env`.
 *
 * Values come from `loadEnv()`, Vite’s own loader, so a project’s `.env`, `.env.local`,
 * `.env.<mode>` and `.env.<mode>.local` mean here exactly what they mean in a Vite app,
 * and the real process environment (`REACT_APP_TITLE=… styleguidist build`) wins over
 * them, as it does there.
 *
 * Security: every value ends up inlined, in clear, in a bundle that is usually deployed
 * publicly. That is why the option exists at all instead of exposing the environment by
 * default, why an empty prefix is refused (see the schema) and why the names are printed.
 *
 * @param envDir Folder the `.env` files are read from, `viteConfig.envDir` or the config file’s.
 */
export function getEnvDefine(
	config: Rsg.SanitizedStyleguidistConfig,
	env: Rsg.StyleguidistEnv,
	envDir: string = config.configDir
): Record<string, string> {
	const prefixes = config.envPrefix || [];
	if (prefixes.length === 0) {
		return {};
	}

	const values = loadEnv(env, envDir, prefixes);
	const define: Record<string, string> = {};
	const skipped: string[] = [];
	Object.keys(values).forEach((name) => {
		if (RESERVED_ENV_NAMES.includes(name) || !ENV_NAME_REGEXP.test(name)) {
			skipped.push(name);
			return;
		}
		define[`process.env.${name}`] = JSON.stringify(values[name]);
	});

	const names = Object.keys(define).map((key) => key.replace('process.env.', ''));
	if (names.length > 0) {
		// Names only, never values: this line is printed on every start and build, and the
		// point of it is that nobody is surprised by what they are shipping to the browser.
		logger.info(
			`Inlining ${names.length} environment ${
				names.length === 1 ? 'variable' : 'variables'
			} into the style guide (envPrefix): ${names.join(', ')}`
		);
	}
	if (skipped.length > 0) {
		logger.debug(
			`Environment variables skipped (reserved or not an identifier): ${skipped.join(', ')}`
		);
	}

	return define;
}

/**
 * Where a `styleguideComponents` value points. It is written like an import: an absolute
 * path, a package name — or a path relative to the config file, which is the one form a
 * Vite alias cannot express. An alias is a plain rewrite, so `./styleguide/Logo` would end
 * up being resolved against the *importing* file, which is Styleguidist’s own
 * `rsg-components/Logo/Logo.js` inside node_modules, and never found. Anchor it to the
 * config file, which is what the path means to the person who wrote it.
 */
function resolveComponentPath(filepath: string, configDir: string): string {
	return filepath.startsWith('.') ? toPosix(path.resolve(configDir, filepath)) : filepath;
}

/**
 * Build the alias list implementing `moduleAliases` and `styleguideComponents`.
 *
 * Order matters (first match wins): user overrides of individual Styleguidist
 * components must come before the catch-all `rsg-components` alias.
 */
export function getAliases(config: Rsg.SanitizedStyleguidistConfig): Alias[] {
	const alias: Alias[] = [];

	// Custom aliases for examples (`moduleAliases` option)
	forEach(config.moduleAliases, (replacement, find) => {
		alias.push({ find, replacement });
	});

	// Custom style guide components (`styleguideComponents` option):
	// `FooRenderer` → rsg-components/Foo/FooRenderer, `Wrapper` → rsg-components/Wrapper.
	// Exact-match RegExps: a string `find` would also rewrite deeper paths
	// (`rsg-components/Wrapper/Wrapper`), which custom components use to wrap the defaults.
	forEach(config.styleguideComponents, (filepath, name) => {
		const fullName = RENDERER_REGEXP.test(name)
			? `${name.replace(RENDERER_REGEXP, '')}/${name}`
			: name;
		alias.push({
			find: new RegExp(`^rsg-components/${escapeRegExp(fullName)}$`),
			replacement: resolveComponentPath(filepath, config.configDir),
		});
	});

	// Styleguidist’s own components, added last so users can override them
	alias.push({
		find: 'rsg-components',
		replacement: toPosix(path.join(CLIENT_DIR, 'rsg-components')),
	});

	// The React root implementation matching the react-dom that will be bundled (see
	// resolveReactDom(): the project’s copy, ours when the project has none)
	alias.push({
		find: /^rsg-react-root$/,
		replacement: toPosix(findClientFile(`utils/reactRoot.${getReactRootFlavor(config.configDir)}`)),
	});

	// `doctrine` (JSDoc type rendering in the browser) requires Node’s `assert`.
	// The shim is CommonJS on purpose (doctrine calls the module as a function).
	alias.push({
		find: /^assert$/,
		replacement: toPosix(path.join(CLIENT_DIR, 'utils/assertShim.cjs')),
	});

	return alias;
}

/**
 * Create the Vite config for a style guide.
 */
export default async function makeViteConfig(
	config: Rsg.SanitizedStyleguidistConfig,
	env: Rsg.StyleguidistEnv
): Promise<InlineConfig> {
	process.env.NODE_ENV = process.env.NODE_ENV || env;

	const isProd = env === 'production';

	// User’s Vite config: the `viteConfig` option or the project’s vite.config.* file
	let userConfig: UserConfig | undefined;
	if (config.viteConfig) {
		userConfig = isFunction(config.viteConfig) ? config.viteConfig(env) : config.viteConfig;
	} else {
		const loaded = await loadConfigFromFile(
			{ command: isProd ? 'build' : 'serve', mode: env },
			undefined,
			config.configDir
		);
		if (loaded) {
			logger.info(`Loading Vite config from:\n${loaded.path}`);
			userConfig = loaded.config;
		}
	}

	// Vite reads `.env` files from `envDir`, which defaults to the project root — here the
	// folder of the style guide config. A project that moved them says so in its Vite
	// config, and `envPrefix` has to look in the same place.
	const envDir = userConfig?.envDir
		? path.resolve(config.configDir, userConfig.envDir)
		: config.configDir;

	const clientEntry = findClientEntry();

	// Dependency pre-bundling is a dev-server concern: `optimizeDeps` is what makes the first
	// render of an example fast and reload-free, and a build never reads it. Filling the two
	// lists costs a full run of the component globs plus one examples-file lookup and one
	// read per component, so a build skips them entirely.
	const componentFiles = isProd
		? []
		: getComponentFilesFromSections(config.sections, config.configDir, config.ignore);
	// Markdown and MDX: getExampleFilename() and section content pages return either
	const exampleFiles = isProd
		? []
		: [
				...componentFiles
					.map((file) => config.getExampleFilename(file))
					.filter((file): file is string => !!file),
				...getAllContentFiles(config.sections, config.configDir),
			];

	const plugins: PluginOption[] = [];
	// Don’t add @vitejs/plugin-react twice if the user already has it
	if (!hasReactPlugin(userConfig && userConfig.plugins)) {
		plugins.push(react());
	}
	plugins.push(
		absolutePaths(),
		jsxInJs(),
		// Deep imports of Styleguidist’s own files, including the ones still written with the
		// old package name (see src/vite/deepImports.ts); a real react-styleguidist
		// dependency is left alone, whatever it contains
		deepImports({
			packageDir: PACKAGE_DIR,
			aliasLegacyPackage: !isLegacyPackageInstalled(config.configDir),
		}),
		styleguidistPlugin({ config, env, clientEntry: toPosix(clientEntry) })
	);

	let viteConfig: InlineConfig = {
		configFile: false,
		root: config.configDir,
		mode: env,
		// Relative asset URLs in builds so the style guide works from any sub-path
		base: isProd ? './' : '/',
		// We serve our own HTML (see plugin)
		appType: 'custom',
		publicDir: false,
		clearScreen: false,
		plugins,
		resolve: {
			alias: getAliases(config),
			// Styleguidist’s own client code lives inside node_modules/vite-styleguidist. When that
			// package is a symlink (`file:` dependency, `npm link`, pnpm) Vite would resolve React from
			// the real path, i.e. the library’s own node_modules, while the user’s components get the
			// project’s copy: two Reacts, and every hook-using example fails with “Cannot read
			// properties of null (reading 'useState')”. Dedupe pins these to the project root.
			dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
		},
		define: {
			// The user’s variables first, so the two Styleguidist owns always win (see
			// RESERVED_ENV_NAMES, which already keeps them out of the object)
			...getEnvDefine(config, env, envDir),
			'process.env.STYLEGUIDIST_ENV': JSON.stringify(env),
		},
		server: {
			host: config.serverHost,
			port: config.serverPort,
			// Fail instead of silently switching to another port (see CLI error message)
			strictPort: true,
			fs: {
				// Styleguidist’s client code may live outside the project (global install, pnpm)
				allow: [searchForWorkspaceRoot(config.configDir), config.configDir, PACKAGE_DIR],
			},
		},
		optimizeDeps: {
			// The entry is a virtual module Vite can’t crawl, point the dependency
			// scanner at the real files instead
			entries: [toPosix(clientEntry), ...componentFiles.map(toPosix)],
			include: findExampleDependencies(exampleFiles, getAliasNames(config, userConfig)),
			rolldownOptions: {
				// The scanner and the optimizer parse files on their own (our plugins don’t apply):
				// let them understand JSX in .js files too
				moduleTypes: { '.js': 'jsx' },
				// …except for a `.js` file the scanner rewrites before parsing it, which loses that
				// module type; this compiles the JSX of those files away first (see the plugin)
				plugins: [scanGlobJsxInJs({ development: !isProd })],
			},
		},
		build: {
			outDir: config.styleguideDir,
			// Only `build/` is cleaned (see build.ts), the folder may hold other files (CNAME, etc.)
			emptyOutDir: false,
			assetsDir: 'build',
			minify: config.minimize ? 'oxc' : false,
			// A style guide ships React, an in-browser compiler (sucrase), Prism, etc. in a
			// single bundle; Vite’s default 500 kB warning would fire on every build
			chunkSizeWarningLimit: 2000,
			rolldownOptions: {
				input: { styleguide: ENTRY_ID },
				output: {
					entryFileNames: 'build/bundle.[hash].js',
					chunkFileNames: 'build/[name].[hash].js',
					assetFileNames: 'build/[name].[hash][extname]',
					// Styled() derives component names from function names (`FooRenderer`),
					// and users target them in the `styles` option: keep them when minifying
					keepNames: true,
				},
			},
		},
	};

	if (userConfig) {
		viteConfig = mergeViteConfig(viteConfig, userConfig, env);
	}

	if (config.dangerouslyUpdateViteConfig) {
		viteConfig = config.dangerouslyUpdateViteConfig(viteConfig, env) as InlineConfig;
	}

	return viteConfig;
}

/**
 * Names of all import aliases: `moduleAliases` and the user’s Vite `resolve.alias`.
 */
export function getAliasNames(
	config: Rsg.SanitizedStyleguidistConfig,
	userConfig?: UserConfig
): string[] {
	const names = Object.keys(config.moduleAliases || {});
	const userAlias = userConfig && userConfig.resolve && userConfig.resolve.alias;
	if (Array.isArray(userAlias)) {
		userAlias.forEach((entry) => {
			if (typeof entry.find === 'string') {
				names.push(entry.find);
			}
		});
	} else if (userAlias && typeof userAlias === 'object') {
		names.push(...Object.keys(userAlias));
	}
	return names;
}
