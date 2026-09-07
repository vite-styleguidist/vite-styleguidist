import path from 'node:path';
import { parse, ERROR_CODES, makeFsImporter } from 'react-docgen';
import type { Documentation, FileState, Handler, Importer, Resolver } from 'react-docgen';
import createLogger from 'glogg';
import getExamples from '../../loaders/utils/getExamples.js';
import getImportedFiles, { clearImportsCache } from '../../loaders/utils/getImportedFiles.js';
import getProps from '../../loaders/utils/getProps.js';
import { getPropsParser } from '../../loaders/utils/propsParser.js';
import defaultSortProps from '../../loaders/utils/sortProps.js';
import ModuleSerializer from '../serialize.js';
import * as consts from '../../scripts/consts.js';
import type * as Rsg from '../../typings/index.js';

const logger = createLogger('rsg');

const ERROR_MISSING_DEFINITION = 'No suitable component definition found.';

export interface PropsModule {
	/** ES module source code, `export default <props object>`. */
	code: string;
	/** The documentation object before serialization (useful for tests). */
	docs: Rsg.PropsObject;
	/**
	 * Absolute paths of the other files this documentation was parsed from — the module a
	 * component's `propTypes` were imported from, the one its props interface lives in.
	 *
	 * The component's own file is not in it (the cache is keyed on that already), and
	 * neither is its examples file (which is re-checked separately). Two things read it:
	 * the parse cache, which is stale the moment one of these files changes, and the dev
	 * server, which has to watch them to notice (src/vite/plugin.ts).
	 */
	dependencies: string[];
}

/**
 * The files the parse running right now has read, or `null` when nothing is recording.
 *
 * A module-level variable rather than something threaded through react-docgen because the
 * hook we get is a cache it writes into (below), and a parse is synchronous from
 * `generatePropsModule()` down: nothing else can run between `start` and `stop`.
 */
let reading: Set<string> | null = null;

/**
 * react-docgen's parse cache, wrapped so that a parse can say which files it read.
 *
 * The importer follows a component's imports — `Button.propTypes = buttonPropTypes` from a
 * sibling module, an interface the props of a `.tsx` component extend — and reads those
 * files. Nothing else in the process knows that it did, which is why a cache keyed on the
 * component's own content alone was serving documentation of a file that had changed (see
 * ../persistentCache.ts, and the `dependencies` of a parse below).
 *
 * Both `get` and `set` record: a file another component already pulled in is a hit here,
 * and it is no less a dependency of this parse for being one.
 */
class RecordingParseCache extends Map<string, FileState> {
	public override get(key: string): FileState | undefined {
		reading?.add(key);
		return super.get(key);
	}

	public override set(key: string, value: FileState): this {
		reading?.add(key);
		return super.set(key, value);
	}
}

let parseCache = new RecordingParseCache();
let resolveCache = new Map<string, string | null>();

/**
 * The importer, rebuilt whenever the caches are dropped.
 *
 * react-docgen's own default importer is a module-level singleton whose caches are never
 * cleared (`fsImporter`), which is exactly wrong for a dev server: after editing a file a
 * component imports, the component would be re-parsed against the *previous* content of
 * that file for as long as the process lived. Owning the caches is what lets
 * `clearImportedFilesCache()` exist.
 */
let importer: Importer = makeFsImporter(undefined, { parseCache, resolveCache });

/**
 * Forget every file react-docgen's importer has read. Called from the plugin's `hotUpdate`,
 * because any of them may be the file that just changed.
 */
export function clearImportedFilesCache(): void {
	parseCache = new RecordingParseCache();
	resolveCache = new Map<string, string | null>();
	importer = makeFsImporter(undefined, { parseCache, resolveCache });
	// The other half of the same memory: what a custom parser's dependencies were scanned
	// from (getImportedFiles), which is keyed by mtime and would notice on its own — but
	// a file rewritten inside the same millisecond at the same length would not.
	clearImportsCache();
}

