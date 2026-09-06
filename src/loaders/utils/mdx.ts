/**
 * The MDX side of the examples pipeline.
 *
 * `.mdx` files go through @mdx-js/mdx instead of `remark()` + `chunkify()`, but every
 * rule an author can see is the same one the Markdown path applies: the same playground
 * languages, the same fence modifiers (parseModifiers, shared with parseExample), the
 * same `updateExample` hook at the same point, the same Prism highlighting of non-JS
 * fences (only reached through a `<RsgStatic/>` element instead of raw HTML, because MDX
 * has no raw-HTML passthrough — raw HTML *is* JSX there).
 *
 * @mdx-js/mdx is an OPTIONAL peer dependency: a style guide without a single `.mdx` file
 * must keep building with no new dependency, so it is imported lazily and resolved from
 * the style guide's own directory first (see loadMdxCompiler).
 *
 * What comes out:
 * - `code`   — the compiled ES module, JSX *not* lowered (src/vite/modules/mdx.ts does that);
 * - `examples` — the playgrounds in document order, the array the browser module exposes;
 * - `chunks` — prose and playgrounds interleaved, for the machine-readable docs.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import createLogger from 'glogg';
import expandDefaultComponent from './expandDefaultComponent.js';
import highlightCode from './highlightCode.js';
import parseExample, { isExampleError } from './parseExample.js';
import StyleguidistError from '../../scripts/utils/error.js';
import { DOCS_DOCUMENTING } from '../../scripts/consts.js';
import type * as Rsg from '../../typings/index.js';

const logger = createLogger('rsg');

/** Same list as src/loaders/utils/chunkify.ts — the two pipelines must agree on it. */
const PLAYGROUND_LANGS = ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'];

/** The package that does the compiling, an optional peer dependency. */
export const MDX_PACKAGE = '@mdx-js/mdx';

/** GFM (tables, strikethrough, task lists, autolinks) is on by default, see ADR 0014. */
export const GFM_PACKAGE = 'remark-gfm';

export const isMdxFile = (file: string): boolean => file.toLowerCase().endsWith('.mdx');

/**
 * The message every "@mdx-js/mdx is missing" path prints, warning or error.
 *
 * It names remark-gfm as well, even though only @mdx-js/mdx is strictly required to
 * compile a page: GFM is on by default (ADR 0014) and the docs promise that tables, task lists
 * and strikethrough work out of the box, so a user who installs only what this message says
 * would silently lose all three. Same command as docs/Documenting.md#mdx and the cookbook.
 */
export function missingMdxMessage(file: string): string {
	return (
		`Styleguidist: MDX support needs the optional peer dependencies ${MDX_PACKAGE} and ${GFM_PACKAGE}.\n` +
		`  npm install --save-dev ${MDX_PACKAGE} ${GFM_PACKAGE}\n` +
		`  ${file}\n` +
		`See ${DOCS_DOCUMENTING}#mdx`
	);
}

/** Thrown when an `.mdx` file was named explicitly but @mdx-js/mdx is not installed. */
export class MissingMdxError extends StyleguidistError {
	public constructor(file: string) {
		super(missingMdxMessage(file));
	}
}

/**
 * Resolve an optional peer dependency from the style guide's own directory first, then
 * from ours.
 *
 * The style guide is the package that declares the peer dependency, and under pnpm's
 * strict layout (or in a monorepo) our own `node_modules` cannot see it. This is the same
 * trick getReactRootFlavor() uses for `react-dom`.
 */
function resolveOptional(request: string, configDir: string): string | undefined {
	for (const from of [path.join(configDir, 'package.json'), import.meta.url]) {
		try {
			return createRequire(from).resolve(request);
		} catch {
			// Try the next location
		}
	}
	return undefined;
}

/**
 * Is @mdx-js/mdx installed? Used by the discovery code paths, which must decide whether to
 * skip an `.mdx` file *before* anything async happens (getExamples, getSections).
 */
export const isMdxAvailable = (configDir: string): boolean =>
	resolveOptional(MDX_PACKAGE, configDir) !== undefined;

