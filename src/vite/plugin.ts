import fs from 'node:fs';
import path from 'node:path';
import sirv from 'sirv';
import castArray from 'lodash/castArray.js';
import createLogger from 'glogg';
import type { Connect, EnvironmentModuleNode, Plugin, ViteDevServer } from 'vite';
import renderHtml from './html.js';
import generateStyleguideModule from './modules/styleguide.js';
import generatePropsModule from './modules/props.js';
import generateExamplesModule from './modules/examples.js';
import generateMdxModule from './modules/mdx.js';
import {
	buildManifest,
	isMachineReadableFile,
	machineReadableContentType,
	renderMachineReadableFile,
	renderMachineReadableFiles,
} from './machineReadable.js';
import { createParseCache, setCachedDocs, setCachedExamples } from './parseCache.js';
import type { ParseCache } from './parseCache.js';
import {
	ENTRY_ID,
	STYLEGUIDE_ID,
	RESOLVED_ENTRY_ID,
	RESOLVED_STYLEGUIDE_ID,
	PROPS_PREFIX,
	EXAMPLES_PREFIX,
	MDX_PREFIX,
	NULL,
	isPropsId,
	isExamplesId,
	isMdxId,
	parsePropsId,
	parseExamplesId,
	propsId,
	toPosix,
} from './ids.js';
import type * as Rsg from '../typings/index.js';

const logger = createLogger('rsg');

// How Vite exposes a `\0`-prefixed virtual module id to the browser in development
const devUrl = (resolvedId: string) => `/@id/${resolvedId.replace(NULL, '__x00__')}`;

/**
 * The module id as it was written in the importing module, i.e. without the `\0` this
 * plugin's resolveId adds. That is the form the import markers of the style guide carry
 * (see getExamples()), and therefore the key the parse cache is shared on.
 */
const unresolveId = (resolvedId: string) =>
	resolvedId.startsWith(NULL) ? resolvedId.slice(NULL.length) : resolvedId;

const isInside = (dir: string, file: string) => {
	const relative = path.relative(dir, file);
	return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const isBareSpecifier = (request: string) =>
	!request.startsWith('.') &&
	!request.startsWith('/') &&
	!request.startsWith(NULL) &&
	!/^[a-zA-Z]:[\\/]/.test(request) &&
	!request.includes(':');

/**
 * Serve a static directory like the old webpack-dev-server `static` option did.
 * sirv’s own dotfile filter is inactive in `dev` mode, and this middleware runs
 * outside Vite’s `server.fs.deny`, so dotfiles (.env, .git/...) are blocked here —
 * on the *decoded* path, since `/%2Eenv` would slip past a raw-string check.
 */
export function createAssetsMiddleware(dir: string): Connect.NextHandleFunction {
	const serve = sirv(dir, { dev: true, etag: true });
	return (req, res, next) => {
		let pathname = (req.url || '').split('?')[0];
		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			next();
			return;
		}
		if (/(^|\/)\.[^/]/.test(pathname)) {
			next();
			return;
		}
		serve(req, res, next);
	};
}

export interface StyleguidistPluginOptions {
	config: Rsg.SanitizedStyleguidistConfig;
	env: Rsg.StyleguidistEnv;
	/** Absolute path of Styleguidist’s browser entry (lib/client/index.js). */
	clientEntry: string;
}

/**
 * Serve docs.json, llms.txt and llms-full.txt in development (`machineReadable` option).
 * The files are regenerated on every request so they always reflect the sources; the
 * expensive part (react-docgen) is memoized on file mtimes, see ParseCache.
 *
 * The cache is the plugin's, shared with the `load` hook: by the time the first request
 * arrives the dev server has usually transformed the whole module graph already, so the
 * manifest is assembled from parses that have happened rather than from a fresh sweep of
 * the guide (which used to take seconds on a TypeScript design system, on the event loop).
 */
