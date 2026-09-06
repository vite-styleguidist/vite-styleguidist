import fs from 'node:fs';
import path from 'node:path';
import chunkify from '../../loaders/utils/chunkify.js';
import expandDefaultComponent from '../../loaders/utils/expandDefaultComponent.js';
import getImports from '../../loaders/utils/getImports.js';
import importIt from '../../loaders/utils/importIt.js';
import dirname from '../../scripts/utils/dirname.js';
import ModuleSerializer from '../serialize.js';
import { toPosix } from '../ids.js';
import type * as Rsg from '../../typings/index.js';

// Browser-side helpers, imported by the generated module. They live next to the
// other loader utils (as `.ts` in src/, `.js` in the published lib/).
const CLIENT_HELPERS_DIR = path.resolve(dirname(import.meta.url), '../../loaders/utils/client');
const clientHelper = (name: string): string => {
	for (const ext of ['.js', '.ts']) {
		const candidate = path.join(CLIENT_HELPERS_DIR, name + ext);
		if (fs.existsSync(candidate)) {
			return toPosix(candidate);
		}
	}
	return toPosix(path.join(CLIENT_HELPERS_DIR, `${name}.js`));
};

/**
 * Turn the import request found in an example into a module id Vite can resolve
 * from a virtual module: relative paths are resolved against the Markdown file’s
 * directory (as a webpack loader would), everything else (bare specifiers, aliases,
 * absolute paths) is passed through.
 */
export function resolveExampleImport(request: string, markdownFile: string): string {
	if (request.startsWith('./') || request.startsWith('../')) {
		return toPosix(path.resolve(path.dirname(markdownFile), request));
	}
	return request;
}

/**
 * Identifier used in the evaluation header for a context module name
 * (`Foo.Sub` → `FooSub`).
 */
const safeIdentifier = (name: string): string => name.replace(/\W/g, '');

/**
 * Split a Markdown file into its chunks: prose (`markdown`) and playground examples
 * (`code`), see chunkify(). The `updateExample` config option is applied to every
 * code block on the way.
 *
 * Shared by the examples virtual module and the machine-readable docs
 * (src/vite/machineReadable.ts), so both see the same examples.
 */
export function parseExamples(
	config: Rsg.SanitizedStyleguidistConfig,
	options: Rsg.ExamplesModuleOptions,
	source: string
): (Rsg.CodeExample | Rsg.MarkdownExample)[] {
	const { file, displayName, shouldShowDefaultExample } = options;

	// Replace placeholders (__COMPONENT__) with the passed-in component name
	if (shouldShowDefaultExample && displayName) {
		source = expandDefaultComponent(source, displayName);
	}

	// chunkify() drops the fence language of playground examples (the browser compiles
	// them all the same way), but the machine-readable docs want it back to write
	// ```jsx / ```tsx fences. `updateExample` is called once per code block, in document
	// order, with the same `content` that ends up in the chunk, so the languages are
	// recorded here and matched back to the code chunks below.
	const seen: { lang?: string | null; content: string }[] = [];
	const updateExample = (props: Omit<Rsg.CodeExample, 'type'>) => {
		const updated = config.updateExample ? config.updateExample(props, file) : props;
		seen.push({ lang: updated.lang, content: updated.content });
		return updated;
	};

	const examples = chunkify(source, updateExample);

	let cursor = 0;
	return examples.map((example) => {
		if (example.type !== 'code') {
			return example;
		}
		// Static and non-playground blocks were seen too but produced no chunk: skip them
		while (cursor < seen.length && seen[cursor].content !== example.content) {
			cursor++;
		}
		const lang = cursor < seen.length ? seen[cursor++].lang : undefined;
		return lang ? { ...example, lang } : example;
	});
}

/**
 * Generate the `rsg-examples:<file>?...` module: the examples of a Markdown file,
 * each code example bundled with an `evalInContext()` function that can run it in
 * the browser with access to the modules it imports.
 *
 * Successor of the webpack `examples-loader`.
 */
export default function generateExamplesModule(
	config: Rsg.SanitizedStyleguidistConfig,
	options: Rsg.ExamplesModuleOptions,
	source: string
): string {
	const { file, displayName, componentPath } = options;

	// Load examples
	const examples = parseExamples(config, options, source);

	// Find all import statements and require() calls in examples to make them
	// available at runtime. Browsers have no require(), and the examples are compiled
	// on the fly, so every module an example may need must be imported here, statically,
	// and handed to the example through a `require()` shim (requireInRuntime).
	const requiresFromExamples = examples
		.filter((example): example is Rsg.CodeExample => example.type === 'code')
		.reduce((requires: string[], example) => requires.concat(getImports(example.content)), []);

	// Auto imported modules.
	// We don't need to do anything here to support explicit imports: they will
	// work because both imports (generated below and by rewrite-imports) will
	// be eventually transpiled to `var x = require('x')`, so we'll just have two
	// of them in the same scope, which is fine in non-strict mode
	const fullContext: Record<string, string> = {
		// Modules, provided by the user
		...config.context,
		// Append React, because it’s required for JSX
		React: 'react',
		// Append the current component module to make it accessible in examples
		// without an explicit import
		...(displayName && componentPath ? { [displayName]: toPosix(componentPath) } : {}),
	};

	// All required or imported modules, either explicitly in examples code
	// or implicitly (React, current component and context config option)
	const allModules = [...requiresFromExamples, ...Object.values(fullContext)];

	const serializer = new ModuleSerializer();

	// Map from the request as written in the example to the imported module namespace
	const requireMap: Record<string, Rsg.ImportMarker> = {};
	allModules.forEach((request) => {
		requireMap[request] = importIt(resolveExampleImport(request, file));
	});

	// Header code that makes context modules available as local variables inside
	// examples, with ES module / CommonJS interop:
	//   const React$0 = require('react');
	//   const React = React$0.default || React$0['React'] || React$0;
	const header = Object.entries(fullContext)
		.map(([name, request]) => {
			const id = safeIdentifier(name);
			return (
				`const ${id}$0 = require(${JSON.stringify(request)});\n` +
				`const ${id} = ${id}$0.default || ${id}$0[${JSON.stringify(id)}] || ${id}$0;`
			);
		})
		.join('\n');

	// Stringify examples object except the evalInContext function
	const examplesWithEval = examples.map((example) =>
		example.type === 'code'
			? { ...example, evalInContext: { __rsgIdentifier: 'evalInContext' } }
			: example
	);

	const requireMapCode = serializer.serialize(requireMap);
	const examplesCode = serializer.serialize(examplesWithEval);

	return `${serializer.renderImports()}
import requireInRuntimeBase from ${JSON.stringify(clientHelper('requireInRuntime'))};
import evalInContextBase from ${JSON.stringify(clientHelper('evalInContext'))};

const requireMap = ${requireMapCode};
const requireInRuntime = requireInRuntimeBase.bind(null, requireMap);
const evalInContext = evalInContextBase.bind(null, ${JSON.stringify(header)}, requireInRuntime);

export default ${examplesCode};
`;
}