// Modules are cached: a style guide compiles one .mdx file per component, and importing
// the compiler (57 packages) on every one of them would be measurable.
const moduleCache = new Map<string, Promise<any>>();

async function importOptional(request: string, configDir: string): Promise<any> {
	const key = `${configDir}\0${request}`;
	let loading = moduleCache.get(key);
	if (!loading) {
		const resolved = resolveOptional(request, configDir);
		loading = resolved
			? import(pathToFileURL(resolved).href)
			: Promise.reject(new Error(`Cannot resolve ${request}`));
		moduleCache.set(key, loading);
	}
	return loading;
}

/** Only exported for tests: forget the memoized optional dependencies. */
export function clearMdxModuleCache(): void {
	moduleCache.clear();
}

/** Load @mdx-js/mdx, or throw the documented "please install it" error. */
export async function loadMdxCompiler(configDir: string, file: string): Promise<any> {
	try {
		return await importOptional(MDX_PACKAGE, configDir);
	} catch (err) {
		logger.debug(`Cannot load ${MDX_PACKAGE}: ${err instanceof Error ? err.message : err}`);
		throw new MissingMdxError(file);
	}
}

/**
 * The default remark plugin list: GFM, because tables are the first thing anyone writes in
 * component documentation and the Markdown pipeline (markdown-to-jsx) renders them today.
 * `mdx.remarkPlugins` replaces this list.
 */
async function defaultRemarkPlugins(configDir: string): Promise<unknown[]> {
	try {
		const gfm = await importOptional(GFM_PACKAGE, configDir);
		return [gfm.default];
	} catch {
		logger.debug(
			`${GFM_PACKAGE} is not installed, MDX pages will not render tables, strikethrough or task lists`
		);
		return [];
	}
}

/** An error that Vite can show in its overlay and print in a build. */
export interface MdxCompileError extends Error {
	loc?: { file: string; line: number; column: number };
	frame?: string;
}

/** Three lines of source around the error, with a caret — Vite prints `error.frame` as is. */
function codeFrame(source: string, line: number, column: number): string {
	const lines = source.split('\n');
	const start = Math.max(0, line - 2);
	const end = Math.min(lines.length, line + 1);
	const width = String(end).length;
	const frame: string[] = [];
	for (let index = start; index < end; index++) {
		const number = String(index + 1).padStart(width);
		frame.push(`${index + 1 === line ? '>' : ' '} ${number} | ${lines[index]}`);
	}
	frame.push(`  ${' '.repeat(width)} | ${' '.repeat(Math.max(0, column - 1))}^`);
	return frame.join('\n');
}

/**
 * Where an @mdx-js/mdx error happened, from whichever of its four hiding places has it.
 *
 * `line`/`column` and `place` are both empty on some messages (`end-tag-mismatch`, the one
 * everybody hits first), which carry the position only inside the reason text —
 * "Expected a closing tag for `<Callout>` (3:1-3:10)". `name` is a position string too,
 * but of the *start* of the construct, so it is the last resort.
 */
function errorPosition(err: any, reason: string): { line: number; column: number } {
	if (typeof err?.line === 'number') {
		return { line: err.line, column: typeof err.column === 'number' ? err.column : 1 };
	}
	const place = err?.place?.start || err?.place;
	if (place && typeof place.line === 'number') {
		return { line: place.line, column: typeof place.column === 'number' ? place.column : 1 };
	}
	const fromReason = /\((\d+):(\d+)(?:-\d+:\d+)?\)\s*$/.exec(reason);
	if (fromReason) {
		return { line: Number(fromReason[1]), column: Number(fromReason[2]) };
	}
	const fromName = /^(?:.*:)?(\d+):(\d+)/.exec(String(err?.name ?? ''));
	if (fromName) {
		return { line: Number(fromName[1]), column: Number(fromName[2]) };
	}
	return { line: 1, column: 1 };
}

/**
 * Wrap a VFileMessage from @mdx-js/mdx into something Vite understands.
 *
 * The raw message has neither the file path nor a stack: its `name` is a *position*
 * (`"5:1-5:30"`), so an unwrapped throw shows up as `5:1-5:30` with no context.
 */