export function createMachineReadableMiddleware(
	config: Rsg.SanitizedStyleguidistConfig,
	cache: ParseCache = createParseCache()
): Connect.NextHandleFunction {
	return async (req, res, next) => {
		const name = (req.url || '').split('?')[0].replace(/^\//, '');
		if ((req.method !== 'GET' && req.method !== 'HEAD') || !isMachineReadableFile(name)) {
			next();
			return;
		}
		try {
			// `tolerateErrors`: a page that cannot be read (an `.mdx` file mid-edit, say) is
			// skipped with its reason recorded, so the rest of the guide keeps being served
			const manifest = await buildManifest(config, undefined, { cache, tolerateErrors: true });
			res.statusCode = 200;
			res.setHeader('Content-Type', machineReadableContentType(name));
			// Never cached: the next request may follow an edit
			res.setHeader('Cache-Control', 'no-store');
			res.end(renderMachineReadableFile(name, manifest));
		} catch (err) {
			next(err);
		}
	};
}

/**
 * The Vite plugin that turns a style guide config into a web app.
 *
 * It replaces the three webpack loaders of the past with virtual modules (see
 * src/vite/ids.ts), serves the HTML page in development and emits it in builds,
 * and wires up hot module replacement for Markdown examples, component docs
 * and added/removed component files.
 */
export default function styleguidistPlugin({
	config,
	env,
	clientEntry,
}: StyleguidistPluginOptions): Plugin {
	// Directories where new/removed files should trigger a rescan of components
	let contextDirs: string[] = [];
	// Absolute paths of every component of the guide, as of the last time the styleguide
	// module was generated. The create/delete branch of hotUpdate looks for the component an
	// examples file belongs to here, instead of walking the whole module graph (which also
	// holds every dependency of every example).
	let componentFiles: string[] = [];
	let server: ViteDevServer | undefined;
	// The section tree the styleguide module was generated from, reused by the
	// machine-readable docs in builds (see generateBundle).
	let sections: Rsg.LoaderSection[] | undefined;
	// Everything parsed during this run — one build, or one dev server — so that the
	// machine-readable docs never re-parse a file the virtual modules already parsed.
	const parseCache = createParseCache();

	const watchContextDirs = () => {
		if (server) {
			// Directories outside of Vite’s root aren’t watched by default
			contextDirs.forEach((dir) => server?.watcher.add(dir));
		}
	};

	return {
		name: 'rsg:styleguidist',

		async resolveId(id, importer) {
			if (id === ENTRY_ID) {
				return RESOLVED_ENTRY_ID;
			}
			if (id === STYLEGUIDE_ID) {
				return RESOLVED_STYLEGUIDE_ID;
			}
			if (
				id.startsWith(PROPS_PREFIX) ||
				id.startsWith(EXAMPLES_PREFIX) ||
				id.startsWith(MDX_PREFIX)
			) {
				return NULL + id;
			}
			// Bare imports written in Markdown examples must resolve from the Markdown
			// file’s directory (as they did with webpack), not from the Vite root —
			// they differ in monorepos, where the dependency may live in a nested
			// node_modules. The examples module has no directory, so resolve on behalf
			// of the Markdown file it was generated from.
			if (
				importer &&
				(importer.startsWith(NULL + EXAMPLES_PREFIX) || importer.startsWith(NULL + MDX_PREFIX)) &&
				isBareSpecifier(id)
			) {
				const markdownFile = parseExamplesId(importer).file;
				return this.resolve(id, markdownFile, { skipSelf: true });
			}
			return null;
		},

		async load(id) {
			if (id === RESOLVED_ENTRY_ID) {
				// `require` config items are loaded before the style guide itself
				// (polyfills, global styles, etc.)
				return (
					[...config.require, clientEntry]
						.map((request) => `import ${JSON.stringify(request)};`)
						.join('\n') + '\n'
				);
			}

			if (id === RESOLVED_STYLEGUIDE_ID) {
				const styleguide = generateStyleguideModule(config);
				styleguide.watchFiles.forEach((file) => this.addWatchFile(file));
				contextDirs = styleguide.contextDirs;
				componentFiles = styleguide.componentFiles;
				sections = styleguide.sections;
				watchContextDirs();
				return styleguide.code;
			}

			// Every branch below remembers what it parsed (see ./parseCache.ts): the
			// machine-readable docs describe exactly these modules, and would otherwise run
			// react-docgen and chunkify a second time over the same, unchanged files.

			if (isPropsId(id)) {
				const file = parsePropsId(id);
				// Re-run react-docgen when the component changes
				this.addWatchFile(file);
				const { code, docs } = generatePropsModule(config, file, fs.readFileSync(file, 'utf8'));
				setCachedDocs(parseCache, config, file, docs);
				return code;
			}

			if (isExamplesId(id)) {
				const options = parseExamplesId(id);
				// Re-parse the examples when the Markdown file changes
				this.addWatchFile(options.file);
				const { code, chunks } = generateExamplesModule(
					config,
					options,
					fs.readFileSync(options.file, 'utf8')
				);
				setCachedExamples(parseCache, unresolveId(id), options.file, chunks);
				return code;
			}

			if (isMdxId(id)) {
				const options = parseExamplesId(id);
				// Same as above: the file is not in the module graph, so watch it explicitly
				// and the importing chain (props/styleguide → client) propagates the update
				this.addWatchFile(options.file);
				const { code, chunks } = await generateMdxModule(
					config,
					options,
					fs.readFileSync(options.file, 'utf8'),
					{ isProduction: env === 'production' }
				);
				setCachedExamples(parseCache, unresolveId(id), options.file, chunks);
				return code;
			}

			return null;
		},

		configureServer(devServer) {
			server = devServer;
			watchContextDirs();

			// User defined customizations (custom endpoints, etc.)
			if (config.configureServer) {
				config.configureServer(devServer.middlewares, env, devServer);
			}

			// Registered as a post hook so that Vite’s own middlewares (module
			// transforms, HMR client, etc.) take precedence.
			return () => {
				// Serve the style guide page. Before the static assets: an `index.html`
				// in `assetsDir` must not shadow the style guide itself.
				devServer.middlewares.use(async (req, res, next) => {
					const url = (req.url || '/').split('?')[0];
					if (url !== '/' && url !== '/index.html') {
						next();
						return;
					}
					try {
						const html = renderHtml(config, {
							publicPath: '',
							js: [devUrl(RESOLVED_ENTRY_ID)],
							css: [],
						});
						// Injects the Vite client, React Fast Refresh preamble, etc.
						const transformed = await devServer.transformIndexHtml(
							req.url || '/',
							html,
							req.originalUrl
						);
						res.statusCode = 200;
						res.setHeader('Content-Type', 'text/html');
						res.end(transformed);
					} catch (err) {
						next(err);
					}
				});

				// Machine-readable docs, before the static assets: like in builds (where
				// `assetsDir` is copied with `force: false`), the generated files win over
				// a docs.json or llms.txt the user keeps in `assetsDir`
				if (config.machineReadable) {
					devServer.middlewares.use(createMachineReadableMiddleware(config, parseCache));
				}

				// Static assets (`assetsDir` option) are served from the root URL
				castArray(config.assetsDir || []).forEach((dir) => {
					devServer.middlewares.use(createAssetsMiddleware(dir));
				});
			};
		},

		hotUpdate({ file, timestamp, modules, type }) {
			// The hook runs once per environment; only the browser graph matters here
			if (this.environment.name !== 'client') {
				return undefined;
			}
			const graph = this.environment.moduleGraph;
			const extra: EnvironmentModuleNode[] = [];

			const invalidate = (id: string) => {
				const mod = graph.getModuleById(id);
				if (mod && !extra.includes(mod)) {
					graph.invalidateModule(mod, new Set(), timestamp, true);
					extra.push(mod);
				}
			};

			// A component changed: re-generate its documentation (react-docgen). Fast
			// Refresh takes care of the component itself; the docs module is imported by
			// the styleguide module, which the client accepts, so the page re-renders.
			// (Not for deleted files: the browser could not re-fetch their modules.)
			if (type !== 'delete') {
				invalidate(NULL + propsId(file));
			}

			if (type === 'create' || type === 'delete') {
				// A file was added or removed where components live: re-run the globs
				if (contextDirs.some((dir) => isInside(dir, file)) || isInside(config.configDir, file)) {
					invalidate(RESOLVED_STYLEGUIDE_ID);
				}
				// An examples file appeared or disappeared: the docs module of its
				// component references it, so regenerate the docs of affected components
				if (file.endsWith('.md') || file.endsWith('.mdx')) {
					// Only components can own an examples file, and invalidate() ignores an id the
					// graph does not hold — so the component list answers this without the graph
					for (const componentPath of componentFiles) {
						const examplesFile = config.getExampleFilename(componentPath);
						if (examplesFile && toPosix(examplesFile) === toPosix(file)) {
							invalidate(NULL + propsId(componentPath));
						}
					}
				}
			}

			if (extra.length === 0) {
				return undefined;
			}
			logger.debug(`Hot update: ${file}`);
			// Keep Vite’s own modules (e.g. the component’s Fast Refresh update) — except for a
			// deleted file, whose modules would produce a failing update in the browser.
			return type === 'delete' ? extra : [...modules, ...extra];
		},

		async generateBundle(_options, bundle) {
			// Emit index.html referencing the entry chunk and its CSS
			const chunks = Object.values(bundle).filter((item) => item.type === 'chunk');
			const entry = chunks.find((chunk) => chunk.isEntry);
			if (!entry) {
				return;
			}
			const css = new Set<string>();
			const collectCss = (chunk: typeof entry, seen = new Set<string>()) => {
				if (seen.has(chunk.fileName)) {
					return;
				}
				seen.add(chunk.fileName);
				chunk.viteMetadata?.importedCss.forEach((file) => css.add(file));
				chunk.imports.forEach((imported) => {
					const importedChunk = chunks.find((item) => item.fileName === imported);
					if (importedChunk) {
						collectCss(importedChunk, seen);
					}
				});
			};
			collectCss(entry);

			const html = renderHtml(config, {
				// Relative URLs so the style guide can be served from any sub-path
				publicPath: './',
				js: [entry.fileName],
				css: Array.from(css),
			});
			this.emitFile({ type: 'asset', fileName: 'index.html', source: html });

			// docs.json, llms.txt and llms-full.txt next to index.html (`machineReadable`
			// option). Emitted as assets, so Vite writes them with the rest of the output
			// and `closeBundle` can’t let an `assetsDir` copy overwrite them.
			if (config.machineReadable) {
				// `cache` and `sections`: everything here was parsed once already, when the
				// modules of this very bundle were loaded. Without them a build runs
				// react-docgen twice per component and chunkify twice per Markdown page.
				const files = await renderMachineReadableFiles(config, { cache: parseCache, sections });
				Object.entries(files).forEach(([fileName, source]) => {
					this.emitFile({ type: 'asset', fileName, source });
				});
			}
		},

		closeBundle() {
			// `closeBundle` also fires when the dev server shuts down; only a
			// production build may write into the style guide folder
			if (env !== 'production') {
				return;
			}
			// Copy static assets (`assetsDir` option) into the output folder.
			// `force: false` keeps the generated files: an `index.html` (or `build/`)
			// inside `assetsDir` must not overwrite the style guide itself.
			castArray(config.assetsDir || []).forEach((dir) => {
				const collision = ['index.html', 'build'].find((name) =>
					fs.existsSync(path.join(dir, name))
				);
				if (collision) {
					logger.warn(
						`"${collision}" in the assets folder ${dir} was not copied: the style guide generates its own`
					);
				}
				fs.cpSync(dir, config.styleguideDir, { recursive: true, force: false });
			});
		},
	};
}
