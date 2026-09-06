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
	'pagePerSection',
	'previewDelay',
	'ribbon',
	'showSidebar',
	'styles',
	'theme',
	'title',
	'version',
];

export interface StyleguideModule {
	/** ES module source code, `export default { config, welcomeScreen, patterns, sections }`. */
	code: string;
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
		sections,
	});

	const code = `${serializer.renderImports()}

export default ${styleguide};
`;

	return { code, componentFiles: allComponentFiles, watchFiles, contextDirs };
}
