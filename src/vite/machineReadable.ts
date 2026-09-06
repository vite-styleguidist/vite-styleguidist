/**
 * Machine-readable copies of a style guide: `docs.json`, `llms.txt` and `llms-full.txt`.
 *
 * The browser gets the style guide as virtual modules (src/vite/modules/*); AI tools,
 * scripts and the planned MCP server get the same information as files. Everything here
 * is derived from the *same* functions that generate the virtual modules — sections from
 * `collectSections()`, component docs from `generatePropsModule()`, examples from
 * `parseExamples()` — so there is no second parser to keep in sync, and the files can
 * never disagree with what the style guide shows.
 *
 * `buildManifest()` is pure (given a config and the section tree it reads files but
 * touches nothing else) and deterministic apart from `generatedAt`. It is async because
 * compiling an MDX page is; the two callers (the dev middleware and `generateBundle`)
 * both tolerate a promise. Purity aside: sections and
 * components come in sidebar order, so two builds of the same sources produce the same
 * JSON (set SOURCE_DATE_EPOCH to pin the timestamp too). The renderers turn the manifest
 * into the two text formats.
 *
 * The files are emitted by the build and served by the dev server, see ./plugin.ts and
 * the `machineReadable` config option.
 */
import fs from 'node:fs';
import path from 'node:path';
import doctrine from 'doctrine';
import createLogger from 'glogg';
import { getLanguages } from '../loaders/utils/highlightCode.js';
import getUrl from '../client/utils/getUrl.js';
import { collectSections } from './modules/styleguide.js';
import generatePropsModule from './modules/props.js';
import { parseExamples } from './modules/examples.js';
import parseMdx from '../loaders/utils/mdx.js';
import { MDX_PREFIX, NULL, parseExamplesId, toPosix } from './ids.js';
import { isImportMarker } from '../typings/index.js';
import type * as Rsg from '../typings/index.js';

const logger = createLogger('rsg');

/** Names of the generated files, relative to the style guide root (next to index.html). */
export const DOCS_JSON = 'docs.json';
export const LLMS_TXT = 'llms.txt';
export const LLMS_FULL_TXT = 'llms-full.txt';
export const MACHINE_READABLE_FILES = [DOCS_JSON, LLMS_TXT, LLMS_FULL_TXT] as const;
export type MachineReadableFile = (typeof MACHINE_READABLE_FILES)[number];

/**
 * Bumped when the shape of docs.json changes incompatibly, so that consumers (the MCP
 * server planned for 1.1 among them) can tell which shape they are reading.
 */
export const MANIFEST_SCHEMA_VERSION = 1;

/** A JSDoc tag (`@see …`, `@param {string} name …`), see the `tags` fields. */
export interface ManifestTag {
	/** `@param`-like tags: the documented name. */
	name?: string;
	/** `@param`-like tags: the type expression, printed. */
	type?: string;
	/** The text of the tag (Markdown), `null` for bare tags such as `@public`. */
	description: string | null;
}

/** JSDoc tags grouped by title, like the UI receives them. */
export type ManifestTags = Record<string, ManifestTag[]>;

export interface ManifestProp {
	name: string;
	/**
	 * The type and its values on one line, like the props table’s type and description
	 * columns combined: `string`, `oneOf: a | b`, `shape { id: number }`, `func`, or a
	 * Flow/TypeScript annotation as written.
	 */
	type: string;
	required: boolean;
	/** The default value as written in the source (`'#333'`, `42`, `() => {}`), `null` when there is none. */
	defaultValue: string | null;
	/** Markdown. */
	description: string;
	tags: ManifestTags;
}

export interface ManifestMethodParam {
	name: string;
	/** The type as JSDoc prints it (`string`, `Object`, `SyntheticEvent`), `null` when unknown. */
	type: string | null;
	description: string | null;
}

export interface ManifestMethod {
	name: string;
	params: ManifestMethodParam[];
	returns: { type: string | null; description: string | null } | null;
	/** Markdown. */
	description: string;
	tags: ManifestTags;
}

export interface ManifestExample {
	/**
	 * Position of the example among the chunks of the examples file (prose included), the
	 * number the style guide uses in isolated-example URLs: `index.html#!/Button/2`.
	 */
	index: number;
	/** Fence language (`jsx`, `tsx`, …); code blocks without one are JSX playgrounds. */
	lang: string;
	code: string;
	/** Fence modifiers: `{ padded: true }`, `{ props: { className: 'checks' } }`, … */
	settings: Record<string, unknown>;
	/** The prose (Markdown) between the previous example and this one. */
	description: string;
}

