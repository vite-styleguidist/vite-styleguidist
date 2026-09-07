import type { ComponentType } from 'react';
import type { Connect, UserConfig, ViteDevServer } from 'vite';
import type { Options as SucraseOptions } from 'sucrase';
import type { Handler, Resolver } from 'react-docgen';
import type { Styles } from 'jss';
import type { RecursivePartial } from './RecursivePartial.js';
import type { ExpandMode } from './RsgComponent.js';
import type { Documentation, PropDescriptor } from './RsgDocgen.js';
import type { PropsObject } from './RsgPropsObject.js';
import type { CodeExample } from './RsgExample.js';
import type { ConfigSection, Section } from './RsgSection.js';
import type { ColorScheme, Theme } from './RsgTheme.js';

export type StyleguidistEnv = 'development' | 'production';

/**
 * The `mdx` config option: plugin lists passed straight to @mdx-js/mdx's `compile()`.
 *
 * Typed as `readonly unknown[]` on purpose. The real type is unified's `PluggableList`,
 * but a published `.d.ts` that referenced `unified` would force every consumer to install
 * it — including the ones who never write a line of MDX. The cast happens once, at the
 * `compile()` call site.
 */
export interface MdxOptions {
	/**
	 * remark plugins (`[remarkFrontmatter]`). Replaces the default list, which is
	 * `[remarkGfm]` — pass `[remarkGfm, remarkFrontmatter]` to keep GFM.
	 */
	remarkPlugins?: readonly unknown[];
	rehypePlugins?: readonly unknown[];
	recmaPlugins?: readonly unknown[];
}

/** Parameters carried by the `virtual:rsg-examples?` module id (see src/vite/ids.ts). */
export interface ExamplesModuleOptions {
	/** Absolute path of the Markdown file with examples. */
	file: string;
	/** Display name of the component the examples belong to, made available in examples without an import. */
	displayName?: string;
	/** Absolute path of the component module, made available in examples as `displayName`. */
	componentPath?: string;
	/** Whether the file is the default example template whose `__COMPONENT__` placeholders must be expanded. */
	shouldShowDefaultExample?: boolean;
}

/**
 * Values of the `scrollSync` config option: `false` turns scroll syncing off, `'selection'`
 * only moves the sidebar highlight, `'hash'` also rewrites the URL fragment.
 */
export type ScrollSync = false | 'selection' | 'hash';

/**
 * The `propsParser` option's function form: given a component file and its source, return a
 * react-docgen documentation object (or an array of them, of which the first is used).
 */
export type PropsParser = (
	filePath: string,
	code: string,
	resolver: Resolver,
	handlers: Handler[]
) => Documentation | Documentation[];

