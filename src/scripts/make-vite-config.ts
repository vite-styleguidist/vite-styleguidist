import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadConfigFromFile, searchForWorkspaceRoot } from 'vite';
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
import jsxInJs from '../vite/jsxInJs.js';
import absolutePaths from '../vite/absolutePaths.js';
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

/**
 * Which React root API the project's `react-dom` supports: `modern` (`createRoot()`,
 * React 18 and newer) or `legacy` (`ReactDOM.render()`, React 16.14 and 17).
 *
 * The two implementations live in src/client/utils/reactRoot.{modern,legacy}.ts and the
 * client imports whichever one the `rsg-react-root` alias points at (see reactRoot.ts for
 * why the choice cannot be made at runtime). `react-dom` is resolved from the project
 * (`config.configDir`), the same place `resolve.dedupe` pins the runtime copy to, so the
 * branch and the React that ends up in the bundle always agree. `react-dom/package.json`
 * resolves on every supported version: 16 and 17 have no `exports` map, 18 and 19 export it.
 *
 * Not resolvable (Preact-only projects, unusual layouts) falls back to `modern`, the only
 * behaviour before React 16 support; `preact/compat` provides both APIs anyway.
 */
export function getReactRootFlavor(configDir: string): 'modern' | 'legacy' {
	let version: string;
	try {
		const requireFromProject = createRequire(path.join(configDir, 'package.json'));
		({ version } = requireFromProject('react-dom/package.json') as { version: string });
	} catch {
		logger.debug('Cannot resolve react-dom from the project, mounting with createRoot()');
		return 'modern';
	}
	// A major of 0 is React's experimental channel (`0.0.0-experimental-<hash>-<date>`), which
	// tracks the newest React and no longer exports `render()`; an unparseable version is a
	// custom build we know nothing about. Both are safer on the modern branch: `createRoot()`
	// has existed since 18 and is the only API the experimental builds still ship.
	const major = parseInt(version, 10);
	const flavor = major >= 18 || major === 0 || Number.isNaN(major) ? 'modern' : 'legacy';
	logger.debug(
		`Found react-dom ${version}, mounting with ${
			flavor === 'modern' ? 'createRoot()' : 'ReactDOM.render()'
		}`
	);
	return flavor;
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
			replacement: filepath,
		});
	});

	// Styleguidist’s own components, added last so users can override them
	alias.push({
		find: 'rsg-components',
		replacement: toPosix(path.join(CLIENT_DIR, 'rsg-components')),
	});

	// The React root implementation matching the project’s react-dom (see getReactRootFlavor)
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

	const clientEntry = findClientEntry();
	const componentFiles = getComponentFilesFromSections(
		config.sections,
		config.configDir,
		config.ignore
	);
	// Markdown and MDX: getExampleFilename() and section content pages return either
	const exampleFiles = [
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