export interface ManifestComponent {
	/** The name used in code (and in the sidebar unless `visibleName` is set). */
	name: string;
	displayName: string;
	/** The `@visibleName` doclet, when the component has one. */
	visibleName: string | null;
	slug: string;
	/** Link to the component in the style guide, relative to the style guide root. */
	href: string;
	/** Path of the component file, relative to the project root (the config file’s folder). */
	filePath: string;
	/** Markdown. */
	description: string;
	tags: ManifestTags;
	props: ManifestProp[];
	methods: ManifestMethod[];
	/** Which pipeline produced the examples page: Markdown or MDX. */
	format: 'md' | 'mdx';
	examples: ManifestExample[];
	/**
	 * Prose (Markdown) of the examples files that no example follows: what comes after the
	 * last playground, or the whole file when it has no playground at all.
	 */
	notes: string;
	/**
	 * Why this component has no examples here: the message of the examples file that could
	 * not be read (an `.mdx` page that does not compile, say). Only in development, where a
	 * broken page degrades instead of failing the whole manifest — a build fails first.
	 */
	error?: string;
}

export interface ManifestSection {
	/** `null` for the implicit section created by the `components` shortcut. */
	name: string | null;
	slug: string;
	/**
	 * Link to the section in the style guide, relative to the style guide root; `null` for
	 * the unnamed section the `components` shortcut creates, which renders no heading.
	 */
	href: string | null;
	/** The `description` of the section config (Markdown), if any. */
	description: string | null;
	/** The section’s content page (Markdown), if any: playgrounds are written back as fenced code. */
	content: string | null;
	/** Which pipeline produced the content page: Markdown or MDX. */
	format: 'md' | 'mdx';
	components: ManifestComponent[];
	sections: ManifestSection[];
	/** Why this section has no content page: see `ManifestComponent.error`. */
	error?: string;
}

export interface DocsManifest {
	schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
	source: 'vite-styleguidist';
	/** The `title` config option. */
	name: string;
	/** The `version` config option, `null` when unset. */
	version: string | null;
	/** ISO 8601 timestamp. */
	generatedAt: string;
	sections: ManifestSection[];
}

/**
 * Memo of the parsed component docs and examples files, keyed by file path and
 * invalidated by mtime/size. The dev server regenerates the manifest on every request;
 * react-docgen is the expensive part, and a guide with hundreds of components would
 * otherwise take seconds per request. Builds don’t need it (they run once).
 */
export interface ManifestCache {
	docs: Map<
		string,
		{
			key: string;
			docs: Rsg.PropsObject;
			/** The file an `@example` doclet points at (absolute), and whether it existed at parse time */
			exampleFile: string | null;
			exampleFileExists: boolean;
		}
	>;
	examples: Map<string, { key: string; chunks: Chunk[] }>;
}

export const createManifestCache = (): ManifestCache => ({ docs: new Map(), examples: new Map() });

export interface BuildManifestOptions {
	cache?: ManifestCache;
	/**
	 * Keep going when an examples file cannot be read: that page contributes no examples and
	 * carries the reason in its `error`, the rest of the guide is still served. The dev
	 * middleware sets it, so that one uncompilable `.mdx` page does not take docs.json,
	 * llms.txt and llms-full.txt down with it; a build leaves it off and fails, which is what
	 * the module graph does with the same file anyway.
	 */
	tolerateErrors?: boolean;
	/** The `generatedAt` timestamp (defaults to now, or to SOURCE_DATE_EPOCH when set); tests pass a fixed date. */
	now?: Date;
}

/**
 * A chunk of an examples file. The MDX parser stamps `index` on its code chunks: an MDX
 * page's isolated-example URL counts playgrounds, while a Markdown page's counts every
 * chunk (prose included), and `toManifestExamples()` must report the number the UI uses.
 */
type Chunk = (Rsg.CodeExample & { index?: number }) | Rsg.MarkdownExample;

/** The part of a file’s stat that tells whether it changed since the last parse. */
const fileKey = (file: string): string => {
	const stat = fs.statSync(file);
	return `${stat.mtimeMs}:${stat.size}`;
};

/**
 * The file an `@example` doclet points at, resolved like getProps() resolves it (relative
 * to the component), or `null` when the component has no such doclet.
 */
const exampleDocletFile = (file: string, docs: Rsg.PropsObject): string | null => {
	const doclet = docs.doclets?.example;
	return typeof doclet === 'string' && doclet.trim()
		? path.resolve(path.dirname(file), doclet.trim())
		: null;
};

/**
 * Reproducible builds: the SOURCE_DATE_EPOCH convention
 * (https://reproducible-builds.org/specs/source-date-epoch/) pins `generatedAt`.
 */
const defaultNow = (): Date => {
	const epoch = process.env.SOURCE_DATE_EPOCH;
	return epoch && /^\d+$/.test(epoch) ? new Date(Number(epoch) * 1000) : new Date();
};

// ---------------------------------------------------------------------------
// Undoing syntax highlighting
// ---------------------------------------------------------------------------

/**
 * Undo the Prism highlighting the loaders bake into Markdown: `highlightCode()` runs on
 * every fenced code block with a known language (in component descriptions and in the
 * prose around examples), so that text reaches the browser as HTML. The manifest wants
 * the source back. Only fenced code blocks are touched, and only those in a language
 * Prism knows (exactly the blocks `highlightCode()` highlighted), so HTML a user wrote
 * in prose, and code in languages that were never highlighted, are left alone.
 */
