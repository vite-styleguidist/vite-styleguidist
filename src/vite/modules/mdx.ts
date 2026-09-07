/**
 * The `rsg-mdx:<file>?...` virtual module: an MDX page compiled to a React component,
 * together with the playgrounds it contains.
 *
 * The module exports an **array of one chunk**, not a bare object:
 *
 *     export default [{ type: 'mdx', Content, examples: [ …RuntimeCodeExample… ] }];
 *
 * so that every existing consumer keeps working unchanged — `component.props.examples`
 * and `section.content` stay arrays, `Array.isArray(content) && content.length > 0`
 * (Section.tsx), `examples.length > 0` (ReactComponent.tsx), `filterComponentsWithExample()`
 * and `getAllContentPages()` all hold.
 *
 * Each entry of the inner `examples` array is exactly what the Markdown pipeline produces,
 * `evalInContext` included (see generateExampleRuntime), so Playground, Preview,
 * compileCode, the `require()` shim, `updateExample` and every fence modifier are reused
 * with no MDX-specific code in the browser.
 */
import { Parser } from 'acorn';
import { transformWithOxc } from 'vite';
import parseMdx from '../../loaders/utils/mdx.js';
import { ACORN_OPTIONS } from '../../loaders/utils/getAst.js';
import ModuleSerializer from '../serialize.js';
import { clientHelper, generateExampleRuntime, resolveExampleImport } from './examples.js';
import type { ExamplesModule } from './examples.js';
import type * as Rsg from '../../typings/index.js';

/**
 * Names of the constants the generated module declares around the compiled MDX program.
 * Prefixed, because the MDX page's own `export const` declarations land in the same scope.
 */
const REQUIRE_MAP = '_rsgRequireMap';
const REQUIRE_IN_RUNTIME = '_rsgRequireInRuntime';
const EVAL_IN_CONTEXT = '_rsgEvalInContext';
const DEFAULT_CONTENT = '_rsgMdxContent';

interface Edit {
	start: number;
	end: number;
	text: string;
}

const applyEdits = (code: string, edits: Edit[]): string =>
	[...edits]
		.sort((a, b) => b.start - a.start)
		.reduce(
			(result, edit) => result.slice(0, edit.start) + edit.text + result.slice(edit.end),
			code
		);

/**
 * Make the compiled MDX program spliceable into our module:
 *
 * - relative import specifiers are resolved against the `.mdx` file, which the virtual
 *   module cannot do on its own (it has no directory). Bare specifiers are left to the
 *   plugin's `resolveId` fallback, which re-resolves them from the same directory;
 * - every `export` is demoted to a plain declaration, because the module's public shape is
 *   the examples array. `export const x = 1` in an `.mdx` file is therefore usable *inside*
 *   the page and invisible outside it (see the "not supported" list of ADR 0014);
 * - the default export (MDX's `MDXContent`) becomes a local binding whose name is returned.
 */
export function prepareMdxProgram(code: string, file: string): { code: string; content: string } {
	const program = Parser.parse(code, ACORN_OPTIONS) as any;
	const edits: Edit[] = [];
	let content: string | undefined;

	const rewriteSource = (node: any) => {
		if (node && node.source) {
			edits.push({
				start: node.source.start,
				end: node.source.end,
				text: JSON.stringify(resolveExampleImport(node.source.value, file)),
			});
		}
	};

	for (const node of program.body) {
		switch (node.type) {
			case 'ImportDeclaration':
				rewriteSource(node);
				break;
			case 'ExportDefaultDeclaration': {
				const declaration = node.declaration;
				if (
					(declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') &&
					declaration.id
				) {
					// `export default function MDXContent(props) {…}` — what MDX emits
					content = declaration.id.name;
					edits.push({ start: node.start, end: declaration.start, text: '' });
				} else {
					// An expression (or an anonymous function): bind it to a name of our own
					content = DEFAULT_CONTENT;
					edits.push({
						start: node.start,
						end: declaration.start,
						text: `const ${DEFAULT_CONTENT} = (`,
					});
					edits.push({ start: declaration.end, end: node.end, text: ');' });
				}
				break;
			}
			case 'ExportNamedDeclaration':
				if (node.declaration) {
					// `export const answer = 42` → `const answer = 42`
					edits.push({ start: node.start, end: node.declaration.start, text: '' });
				} else {
					// `export {a}` / `export {a} from './b'`: nothing to keep, the bindings
					// (if any) are already declared in the module
					edits.push({ start: node.start, end: node.end, text: '' });
				}
				break;
			case 'ExportAllDeclaration':
				edits.push({ start: node.start, end: node.end, text: '' });
				break;
			default:
				break;
		}
	}

	if (!content) {
		throw new Error(`${file}: the compiled MDX has no default export`);
	}

	return { code: applyEdits(code, edits), content };
}

export interface MdxModuleOptions {
	/** Lower JSX for production (no `jsx-dev-runtime`, no source locations). */
	isProduction?: boolean;
}

/**
 * Generate the `rsg-mdx:<file>?...` module for one `.mdx` file.
 *
 * Async because `compile()` is: the plugin's `load` hook, `generateBundle` and the dev
 * middleware all tolerate promises.
 *
 * Returns the chunks alongside the code for the same reason generateExamplesModule() does:
 * the machine-readable docs need them and must not compile the page a second time.
 */
export default async function generateMdxModule(
	config: Rsg.SanitizedStyleguidistConfig,
	options: Rsg.ExamplesModuleOptions,
	source: string,
	{ isProduction = false }: MdxModuleOptions = {}
): Promise<ExamplesModule> {
	const { file } = options;
	const parsed = await parseMdx(config, options, source);

	// @vitejs/plugin-react never sees this module: its filter is a RegExp over the module
	// id, and ours is `\0rsg-mdx:<file>`. So the JSX is lowered here, with the same Oxc
	// call src/vite/jsxInJs.ts makes for JSX in `.js` files.
	const lowered = await transformWithOxc(parsed.code, `${file}.jsx`, {
		lang: 'jsx',
		jsx: {
			runtime: 'automatic',
			importSource: 'react',
			development: !isProduction,
		},
	});

	const { code: program, content } = prepareMdxProgram(lowered.code, file);

	const serializer = new ModuleSerializer();
	const { requireMapCode, header } = generateExampleRuntime(
		config,
		options,
		parsed.examples,
		serializer
	);

	// The playgrounds, each bound to the `evalInContext` declared below
	const examplesCode = serializer.serialize(
		parsed.examples.map((example) => ({
			...example,
			evalInContext: { __rsgIdentifier: EVAL_IN_CONTEXT },
		}))
	);

	const code = `${serializer.renderImports()}
import requireInRuntimeBase from ${JSON.stringify(clientHelper('requireInRuntime'))};
import evalInContextBase from ${JSON.stringify(clientHelper('evalInContext'))};

/* --- compiled from ${file} --- */
${program}
/* --- end of the MDX page --- */

const ${REQUIRE_MAP} = ${requireMapCode};
const ${REQUIRE_IN_RUNTIME} = requireInRuntimeBase.bind(null, ${REQUIRE_MAP});
const ${EVAL_IN_CONTEXT} = evalInContextBase.bind(null, ${JSON.stringify(header)}, ${REQUIRE_IN_RUNTIME});

export default [
	{
		type: "mdx",
		Content: ${content},
		examples: ${examplesCode}
	}
];
`;

	return { code, chunks: parsed.chunks };
}
