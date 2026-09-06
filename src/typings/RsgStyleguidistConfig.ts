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
import type { Theme } from './RsgTheme.js';

export type StyleguidistEnv = 'development' | 'production';

/** Parameters carried by the `rsg-examples:` virtual module id (see src/vite/ids.ts). */
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

interface BaseStyleguidistConfig {
	assetsDir: string | string[];
	tocMode: ExpandMode;
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
	exampleMode: ExpandMode;
	editorConfig: {
		theme: string;
	};
	getComponentPathLine(componentPath: string): string;
	getExampleFilename(componentPath: string): string | false;
	handlers: (componentPath: string) => Handler[];
	ignore: string[];
	logger: {
		info(message: string): void;
		warn(message: string): void;
		debug(message: string): void;
	};
	/** Emit docs.json, llms.txt and llms-full.txt with the style guide (and serve them in development). */
	machineReadable: boolean;
	minimize: boolean;
	mountPointId: string;
	moduleAliases: Record<string, string>;
	pagePerSection: boolean;
	previewDelay: number;
	printBuildInstructions(config: SanitizedStyleguidistConfig): void;
	printServerInstructions(
		config: SanitizedStyleguidistConfig,
		options: { isHttps: boolean; urls: { local: string[]; network: string[] } }
	): void;
	propsParser(
		filePath: string,
		code: string,
		resolver: Resolver,
		handlers: Handler[]
	): Documentation | Documentation[];
	require: string[];
	resolver: Resolver;
	ribbon?: {
		text?: string;
		url: string;
	};
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
	Omit<SanitizedStyleguidistConfig, 'defaultExample'>
> {
	defaultExample?: string | boolean;
}