export function unhighlight(markdown: string): string {
	const languages = new Set(getLanguages());
	const lines = markdown.split('\n');
	const output: string[] = [];
	let index = 0;
	while (index < lines.length) {
		// remark re-serialises the Markdown before the loaders highlight it, so a fence inside
		// a list item or a blockquote, and every code line in it, carries the same prefix of
		// indentation and `>` markers; capturing the prefix finds those blocks too
		const fence = lines[index].match(/^([ \t>]*)(`{3,}|~{3,})\s*(\S*)/);
		if (!fence) {
			output.push(lines[index++]);
			continue;
		}
		// A fenced block ends at a line made of the same fence character, at least as long
		// (CommonMark), behind at most the same prefix, or at the end of the text
		const [, prefix, marker, lang] = fence;
		const closing = new RegExp(`^[ \\t>]{0,${prefix.length}}${marker[0]}{${marker.length},}\\s*$`);
		output.push(lines[index++]);
		const code: string[] = [];
		while (index < lines.length && !closing.test(lines[index])) {
			code.push(lines[index++]);
		}
		output.push(languages.has(lang) ? unhighlightBlock(code, prefix) : code.join('\n'));
		if (index < lines.length) {
			output.push(lines[index++]);
		}
	}
	return output.join('\n');
}

/**
 * Strip the token markup of one block. The list-item or blockquote prefix is removed from
 * every line first, so that a `>` marker is never taken for the end of a tag, and put back
 * afterwards; a blank line inside a blockquote is a bare `>`, hence the loose match.
 */
function unhighlightBlock(code: string[], prefix: string): string {
	if (!prefix) {
		return stripTokens(code.join('\n'));
	}
	const stripped = code.map((line) =>
		line.startsWith(prefix) ? line.slice(prefix.length) : line.replace(/^[ \t>]*/, '')
	);
	return stripTokens(stripped.join('\n'))
		.split('\n')
		.map((line) => (line ? prefix + line : prefix.trimEnd()))
		.join('\n');
}

/**
 * Remove Prism’s `<span class="token …">` wrappers (and only those: a `</span>` is dropped
 * only when it closes a token span) and revert the escaping Prism applies to the text
 * (`&` → `&amp;`, `<` → `&lt;`, see `Prism.util.encode`). Some tokens carry more
 * attributes (`entity` has a `title`), hence the loose match of the opening tag.
 */
function stripTokens(html: string): string {
	let depth = 0;
	const text = html.replace(/<span class="token[^"]*"[^>]*>|<\/span>/g, (tag) => {
		if (tag !== '</span>') {
			depth++;
			return '';
		}
		if (depth > 0) {
			depth--;
			return '';
		}
		return tag;
	});
	return text.replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------------------
// Printing types the way the UI does
// ---------------------------------------------------------------------------

const unquote = (value: string): string => value.replace(/^['"]|['"]$/g, '');

/**
 * The type the props table renders: Flow and TypeScript annotations win over PropTypes,
 * and a Flow union of literals is an enum (mirrors src/client/rsg-components/Props/util.ts).
 */
function getType(prop: Rsg.PropDescriptor): any {
	const flowType = (prop as any).flowType;
	if (flowType) {
		if (
			flowType.name === 'union' &&
			Array.isArray(flowType.elements) &&
			flowType.elements.every((element: { name: string }) => element.name === 'literal')
		) {
			return { ...flowType, name: 'enum', value: flowType.elements };
		}
		return flowType;
	}
	return (prop as any).tsType || prop.type;
}

const printEnumValues = (value: unknown): string =>
	Array.isArray(value)
		? value.map((item: { value: string }) => unquote(String(item.value))).join(' | ')
		: String(value);

const printShape = (fields: Record<string, any>): string =>
	Object.keys(fields)
		.map((name) => {
			const field = fields[name];
			return `${name}: ${printPropTypesType(field)}${field.required ? ' (required)' : ''}`;
		})
		.join(', ');

/** PropTypes as text: `string`, `oneOf: a | b`, `shape { a: number }`, `string[]`, … */
function printPropTypesType(type: any): string {
	if (!type) {
		return 'unknown';
	}
	switch (type.name) {
		case 'enum':
			return `oneOf: ${printEnumValues(type.value)}`;
		case 'union':
			return `oneOfType: ${
				Array.isArray(type.value) ? type.value.map(printPropTypesType).join(' | ') : type.value
			}`;
		case 'arrayOf': {
			// Parenthesised when the element type has spaces, otherwise `oneOf: a | b[]` would
			// read as an array of `b`
			const element = printPropTypesType(type.value);
			return /\s/.test(element) ? `(${element})[]` : `${element}[]`;
		}
		case 'objectOf':
			return `objectOf: ${printPropTypesType(type.value)}`;
		case 'instanceOf':
			return `instanceOf: ${type.value}`;
		case 'shape':
		case 'exact':
			return typeof type.value === 'object' && type.value
				? `${type.name} { ${printShape(type.value)} }`
				: type.name;
		default:
			return type.name;
	}
}

/** Flow / TypeScript types as text: the annotation as written, an enum as its values. */
function printAdvancedType(type: any): string {
	switch (type.name) {
		case 'enum':
			return `oneOf: ${printEnumValues(type.value)}`;
		case 'literal':
			return String(type.value);
		default:
			return type.raw || type.name || 'unknown';
	}
}

/** The prop type, printed like the props table prints it. */
export function printPropType(prop: Rsg.PropDescriptor): string {
	const type = getType(prop);
	if (!type) {
		return 'unknown';
	}
	return (prop as any).flowType || (prop as any).tsType
		? printAdvancedType(type)
		: printPropTypesType(type);
}

/**
 * A JSDoc type expression as text (`string`, `Array.<number>`, `Object`), using doctrine
 * like the UI does (see ArgumentRenderer); optional types are printed with a `?`.
 */
function printDoctrineType(type: any): string | null {
	if (!type) {
		return null;
	}
	try {
		if (type.type === 'OptionalType') {
			return `${doctrine.type.stringify(type.expression)}?`;
		}
		return doctrine.type.stringify(type);
	} catch {
		// Not a doctrine type: react-docgen types are converted in getProps(), but a
		// custom `updateDocs` may put anything here
		return typeof type.raw === 'string'
			? type.raw
			: typeof type.name === 'string'
				? type.name
				: null;
	}
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/**
 * Tags that drive the tooling rather than document anything: `@component` marks a
 * definition for react-docgen, `@example <file>` names an examples file (its examples
 * are inlined in `examples`), `@public` is what makes a method listed at all. The UI
 * shows none of them, the manifest doesn’t either.
 */
const MECHANICAL_TAGS = ['component', 'example', 'public'];

const toManifestTags = (tags?: Rsg.TagProps): ManifestTags => {
	const result: ManifestTags = {};
	Object.keys(tags || {}).forEach((title) => {
		const list = tags?.[title];
		if (!list || MECHANICAL_TAGS.includes(title)) {
			return;
		}
		result[title] = list.map((tag) => {
			const param = tag as Rsg.TagParamObject;
			const manifestTag: ManifestTag = { description: tag.description ?? null };
			if (param.name) {
				manifestTag.name = param.name;
			}
			const type = printDoctrineType(param.type);
			if (type) {
				manifestTag.type = type;
			}
			return manifestTag;
		});
	});
	return result;
};

const toManifestProp = (prop: Rsg.PropDescriptor): ManifestProp => ({
	name: prop.name,
	type: printPropType(prop),
	required: !!prop.required,
	defaultValue:
		prop.defaultValue && prop.defaultValue.value !== undefined
			? String(prop.defaultValue.value)
			: null,
	description: prop.description || '',
	tags: toManifestTags(prop.tags),
});

const toManifestMethod = (method: Rsg.MethodDescriptor): ManifestMethod => ({
	name: method.name,
	params: (method.params || []).map((param) => ({
		name: param.name,
		type: printDoctrineType(param.type),
		description: param.description ?? null,
	})),
	returns: method.returns
		? {
				type: printDoctrineType(method.returns.type),
				description: method.returns.description ?? null,
			}
		: null,
	description: method.description || '',
	tags: toManifestTags(method.tags),
});

/**
 * Examples as the manifest lists them: every playground with the prose that precedes it,
 * plus the prose left after the last one (`notes`). `index` counts prose chunks too, to
 * match the isolated-example URLs of the UI.
 */
export function toManifestExamples(chunks: Chunk[]): {
	examples: ManifestExample[];
	notes: string;
} {
	const examples: ManifestExample[] = [];
	let prose: string[] = [];
	chunks.forEach((chunk, index) => {
		if (chunk.type === 'markdown') {
			prose.push(unhighlight(chunk.content).trim());
			return;
		}
		examples.push({
			// MDX pages number their playgrounds, Markdown pages number every chunk
			index: chunk.index ?? index,
			lang: chunk.lang || 'jsx',
			code: chunk.content,
			settings: chunk.settings || {},
			description: prose.join('\n\n'),
		});
		prose = [];
	});
	return { examples, notes: prose.join('\n\n') };
}

/** A content page (a section’s Markdown file) back as Markdown. */
const chunksToMarkdown = (chunks: Chunk[]): string =>
	chunks
		.map((chunk) =>
			chunk.type === 'markdown'
				? unhighlight(chunk.content)
				: `\`\`\`${chunk.lang || 'jsx'}\n${chunk.content}\n\`\`\``
		)
		.join('\n\n');

/** Was this examples module generated from an `.mdx` file? (See src/vite/ids.ts.) */
const isMdxMarker = (marker: Rsg.ImportMarker | null | undefined): boolean =>
	isImportMarker(marker) && marker.__rsgImport.startsWith(MDX_PREFIX);

class ManifestBuilder {
	constructor(
		private config: Rsg.SanitizedStyleguidistConfig,
		private cache: ManifestCache | undefined,
		private tolerateErrors: boolean = false
	) {}

	/** Component documentation, straight from the props virtual module generator. */
	private readDocs(file: string): Rsg.PropsObject {
		// The docs also depend on whether the examples file exists (see getExamples()) and
		// on whether the file an `@example` doclet names exists (see getProps()), so a
		// Readme.md or an examples file that appears later must invalidate the memo too
		const key = `${fileKey(file)}|${this.config.getExampleFilename(file) || ''}`;
		const cached = this.cache?.docs.get(file);
		if (
			cached &&
			cached.key === key &&
			(cached.exampleFile === null ||
				fs.existsSync(cached.exampleFile) === cached.exampleFileExists)
		) {
			return cached.docs;
		}
		const { docs } = generatePropsModule(this.config, file, fs.readFileSync(file, 'utf8'));
		const exampleFile = exampleDocletFile(file, docs);
		this.cache?.docs.set(file, {
			key,
			docs,
			exampleFile,
			exampleFileExists: exampleFile !== null && fs.existsSync(exampleFile),
		});
		return docs;
	}

	/**
	 * The chunks of an examples module, from its import marker (see getExamples()).
	 *
	 * Async because compiling MDX is: the prose of an `.mdx` page is extracted from the
	 * same parse the browser module is built from, so the two can never disagree.
	 */
	private async readExamples(marker: Rsg.ImportMarker | null | undefined): Promise<Chunk[]> {
		if (!isImportMarker(marker)) {
			return [];
		}
		const options = parseExamplesId(NULL + marker.__rsgImport);
		if (!fs.existsSync(options.file)) {
			return [];
		}
		const key = `${fileKey(options.file)}|${marker.__rsgImport}`;
		const cached = this.cache?.examples.get(marker.__rsgImport);
		if (cached && cached.key === key) {
			return cached.chunks;
		}
		const source = fs.readFileSync(options.file, 'utf8');
		const chunks = isMdxMarker(marker)
			? (await parseMdx(this.config, options, source)).chunks
			: parseExamples(this.config, options, source);
		this.cache?.examples.set(marker.__rsgImport, { key, chunks });
		return chunks;
	}

	/**
	 * The chunks of an examples module, or nothing plus the reason when `tolerateErrors`
	 * is set (development).
	 *
	 * An `.mdx` page that does not compile rejects here, and one broken page must not cost
	 * the whole guide its docs.json, llms.txt and llms-full.txt — every other page is fine
	 * and the dev server regenerates all three on the next request anyway. A build keeps the
	 * hard failure: the module graph fails on the same file, so a half-empty manifest would
	 * never be written.
	 */
	private async readExamplesOrDegrade(
		marker: Rsg.ImportMarker | null | undefined
	): Promise<{ chunks: Chunk[]; error?: string }> {
		try {
			return { chunks: await this.readExamples(marker) };
		} catch (err) {
			if (!this.tolerateErrors) {
				throw err;
			}
			// The message of an MDX compile error starts with the file path (see
			// toMdxCompileError), so it names both the file and the reason
			const error = err instanceof Error ? err.message : String(err);
			logger.warn(`Cannot read examples for the machine-readable docs, skipping them:\n${error}`);
			return { chunks: [], error };
		}
	}

	private async component(
		component: Rsg.LoaderComponent,
		link: LinkOptions
	): Promise<ManifestComponent> {
		// The absolute path the style guide imports the component from
		const file = component.module.__rsgImport;
		const docs = this.readDocs(file);
		const name = docs.displayName;
		// Examples file first, then the `@example` doclet file, like the client does
		// (see src/client/utils/processComponents.ts)
		const examplesFile = await this.readExamplesOrDegrade(docs.examples);
		const docletFile = await this.readExamplesOrDegrade(docs.example);
		const chunks = [...examplesFile.chunks, ...docletFile.chunks];
		const error = [examplesFile.error, docletFile.error].filter(Boolean).join('\n');
		return {
			name,
			displayName: name,
			visibleName: docs.visibleName || null,
			slug: component.slug || '',
			href: getUrl(
				{
					name,
					slug: component.slug,
					anchor: !link.useRouterLinks,
					hashPath: link.useRouterLinks ? link.hashPath : false,
					useSlugAsIdParam: link.useRouterLinks ? link.useHashId : false,
				},
				LINK_LOCATION
			),
			filePath: toPosix(component.filepath || path.relative(this.config.configDir, file)),
			description: unhighlight(docs.description || '').trim(),
			tags: toManifestTags(docs.tags),
			props: (Array.isArray(docs.props) ? docs.props : []).map(toManifestProp),
			methods: (docs.methods || []).map(toManifestMethod),
			format: isMdxMarker(docs.examples) || isMdxMarker(docs.example) ? 'mdx' : 'md',
			...toManifestExamples(chunks),
			// Absent unless a page failed, so the manifest of a healthy guide is unchanged
			...(error ? { error } : {}),
		};
	}

	private async content(
		content: Rsg.LoaderSection['content']
	): Promise<{ content: string | null; error?: string }> {
		if (!content) {
			return { content: null };
		}
		if (!isImportMarker(content)) {
			// `content` config option given as a function returning Markdown
			return { content: content.content };
		}
		const { chunks, error } = await this.readExamplesOrDegrade(content);
		return { content: chunksToMarkdown(chunks), ...(error ? { error } : {}) };
	}

	public async sections(
		sections: Rsg.LoaderSection[],
		link: LinkOptions
	): Promise<ManifestSection[]> {
		return Promise.all(
			sections.map(async (section) => {
				// Same link rules as the sidebar (see src/client/utils/processSections.ts)
				const childLink: LinkOptions = {
					useRouterLinks: !!(link.useRouterLinks && section.name),
					useHashId: section.sectionDepth === 0,
					hashPath: [...link.hashPath, section.name || '-'],
				};
				// The unnamed section of the `components` shortcut renders no heading, so there is
				// nothing on the page to link to
				const href =
					section.href ||
					(section.name
						? getUrl(
								{
									name: section.name,
									slug: section.slug,
									anchor: !link.useRouterLinks,
									hashPath: link.useRouterLinks ? link.hashPath : false,
									useSlugAsIdParam: link.useRouterLinks ? link.useHashId : false,
								},
								LINK_LOCATION
							)
						: null);
				const content = await this.content(section.content);
				return {
					name: section.name || null,
					slug: section.slug || '',
					href,
					description: section.description || null,
					content: content.content,
					format: isMdxMarker(section.content as Rsg.ImportMarker) ? 'mdx' : 'md',
					components: await Promise.all(
						section.components.map((component) => this.component(component, childLink))
					),
					sections: await this.sections(section.sections, childLink),
					...(content.error ? { error: content.error } : {}),
				};
			})
		);
	}
}

interface LinkOptions {
	useRouterLinks: boolean;
	useHashId: boolean;
	hashPath: string[];
}

// Links are relative to the style guide root, where the files are written, so they
// resolve wherever the guide is deployed. getUrl() is the client’s own link builder.
const LINK_LOCATION = { origin: '', pathname: 'index.html', hash: '' };

/**
 * Build the manifest of a style guide: every section and component the sidebar shows,
 * in that order, with docs, props, methods and examples.
 *
 * @param config Sanitized style guide config.
 * @param sections The section tree, `collectSections(config)` unless a caller already has it.
 */
export async function buildManifest(
	config: Rsg.SanitizedStyleguidistConfig,
	sections: Rsg.LoaderSection[] = collectSections(config),
	options: BuildManifestOptions = {}
): Promise<DocsManifest> {
	const builder = new ManifestBuilder(config, options.cache, options.tolerateErrors);
	return {
		schemaVersion: MANIFEST_SCHEMA_VERSION,
		source: 'vite-styleguidist',
		name: config.title,
		version: config.version || null,
		generatedAt: (options.now || defaultNow()).toISOString(),
		sections: await builder.sections(sections, {
			useRouterLinks: !!config.pagePerSection,
			useHashId: false,
			hashPath: [],
		}),
	};
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

export interface RenderOptions {
	/**
	 * Absolute URL of the deployed style guide (with a trailing slash), prepended to the
	 * relative links. Without it the links stay relative to the file, which is right
	 * whenever the file is read from where it was deployed.
	 */
	baseUrl?: string;
}

/** Every component of the manifest, depth first, with the sections it is nested in. */
export function flattenComponents(
	sections: ManifestSection[],
	parents: ManifestSection[] = []
): { component: ManifestComponent; parents: ManifestSection[] }[] {
	return sections.flatMap((section) => [
		...section.components.map((component) => ({ component, parents: [...parents, section] })),
		...flattenComponents(section.sections, [...parents, section]),
	]);
}

const flattenSections = (sections: ManifestSection[]): ManifestSection[] =>
	sections.flatMap((section) => [section, ...flattenSections(section.sections)]);

const countSections = (sections: ManifestSection[]): number =>
	flattenSections(sections).filter((section) => section.name).length;

/** The first paragraph of a Markdown text, on one line, for link annotations. */
const firstLine = (markdown: string): string => {
	const paragraph = markdown.trim().split(/\n\s*\n/)[0] || '';
	return paragraph.replace(/\s+/g, ' ').trim();
};

const pluralize = (count: number, word: string): string =>
	`${count} ${word}${count === 1 ? '' : 's'}`;

const summary = (manifest: DocsManifest): string => {
	const components = flattenComponents(manifest.sections).length;
	const sections = countSections(manifest.sections);
	const version = manifest.version ? ` (version ${manifest.version})` : '';
	// The implicit section of the `components` shortcut has no name and isn’t counted
	const where = sections > 0 ? ` in ${pluralize(sections, 'section')}` : '';
	return (
		`${manifest.name}${version}: a React component style guide with ` +
		`${pluralize(components, 'component')}${where}, generated by Vite Styleguidist.`
	);
};

const link = (href: string, options: RenderOptions): string =>
	options.baseUrl ? options.baseUrl.replace(/\/?$/, '/') + href : href;

/**
 * llms.txt (https://llmstxt.org): a title, a summary and lists of links, so that an AI
 * tool can pick what to read. The full content lives in llms-full.txt.
 */
export function renderLlmsTxt(manifest: DocsManifest, options: RenderOptions = {}): string {
	const lines: string[] = [`# ${manifest.name}`, '', `> ${summary(manifest)}`, ''];
	lines.push(
		'The style guide is a single-page app; the links below open a component in it. ' +
			'The complete documentation of every component (props, methods, usage examples) ' +
			'is in llms-full.txt, and as JSON in docs.json.',
		''
	);

	lines.push('## Components', '');
	flattenComponents(manifest.sections).forEach(({ component, parents }) => {
		const where = parents
			.map((section) => section.name)
			.filter(Boolean)
			.join(' › ');
		const note = [where, firstLine(component.description)].filter(Boolean).join(' — ');
		const name = component.visibleName || component.name;
		lines.push(`- [${name}](${link(component.href, options)})${note ? `: ${note}` : ''}`);
	});
	lines.push('');

	const pages = flattenSections(manifest.sections).filter(
		(section) => section.name && section.href && (section.content || section.description)
	);
	if (pages.length > 0) {
		lines.push('## Sections', '');
		pages.forEach((section) => {
			const note = firstLine(section.description || section.content || '');
			lines.push(
				`- [${section.name}](${link(section.href as string, options)})${note ? `: ${note}` : ''}`
			);
		});
		lines.push('');
	}

	lines.push(
		'## Full documentation',
		'',
		`- [llms-full.txt](${link(LLMS_FULL_TXT, options)}): every component as Markdown, with props tables and examples`,
		`- [docs.json](${link(DOCS_JSON, options)}): the same documentation as JSON (sections, components, props, methods, examples)`,
		''
	);
	return lines.join('\n');
}

/** A Markdown heading of the given level, capped at 6 like Markdown itself. */
const heading = (level: number, text: string): string =>
	`${'#'.repeat(Math.min(level, 6))} ${text}`;

/**
 * Demote the ATX headings of an embedded Markdown text by `by` levels (capped at 6 like
 * Markdown itself), so that a content page starting with `# Title`, or a description with
 * a `## Usage` heading, nests under its section or component in llms-full.txt instead of
 * restarting the outline. Headings inside fenced code blocks are left alone.
 */
export function shiftHeadings(markdown: string, by: number): string {
	if (by <= 0) {
		return markdown;
	}
	let fence: string | null = null;
	return markdown
		.split('\n')
		.map((line) => {
			const marker = line.match(/^[ \t>]*(`{3,}|~{3,})/);
			if (fence) {
				if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) {
					fence = null;
				}
				return line;
			}
			if (marker) {
				fence = marker[1];
				return line;
			}
			const atx = line.match(/^(#{1,6})(?=\s|$)/);
			return atx ? '#'.repeat(Math.min(6, atx[1].length + by)) + line.slice(atx[1].length) : line;
		})
		.join('\n');
}

/** A table cell: no pipes, no line breaks. */
const cell = (text: string | null | undefined): string =>
	(text || '')
		.replace(/\|/g, '\\|')
		.replace(/\s*\n\s*/g, ' ')
		.trim();

const code = (text: string): string => `\`${text.replace(/`/g, '\\`')}\``;

const renderTags = (tags: ManifestTags): string[] =>
	Object.keys(tags).flatMap((title) =>
		tags[title].map((tag) => {
			const parts = [`@${title}`];
			if (tag.type) {
				parts.push(`{${tag.type}}`);
			}
			if (tag.name) {
				parts.push(tag.name);
			}
			if (tag.description) {
				parts.push(tag.description);
			}
			return `- ${parts.join(' ')}`;
		})
	);

function renderComponent(component: ManifestComponent, level: number): string[] {
	const title =
		component.visibleName && component.visibleName !== component.name
			? `${component.visibleName} (${component.name})`
			: component.name;
	const lines: string[] = [heading(level, title), '', `Source: ${code(component.filePath)}`, ''];
	if (component.description.trim()) {
		lines.push(shiftHeadings(component.description.trim(), level), '');
	}
	const tags = renderTags(component.tags);
	if (tags.length > 0) {
		lines.push(...tags, '');
	}

	if (component.props.length > 0) {
		lines.push(
			heading(level + 1, 'Props'),
			'',
			'| Prop | Type | Required | Default | Description |',
			'| --- | --- | --- | --- | --- |'
		);
		component.props.forEach((prop) => {
			const description = [
				cell(prop.description),
				...renderTags(prop.tags).map((tag) => cell(tag.replace(/^- /, ''))),
			]
				.filter(Boolean)
				.join(' ');
			lines.push(
				`| ${code(prop.name)} | ${cell(prop.type)} | ${prop.required ? 'yes' : 'no'} | ${
					prop.defaultValue === null ? '' : code(cell(prop.defaultValue))
				} | ${description} |`
			);
		});
		lines.push('');
	}

	if (component.methods.length > 0) {
		lines.push(heading(level + 1, 'Methods'), '');
		component.methods.forEach((method) => {
			const params = method.params
				.map((param) => `${param.name}${param.type ? `: ${param.type}` : ''}`)
				.join(', ');
			lines.push(
				`- ${code(`${method.name}(${params})`)}${method.description ? `: ${cell(method.description)}` : ''}`
			);
			method.params
				.filter((param) => param.description)
				.forEach((param) => {
					lines.push(`  - ${code(param.name)}: ${cell(param.description)}`);
				});
			if (method.returns && (method.returns.type || method.returns.description)) {
				lines.push(
					`  - Returns${method.returns.type ? ` ${code(method.returns.type)}` : ''}${
						method.returns.description ? `: ${cell(method.returns.description)}` : ''
					}`
				);
			}
		});
		lines.push('');
	}

	if (component.examples.length > 0 || component.notes.trim()) {
		lines.push(heading(level + 1, 'Examples'), '');
		component.examples.forEach((example) => {
			if (example.description.trim()) {
				lines.push(shiftHeadings(example.description.trim(), level + 1), '');
			}
			lines.push(`\`\`\`${example.lang}`, example.code, '```', '');
		});
		if (component.notes.trim()) {
			lines.push(shiftHeadings(component.notes.trim(), level + 1), '');
		}
	}
	return lines;
}

function renderSection(section: ManifestSection, level: number): string[] {
	const lines: string[] = [];
	// The implicit section of the `components` shortcut has no name: its components
	// are top-level entries, as in the sidebar
	const named = !!section.name;
	if (named) {
		lines.push(heading(level, section.name as string), '');
	}
	// Headings in the section’s own prose nest under its heading (or under the parent’s,
	// for the unnamed section)
	const own = named ? level : level - 1;
	if (section.description) {
		lines.push(shiftHeadings(section.description.trim(), own), '');
	}
	if (section.content && section.content.trim()) {
		lines.push(shiftHeadings(section.content.trim(), own), '');
	}
	const childLevel = named ? level + 1 : level;
	section.components.forEach((component) => {
		lines.push(...renderComponent(component, childLevel));
	});
	section.sections.forEach((child) => {
		lines.push(...renderSection(child, childLevel));
	});
	return lines;
}

/**
 * llms-full.txt: the whole style guide as one Markdown document — every section with its
 * content page, every component with its description, props table, methods and examples.
 */
export function renderLlmsFullTxt(manifest: DocsManifest): string {
	const lines: string[] = [`# ${manifest.name}`, '', `> ${summary(manifest)}`, ''];
	manifest.sections.forEach((section) => {
		lines.push(...renderSection(section, 2));
	});
	return (
		lines
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trimEnd() + '\n'
	);
}

/** docs.json: the manifest, pretty-printed so diffs of a committed file stay readable. */
export const renderDocsJson = (manifest: DocsManifest): string =>
	JSON.stringify(manifest, null, 2) + '\n';

/** One of the three files, by name. */
export function renderMachineReadableFile(
	name: MachineReadableFile,
	manifest: DocsManifest,
	options: RenderOptions = {}
): string {
	switch (name) {
		case DOCS_JSON:
			return renderDocsJson(manifest);
		case LLMS_TXT:
			return renderLlmsTxt(manifest, options);
		case LLMS_FULL_TXT:
			return renderLlmsFullTxt(manifest);
		default:
			throw new Error(`Unknown machine-readable file: ${name}`);
	}
}

export const isMachineReadableFile = (name: string): name is MachineReadableFile =>
	(MACHINE_READABLE_FILES as readonly string[]).includes(name);

/** The MIME type a file is served with in development. */
export const machineReadableContentType = (name: MachineReadableFile): string =>
	name === DOCS_JSON ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8';

/** All three files of a style guide, ready to be written next to index.html. */
export async function renderMachineReadableFiles(
	config: Rsg.SanitizedStyleguidistConfig,
	options: BuildManifestOptions & RenderOptions = {}
): Promise<Record<MachineReadableFile, string>> {
	const manifest = await buildManifest(config, undefined, options);
	return {
		[DOCS_JSON]: renderDocsJson(manifest),
		[LLMS_TXT]: renderLlmsTxt(manifest, options),
		[LLMS_FULL_TXT]: renderLlmsFullTxt(manifest),
	};
}
