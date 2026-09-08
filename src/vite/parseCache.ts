/**
 * The parse of record for one style guide run.
 *
 * Every source of a style guide is read by two consumers: the virtual modules the browser
 * imports (src/vite/modules/*) and the machine-readable docs (src/vite/machineReadable.ts).
 * Without a cache both parse it, so a build ran react-docgen twice per component and
 * chunkify twice per Markdown page — the same answer, at twice the price, and in the dev
 * server the first `/docs.json` request re-parsed a guide the module graph had just parsed.
 *
 * So the module generators write what they parsed here, keyed by file path and invalidated
 * by mtime + size, and the manifest builder reads it. The key is what makes this safe in
 * development: an entry survives only as long as the file it came from is untouched, and a
 * consumer that finds a stale key parses again exactly as it did before.
 *
 * The cache is created per plugin instance, so it lives as long as one build or one dev
 * server and never leaks between them. What it holds is bounded by the number of
 * components and Markdown pages (a parsed props object, a list of Markdown chunks), not by
 * anything per-request.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { MdxChunk } from '../loaders/utils/mdx.js';
import type * as Rsg from '../typings/index.js';

/**
 * A chunk of an examples file: prose (`markdown`) or a playground (`code`). Code chunks of
 * an MDX page carry the playground ordinal, see MdxChunk.
 */
export type Chunk = MdxChunk;

/** The part of a file’s stat that tells whether it changed since the last parse. */
export const fileKey = (file: string): string => {
	const stat = fs.statSync(file);
	return `${stat.mtimeMs}:${stat.size}`;
};

export interface CachedDocs {
	key: string;
	docs: Rsg.PropsObject;
	/** The file an `@example` doclet points at (absolute), and whether it existed at parse time. */
	exampleFile: string | null;
	exampleFileExists: boolean;
}

export interface CachedExamples {
	key: string;
	chunks: Chunk[];
}

export interface ParseCache {
	docs: Map<string, CachedDocs>;
	examples: Map<string, CachedExamples>;
}

export const createParseCache = (): ParseCache => ({ docs: new Map(), examples: new Map() });

/**
 * The file an `@example` doclet points at, resolved like getProps() resolves it (relative
 * to the component), or `null` when the component has no such doclet.
 */
export const exampleDocletFile = (file: string, docs: Rsg.PropsObject): string | null => {
	const doclet = docs.doclets?.example;
	return typeof doclet === 'string' && doclet.trim()
		? path.resolve(path.dirname(file), doclet.trim())
		: null;
};

/**
 * Component docs also depend on whether the examples file exists (see getExamples()) and on
 * whether the file an `@example` doclet names exists (see getProps()), so a Readme.md or an
 * examples file that appears later must invalidate the entry as well as an edit does.
 */
const docsKey = (config: Rsg.SanitizedStyleguidistConfig, file: string): string =>
	`${fileKey(file)}|${config.getExampleFilename(file) || ''}`;

/** The docs of a component if they were parsed from exactly this file, as it is now. */
export function getCachedDocs(
	cache: ParseCache | undefined,
	config: Rsg.SanitizedStyleguidistConfig,
	file: string
): Rsg.PropsObject | undefined {
	const cached = cache?.docs.get(file);
	if (!cached || cached.key !== docsKey(config, file)) {
		return undefined;
	}
	// A doclet file that has appeared (or vanished) since changes what getProps() produces
	if (
		cached.exampleFile !== null &&
		fs.existsSync(cached.exampleFile) !== cached.exampleFileExists
	) {
		return undefined;
	}
	return cached.docs;
}

/** Remember the docs a props module was generated from. */
export function setCachedDocs(
	cache: ParseCache | undefined,
	config: Rsg.SanitizedStyleguidistConfig,
	file: string,
	docs: Rsg.PropsObject
): void {
	if (!cache) {
		return;
	}
	const exampleFile = exampleDocletFile(file, docs);
	cache.docs.set(file, {
		key: docsKey(config, file),
		docs,
		exampleFile,
		exampleFileExists: exampleFile !== null && fs.existsSync(exampleFile),
	});
}

/**
 * Examples are keyed by the module id (`virtual:rsg-examples?file=…&displayName=…&rsg`) rather than by
 * the file, because the same Markdown file can be rendered for two components with
 * different `displayName`s and `__COMPONENT__` expands differently in each.
 */
const examplesKey = (moduleId: string, file: string): string => `${fileKey(file)}|${moduleId}`;

/** The chunks of an examples module if they were parsed from exactly this file, as it is now. */
export function getCachedExamples(
	cache: ParseCache | undefined,
	moduleId: string,
	file: string
): Chunk[] | undefined {
	const cached = cache?.examples.get(moduleId);
	return cached && cached.key === examplesKey(moduleId, file) ? cached.chunks : undefined;
}

/** Remember the chunks an examples (or MDX) module was generated from. */
export function setCachedExamples(
	cache: ParseCache | undefined,
	moduleId: string,
	file: string,
	chunks: Chunk[]
): void {
	cache?.examples.set(moduleId, { key: examplesKey(moduleId, file), chunks });
}