interface BaseStyleguidistConfig {
	assetsDir: string | string[];
	/**
	 * Reuse the component and example parses of previous runs, from a cache inside Vite’s
	 * `cacheDir` (`node_modules/.vite/vite-styleguidist/` by default). `true` by default;
	 * `styleguidist build --no-cache` and `styleguidist server --no-cache` turn it off for
	 * one run. See docs/decisions/0018-parse-cache-and-parallel-parsing.md.
	 */
	cache: boolean;
	tocMode: ExpandMode;
	/** Initial colour scheme of the UI; `light`/`dark` force it and hide the toggle. */
	colorScheme: ColorScheme;
	/** Options passed to sucrase's `transform()` to compile examples in the browser. */
	compilerConfig: SucraseOptions;
	components: (() => string[]) | string | string[];
	configDir: string;
	context: Record<string, string>;
	contextDependencies: string[];
	/**
	 * Customize the dev server. `app` is Vite's connect middleware stack (use `app.use(...)`),
	 * `server` is the full `ViteDevServer` instance.
	 */
	configureServer(app: Connect.Server, env: StyleguidistEnv, server: ViteDevServer): void;
	/** Last-resort escape hatch: mutate the final Vite config. */
	dangerouslyUpdateViteConfig: (config: UserConfig, env: StyleguidistEnv) => UserConfig;
	defaultExample: string | false;
	/**
	 * Name prefixes of the environment variables exposed to the examples and components as
	 * `process.env.NAME` (`['REACT_APP_']`). Empty by default: nothing is exposed.
	 *
	 * Sanitized to an array; a single prefix may be written as a string. See
	 * `getEnvDefine()` in src/scripts/make-vite-config.ts for what is read and
	 * docs/Configuration.md for the security note (the values end up in a public bundle).
	 */
	envPrefix: string[];
	exampleMode: ExpandMode;
	editorConfig: {
		theme: string;
	};
	getComponentPathLine(componentPath: string): string;
	getExampleFilename(componentPath: string): string | false;
	handlers: (componentPath: string) => Handler[];
	ignore: string[];
	/**
	 * Load each component’s documentation (its props, its examples and its own module) on
	 * demand instead of putting all of it in the first script the browser downloads; see
	 * docs/decisions/0019-on-demand-documentation.md.
	 *
	 * `true` by default. `false` puts every component’s documentation back in the entry
	 * chunk, which is the shape style guides had before this option existed.
	 */
	lazyDocs: boolean;
	logger: {
		info(message: string): void;
		warn(message: string): void;
		debug(message: string): void;
	};
	/** Emit docs.json, llms.txt and llms-full.txt with the style guide (and serve them in development). */
	machineReadable: boolean;
	/** MDX compiler options for `.mdx` examples and content pages. */
	mdx: MdxOptions;
	/**
	 * Extra components available to every MDX page, merged over the default element map
	 * (`h1`, `p`, `a`, …): `{ Callout: 'src/docs/Callout' }` makes `<Callout/>` usable
	 * without an import. Values are module paths — absolute, or relative to the config
	 * file, resolved and imported for the browser exactly like a `styles` or `theme` path.
	 * A component value is emitted with `Function.prototype.toString()` like a `styles`
	 * function, so it must be self-contained: it cannot close over anything else in the
	 * config file, and it cannot use JSX unless the config is compiled.
	 */
	mdxComponents: Record<string, string | ComponentType<any>>;
	minimize: boolean;
	mountPointId: string;
	moduleAliases: Record<string, string>;
	/**
	 * Whether a page that shows a single component or section gets an “on this page” list of
	 * its own headings (`PageNav`); see docs/decisions/0016-table-of-contents.md.
	 *
	 * `false` by default: it adds a visible element and a layout column, so it is opt-in. It
	 * is a boolean today and may grow an object form (`{ minLevel, maxLevel, title }`) in a
	 * later minor; the client only ever asks whether the value is truthy.
	 */
	pageNav: boolean;
	pagePerSection: boolean;
	/**
	 * Parse components and examples in worker threads.
	 *
	 * `'auto'` (the default) turns the pool on from 150 resolved components and runs two to
	 * four workers; `true` always turns it on, a number sets the worker count, `false` keeps
	 * every parse on the main thread. Parses that read a function from the config
	 * (`propsParser`, `resolver`, `handlers`, `sortProps`, `updateDocs`, `updateExample`,
	 * `getExampleFilename`) stay on the main thread whatever this says, because a worker
	 * cannot be given a function. See
	 * docs/decisions/0018-parse-cache-and-parallel-parsing.md.
	 */
	parallel: boolean | number | 'auto';
	previewDelay: number;
	printBuildInstructions(config: SanitizedStyleguidistConfig): void;
	printServerInstructions(
		config: SanitizedStyleguidistConfig,
		options: { isHttps: boolean; urls: { local: string[]; network: string[] } }
	): void;
	/**
	 * Override how props are parsed out of a component file.
	 *
	 * Either the function itself, or — recommended — the path of a module whose default
	 * export is that function, resolved from the config file’s folder (a package name works
	 * too). Only the module form can be identified across runs, so only it lets the parse
	 * cache (`cache`) skip a component that has not changed; a function form turns docs
	 * caching off. Both forms always run on the main thread, never in a `parallel` worker.
	 */
	propsParser: PropsParser | string;
	require: string[];
	resolver: Resolver;
	ribbon?: {
		text?: string;
		url: string;
	};
	/**
	 * Whether the sidebar highlight (and optionally the URL fragment) follows the reader as
	 * the page scrolls; see docs/decisions/0015-scroll-synced-selection.md.
	 *
	 * - `'selection'` (default): the highlighted entry follows the scroll, the URL is never
	 *   touched;
	 * - `'hash'`: the same, plus the fragment is rewritten with `history.replaceState` so a
	 *   copied link points at the section on screen;
	 * - `false`: the selection only changes when the reader navigates, as before 1.0.
	 */
	scrollSync: ScrollSync;
	serverHost: string;
	serverPort: number;
	showCode: boolean;
	showUsage: boolean;
	showSidebar: boolean;
	skipComponentsWithoutExample: boolean;
	sortProps(props: PropDescriptor[]): PropDescriptor[];
	styleguideComponents: Record<string, string>;
	styleguideDir: string;
	styles: Styles | string | ((theme: Theme) => Styles);
	template: any;
	theme: RecursivePartial<Theme> | string;
	title: string;
	updateDocs(doc: PropsObject, file: string): PropsObject;
	updateExample(props: Omit<CodeExample, 'type'>, resourcePath: string): Omit<CodeExample, 'type'>;
	usageMode: ExpandMode;
	verbose: boolean;
	version: string;
	/** Custom Vite config (object or function of the environment) merged into Styleguidist’s own. */
	viteConfig: UserConfig | ((env: StyleguidistEnv) => UserConfig);
	// Removed webpack-era options, kept in the type so the schema can print migration hints.
	webpackConfig: never;
	dangerouslyUpdateWebpackConfig: never;
	updateWebpackConfig: never;
}

export interface ProcessedStyleguidistConfig extends BaseStyleguidistConfig {
	sections: Section[];
	theme: RecursivePartial<Theme>;
	styles: ((th: Theme) => Styles) | Styles;
}

export type ProcessedStyleguidistCSSConfig = Pick<ProcessedStyleguidistConfig, 'theme'> &
	Pick<ProcessedStyleguidistConfig, 'styles'>;

export interface SanitizedStyleguidistConfig extends BaseStyleguidistConfig {
	sections: ConfigSection[];
}

/**
 * definition of the config object where everything is optional
 * note that teh default example can be both a string and a boolean but ends
 * up only being a string after sanitizing
 */
export interface StyleguidistConfig extends RecursivePartial<
	Omit<SanitizedStyleguidistConfig, 'defaultExample' | 'envPrefix'>
> {
	defaultExample?: string | boolean;
	/** One prefix or a list of them; a single string is turned into a list when the config is read. */
	envPrefix?: string | string[];
}
