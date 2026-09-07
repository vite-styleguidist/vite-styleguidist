import path from 'node:path';
import { parse, ERROR_CODES } from 'react-docgen';
import type { Documentation, Handler, Resolver } from 'react-docgen';
import createLogger from 'glogg';
import getExamples from '../../loaders/utils/getExamples.js';
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
}

const defaultParser = (
	filePath: string,
	code: string,
	resolver: Resolver,
	handlers: Handler[]
): Documentation[] => parse(code, { resolver, handlers, filename: filePath });

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

	let docs: Documentation = {};
	try {
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

	return { code, docs: finalDocs };
}
