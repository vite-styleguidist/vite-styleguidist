import pick from 'lodash/pick.js';
import createLogger from 'glogg';
import * as fileExistsCaseInsensitive from '../../scripts/utils/findFileCaseInsensitive.js';
import getAllContentPages from '../../loaders/utils/getAllContentPages.js';
import getComponentFilesFromSections from '../../loaders/utils/getComponentFilesFromSections.js';
import getComponentPatternsFromSections from '../../loaders/utils/getComponentPatternsFromSections.js';
import getSections from '../../loaders/utils/getSections.js';
import filterComponentsWithExample from '../../loaders/utils/filterComponentsWithExample.js';
import commonDir from '../../loaders/utils/commonDir.js';
import slugger from '../../loaders/utils/slugger.js';
import getNameFromFilePath from '../../loaders/utils/getNameFromFilePath.js';
import { importDefault } from '../../loaders/utils/importIt.js';
import ModuleSerializer from '../serialize.js';
import type * as Rsg from '../../typings/index.js';

const logger = createLogger('rsg');

// Config options that should be passed to the client
export const CLIENT_CONFIG_OPTIONS = [
	'colorScheme',
	'compilerConfig',
	'mdxComponents',
	'tocMode',
	'mountPointId',
	'pageNav',
	'pagePerSection',
	'previewDelay',
	'ribbon',
	'scrollSync',
	'showSidebar',
	'styles',
	'theme',
	'title',
	'version',
];

export interface StyleguideModule {
	/** ES module source code, `export default { config, welcomeScreen, patterns, sections }`. */
	code: string;
	/**
	 * The section tree the module describes. Handed to the machine-readable docs in builds so
	 * that the component globs and the tree walk happen once per build, not twice.
	 */
	sections: Rsg.LoaderSection[];
	/** Absolute paths of all components in the style guide. */
	componentFiles: string[];
	/** Extra files the module depends on (theme/styles files). */
	watchFiles: string[];
	/** Directories to watch for added or removed files. */
	contextDirs: string[];
}

/**
 * The section tree of a style guide, in sidebar order: `getSections()` run on the config,
 * minus the components without an examples file when `skipComponentsWithoutExample` is on.
 *
 * Shared by the styleguide virtual module and the machine-readable docs
 * (src/vite/machineReadable.ts) so that both describe exactly the same guide: same
 * components, same order, same slugs.
 */
export function collectSections(config: Rsg.SanitizedStyleguidistConfig): Rsg.LoaderSection[] {
	// Clear cache so it would detect new or renamed files
	fileExistsCaseInsensitive.clearCache();

	// Reset slugger for each code reload to be deterministic
	slugger.reset();

	const sections = getSections(config.sections, config);
	return config.skipComponentsWithoutExample ? filterComponentsWithExample(sections) : sections;
}

/**
 * The same section tree, with every component’s documentation behind a loader
 * (`lazyDocs`, ADR 0019).
 *
 * What stays in the tree is everything the guide can know about a component without
 * parsing it — its file, its slug, its path line, whether it has examples — plus the name
 * derived from its file path, because the sidebar, the routes and the headings exist
 * before any documentation is loaded. What leaves it is what react-docgen and the Markdown
 * pipeline produced (`props`) and the component’s own module (`module`, which the props
 * module already pulls in through the playgrounds): together they are 60% of the bytes of
 * a large style guide, and none of them is needed to draw the page.
 *
 * `metadata` stays: it is a plain `.json` file next to the component, it is usually absent,
 * and the component toolbar reads it on the first paint.
 */
function toLazyComponent(
	component: Rsg.LoaderComponent,
	config: Rsg.SanitizedStyleguidistConfig
): Rsg.LazyLoaderComponent {
	const { module, props, ...rest } = component;
	return {
		...rest,
		// `hasExamples` is the one thing the client is told about a component’s examples
		// before they are loaded, and it is what draws the “add examples to this component”
		// hint at once for a component that has none (ReactComponent). On the Node side the
		// flag means “there is an examples file”, which is what `skipComponentsWithoutExample`
		// filters on; here it has to mean “there will be examples”, and with `defaultExample`
		// configured a component without a file of its own still gets one. Only the lazy tree
		// is corrected — the filtering above ran on the other meaning, on purpose.
		hasExamples: component.hasExamples || !!config.defaultExample,
		// The absolute path the guide imports the component from, which is what
		// processComponent() derives the slug from and getProps() falls back to
		nameFromPath: getNameFromFilePath(module.__rsgImport),
		loadDocs: { __rsgLazy: { props, module } },
	};
}

function toLazySections(
	sections: Rsg.LoaderSection[],
	config: Rsg.SanitizedStyleguidistConfig
): Rsg.LazyLoaderSection[] {
	return sections.map((section) => ({
		...section,
		components: section.components.map((component) => toLazyComponent(component, config)),
		sections: toLazySections(section.sections, config),
	}));
}

/**
 * Generate the `virtual:rsg-styleguide` module: the list of sections with their
 * components, examples and the part of the config the client needs.
 *
 * This is the successor of the webpack `styleguide-loader`: instead of `require()`
 * calls, file references are import markers turned into `import` statements.
 */
export default function generateStyleguideModule(
	config: Rsg.SanitizedStyleguidistConfig
): StyleguideModule {
	const sections = collectSections(config);

	const allComponentFiles = getComponentFilesFromSections(
		config.sections,
		config.configDir,
		config.ignore
	);
	const allContentPages = getAllContentPages(sections);

	// Nothing to show in the style guide
	const welcomeScreen = allContentPages.length === 0 && allComponentFiles.length === 0;
	const patterns = welcomeScreen ? getComponentPatternsFromSections(config.sections) : undefined;

	logger.debug('Loading components:\n' + allComponentFiles.join('\n'));

	// Directories to watch to pick up new or removed component files:
	// user-defined or the common parent directory of all components
	const contextDirs = config.contextDependencies
		? config.contextDependencies
		: allComponentFiles.length > 0
			? [commonDir(allComponentFiles)]
			: [];

	// `theme` and `styles` can be paths to files; import them so they end up in the
	// bundle and are hot reloaded (the client expects objects or functions).
	const clientConfig = pick(config, CLIENT_CONFIG_OPTIONS) as Record<string, unknown>;
	const watchFiles: string[] = [];
	for (const key of ['styles', 'theme'] as const) {
		const value = config[key];
		if (typeof value === 'string') {
			watchFiles.push(value);
			clientConfig[key] = importDefault(value);
		}
	}

	// `mdxComponents` is a map of name to module path (docs/Configuration.md#mdxcomponents):
	// a config file runs in Node and cannot carry a React component into the browser, so each
	// path becomes an import marker the serializer turns into a real import, exactly as a
	// `styles` or `theme` path does.
	if (config.mdxComponents) {
		const components: Record<string, unknown> = {};
		for (const [name, value] of Object.entries(config.mdxComponents)) {
			if (typeof value === 'string') {
				watchFiles.push(value);
				components[name] = importDefault(value);
			} else {
				components[name] = value;
			}
		}
		clientConfig.mdxComponents = components;
	}

	const serializer = new ModuleSerializer();
	const styleguide = serializer.serialize({
		config: clientConfig,
		welcomeScreen,
		patterns,
		// `sections` itself is handed to the machine-readable docs, which read the import
		// markers the loaders produced (machineReadable.ts), so the lazy tree is a copy
		sections: config.lazyDocs ? toLazySections(sections, config) : sections,
	});

	const code = `${serializer.renderImports()}

export default ${styleguide};
`;

	return { code, sections, componentFiles: allComponentFiles, watchFiles, contextDirs };
}