export function toMdxCompileError(err: any, file: string, source: string): MdxCompileError {
	const reason = (err && (err.reason || err.message)) || 'Cannot compile MDX';
	const { line, column } = errorPosition(err, reason);
	const error: MdxCompileError = new Error(`${file}: ${reason}`);
	error.loc = { file, line, column: column - 1 };
	error.frame = codeFrame(source, line, column);
	return error;
}

/** The literal `index` attribute of a generated `<RsgPlayground index={n}/>`. */
const indexAttribute = (index: number) => ({
	type: 'mdxJsxAttribute',
	name: 'index',
	value: {
		type: 'mdxJsxAttributeValueExpression',
		value: String(index),
		data: {
			estree: {
				type: 'Program',
				sourceType: 'module',
				comments: [],
				body: [
					{
						type: 'ExpressionStatement',
						expression: { type: 'Literal', value: index },
					},
				],
			},
		},
	},
});

const jsxElement = (name: string, attributes: any[]) => ({
	type: 'mdxJsxFlowElement',
	name,
	attributes,
	children: [],
});

type FenceKind =
	| { kind: 'playground'; index: number; example: Rsg.CodeExample }
	| { kind: 'static'; lang: string; html: string }
	| { kind: 'error'; text: string };

/**
 * A chunk of the machine-readable docs. Code chunks carry the playground ordinal, which
 * is what the isolated-example URL of an MDX page uses (unlike Markdown, where the index
 * counts prose chunks as well).
 */
export type MdxChunk = (Rsg.CodeExample & { index?: number }) | Rsg.MarkdownExample;

export interface MdxParseResult {
	/** Compiled ES module source, JSX not yet lowered (see src/vite/modules/mdx.ts). */
	code: string;
	/** Playgrounds in document order — the `examples` array of the browser module. */
	examples: Rsg.CodeExample[];
	/** Prose and playgrounds interleaved, for docs.json and llms-full.txt. */
	chunks: MdxChunk[];
}

/**
 * Decide what happens to every fenced code block, without touching the tree yet: the
 * chunks of the machine-readable docs are cut out of the *original* source with the node
 * positions, which the replacements below would destroy.
 */
function planFences(
	tree: any,
	visit: (tree: any, type: string, visitor: (node: any) => void) => void,
	updateExample: (example: Omit<Rsg.CodeExample, 'type'>) => Omit<Rsg.CodeExample, 'type'>
): { plan: Map<any, FenceKind>; examples: Rsg.CodeExample[] } {
	const plan = new Map<any, FenceKind>();
	const examples: Rsg.CodeExample[] = [];
	visit(tree, 'code', (node: any) => {
		const example = parseExample(node.value, node.lang, node.meta, updateExample);
		if (isExampleError(example)) {
			plan.set(node, { kind: 'error', text: example.error });
			return;
		}
		const lang = example.lang;
		if (
			!lang ||
			(PLAYGROUND_LANGS.indexOf(lang) !== -1 && !(example.settings && example.settings.static))
		) {
			const collected: Rsg.CodeExample = {
				type: 'code',
				content: example.content,
				settings: example.settings,
				// Kept for the machine-readable docs, which write the fence back (see chunkify)
				...(lang ? { lang } : {}),
			};
			plan.set(node, { kind: 'playground', index: examples.length, example: collected });
			examples.push(collected);
			return;
		}
		plan.set(node, { kind: 'static', lang, html: highlightCode(example.content, lang) });
	});
	return { plan, examples };
}

/**
 * The chunks the machine-readable docs read: playgrounds as `code` chunks (with their
 * playground ordinal stamped on, see §4 of the design note), everything else as the
 * *source* of the MDX block.
 *
 * Slicing the source keeps JSX elements and `{expressions}` verbatim — an LLM reading
 * llms-full.txt should see that a page uses a callout — while `import`/`export`
 * statements (`mdxjsEsm` nodes) are dropped: they are machinery, not documentation.
 */