const defaultParser = (
	filePath: string,
	code: string,
	resolver: Resolver,
	handlers: Handler[]
): Documentation[] => parse(code, { resolver, handlers, filename: filePath, importer });

/**
 * Generate the `virtual:rsg-props?file=…&rsg` module: react-docgen documentation of a component
 * (props, methods, description, JSDoc tags) plus a reference to its examples module.
 *
 * Successor of the webpack `props-loader`.
 */
export default function generatePropsModule(
	config: Rsg.SanitizedStyleguidistConfig,
	file: string,
	source: string
): PropsModule {
	// The `propsParser` option in either form — a function, or a module path this loads and
	// memoizes (see getPropsParser) — falling back to react-docgen
	const propsParser = getPropsParser(config) || defaultParser;

	// What the parse reads, for the cache and the watcher. The default parser answers
	// exactly, through the importer above; a parser of the user's own cannot be asked, so
	// the component's own relative imports are read instead — see getImportedFiles().
	const usesDefaultParser = propsParser === defaultParser;
	const dependencies = new Set<string>(usesDefaultParser ? [] : getImportedFiles(file));

	let docs: Documentation = {};
	try {
		reading = usesDefaultParser ? new Set<string>() : null;
		const result = propsParser(file, source, config.resolver, config.handlers(file));

		// Support only one component
		if (Array.isArray(result)) {
			if (result.length === 0) {
				throw new Error(ERROR_MISSING_DEFINITION);
			}
			docs = result[0];
		} else {
			docs = result;
		}
	} catch (err) {
		if (err instanceof Error) {
			const errorMessage = err.toString();
			const componentPath = path.relative(process.cwd(), file);
			const isMissingDefinition =
				(err as { code?: string }).code === ERROR_CODES.MISSING_DEFINITION ||
				errorMessage === `Error: ${ERROR_MISSING_DEFINITION}`;
			const message = isMissingDefinition
				? `${componentPath} matches a pattern defined in “components” or “sections” options in your ` +
					'style guide config but doesn’t export a component.\n\n' +
					'It usually happens when using third-party libraries, see possible solutions here:\n' +
					`${consts.DOCS_THIRDPARTIES}`
				: `Cannot parse ${componentPath}: ${err}\n\n` +
					'It usually means that react-docgen does not understand your source code, try to file an issue here:\n' +
					'https://github.com/reactjs/react-docgen/issues';
			logger.warn(message);
		}
	} finally {
		// In `finally` because a parse that threw still read whatever it read: the entry the
		// caller is about to cache describes that failure, and it goes stale with those files
		reading?.forEach((read) => dependencies.add(read));
		reading = null;
	}

	const tempDocs = getProps(docs, file, config);
	let finalDocs: Rsg.PropsObject = { ...tempDocs, props: [] };

	const componentProps = tempDocs.props;
	if (componentProps) {
		// Transform the properties to an array. This will allow sorting
		const propsAsArray = Object.keys(componentProps).reduce((acc: Rsg.PropDescriptor[], name) => {
			const prop = componentProps[name] as Rsg.PropDescriptor;
			prop.name = name;
			acc.push(prop);
			return acc;
		}, []);

		const sortProps = config.sortProps || defaultSortProps;
		finalDocs.props = sortProps(propsAsArray);
	}

	// Examples from Markdown file
	const examplesFile = config.getExampleFilename(file);
	finalDocs.examples = getExamples(
		config,
		file,
		finalDocs.displayName,
		examplesFile,
		config.defaultExample
	);

	if (config.updateDocs) {
		finalDocs = config.updateDocs(finalDocs, file);
	}

	const serializer = new ModuleSerializer();
	const body = serializer.serialize(finalDocs);
	const code = `${serializer.renderImports()}

export default ${body};
`;

	// The component itself is the cache key, not one of its own dependencies
	dependencies.delete(file);

	return { code, docs: finalDocs, dependencies: [...dependencies] };
}