function toChunks(tree: any, source: string, plan: Map<any, FenceKind>): MdxChunk[] {
	const chunks: MdxChunk[] = [];
	let prose: string[] = [];
	const flush = () => {
		const content = prose.join('\n\n').trim();
		prose = [];
		if (content) {
			chunks.push({ type: 'markdown', content });
		}
	};
	(tree.children || []).forEach((node: any) => {
		if (node.type === 'mdxjsEsm') {
			return;
		}
		const fence = plan.get(node);
		if (fence && fence.kind === 'playground') {
			flush();
			chunks.push({ ...fence.example, index: fence.index });
			return;
		}
		const start = node.position?.start?.offset;
		const end = node.position?.end?.offset;
		if (typeof start === 'number' && typeof end === 'number') {
			prose.push(source.slice(start, end).trim());
		}
	});
	flush();
	return chunks;
}

/** Swap every planned fence for the element the client renders. */
function replaceFences(
	tree: any,
	visit: (tree: any, type: string, visitor: (node: any, index: any, parent: any) => void) => void,
	plan: Map<any, FenceKind>
): void {
	visit(tree, 'code', (node: any, index: any, parent: any) => {
		const fence = plan.get(node);
		if (!fence || !parent || typeof index !== 'number') {
			return;
		}
		if (fence.kind === 'error') {
			// Same as the Markdown pipeline: the block is left in place, showing the error
			node.lang = null;
			node.meta = null;
			node.value = fence.text;
			return;
		}
		parent.children[index] =
			fence.kind === 'playground'
				? jsxElement('RsgPlayground', [indexAttribute(fence.index)])
				: jsxElement('RsgStatic', [
						{ type: 'mdxJsxAttribute', name: 'lang', value: fence.lang },
						{ type: 'mdxJsxAttribute', name: 'html', value: fence.html },
					]);
	});
}

/**
 * Compile one `.mdx` file: the ES module source, its playgrounds, and the chunks the
 * machine-readable docs need.
 *
 * Throws a `MissingMdxError` when @mdx-js/mdx is not installed and an error carrying
 * `loc` and `frame` when the MDX does not compile.
 */
export default async function parseMdx(
	config: Rsg.SanitizedStyleguidistConfig,
	options: Rsg.ExamplesModuleOptions,
	source: string
): Promise<MdxParseResult> {
	const { file, displayName, shouldShowDefaultExample } = options;

	// Replace placeholders (__COMPONENT__) with the passed-in component name, exactly
	// where the Markdown pipeline does it (before parsing)
	if (shouldShowDefaultExample && displayName) {
		source = expandDefaultComponent(source, displayName);
	}

	const [mdx, { visit }] = await Promise.all([
		loadMdxCompiler(config.configDir, file),
		import('unist-util-visit'),
	]);

	const updateExample = (props: Omit<Rsg.CodeExample, 'type'>) =>
		config.updateExample ? config.updateExample(props, file) : props;

	let examples: Rsg.CodeExample[] = [];
	let chunks: MdxChunk[] = [];

	const rsgPlaygrounds = () => (tree: any) => {
		const planned = planFences(tree, visit as any, updateExample);
		examples = planned.examples;
		chunks = toChunks(tree, source, planned.plan);
		replaceFences(tree, visit as any, planned.plan);
	};

	const mdxOptions = config.mdx || {};
	const remarkPlugins = [
		rsgPlaygrounds,
		...(mdxOptions.remarkPlugins ?? (await defaultRemarkPlugins(config.configDir))),
	];

	let compiled;
	try {
		compiled = await mdx.compile(
			{ value: source, path: file },
			{
				// Keep the JSX: src/vite/modules/mdx.ts lowers it with the same Oxc call
				// src/vite/jsxInJs.ts makes, so dev/production is decided in one place
				jsx: true,
				outputFormat: 'program',
				development: false,
				remarkPlugins,
				rehypePlugins: mdxOptions.rehypePlugins,
				recmaPlugins: mdxOptions.recmaPlugins,
			}
		);
	} catch (err) {
		throw toMdxCompileError(err, file, source);
	}

	return { code: String(compiled), examples, chunks };
}
