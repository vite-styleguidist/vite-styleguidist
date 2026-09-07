/**
 * A parse cache that survives the process (the `cache` config option).
 *
 * ./parseCache.ts remembers what *this* run parsed, so a build never parses a file twice.
 * It dies with the process, so the next build — and every dev-server restart — re-runs
 * react-docgen and chunkify over files that have not changed since. On a 350-component
 * design system that re-derivation is the whole of the load hook: ~2.4 s of the 2.9 s
 * build, and 1.9 s of the dev server's start-up.
 *
 * This layer writes those results into Vite's `cacheDir` and reads them back on the next
 * run. Four rules make that safe:
 *
 *  1. entries are keyed by the **content** of the file (sha256), not its mtime, so a branch
 *     switch, a fresh clone or a `git checkout` of an unchanged file still hits;
 *  2. every key lives under a fingerprint of everything else the answer depends on — the
 *     Styleguidist version, the parser's identity, the versions of the packages that do
 *     the parsing, and every config option a parse can read. See PARSE_RELEVANT_OPTIONS
 *     for what that list is, why it is a list rather than the whole config, and the test
 *     that keeps it honest (src/vite/__tests__/parseRelevantOptions.spec.ts);
 *  3. a `propsParser` that is a **function** disables docs caching. Its identity is
 *     unknowable — two runs can pass different closures with the same source — so the only
 *     honest answer is not to cache. The module-path form of the option is cacheable, see
 *     src/loaders/utils/propsParser.ts. Examples caching is unaffected either way;
 *  4. the file existence a parse branched on (the examples file, the file an `@example`
 *     doclet names) is re-checked on every read, because a file that has appeared or
 *     vanished changes the answer without changing any content hash.
 *
 * Failure is never fatal: an unreadable or corrupt cache file is deleted and the run
 * continues as if there had been none, and a cache that cannot be written is a debug line.
 * The worst a bug in here can cost is the time the cache was meant to save.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import createLogger from 'glogg';
import { propsParserIdentity } from '../loaders/utils/propsParser.js';
import dirname from '../scripts/utils/dirname.js';
import type { Chunk } from './parseCache.js';
import type * as Rsg from '../typings/index.js';

const logger = createLogger('rsg');

/**
 * Bumped by hand whenever the shape of what is stored changes. A file with another format
 * is discarded, not migrated: it is a cache.
 */
const FORMAT = 1;

/** Folder created inside Vite's `cacheDir`, and the file inside it. */
export const CACHE_DIR_NAME = 'vite-styleguidist';
export const CACHE_FILE_NAME = 'parse-cache.json';

/**
 * An entry not read or written for this many consecutive runs is dropped. Five is enough
 * to survive a working week of switching between two branches — the case the eviction must
 * not punish — and short enough that a deleted component stops being paid for.
 */
export const MAX_UNUSED_RUNS = 5;

/**
 * Hard cap on the cache file. Measured: 8.7 MB for 350 components with 4–8 examples each,
 * so this is room for roughly ten times the largest design system the harness models, and
 * still small enough that reading it back costs a few tens of milliseconds.
 */
export const MAX_BYTES = 96 * 1024 * 1024;

/**
 * How the dev server's cache is written. A build flushes at `buildEnd`; a dev server never
 * gets there, so it writes on a timer instead.
 *
 * The quiet period coalesces the start-up burst — at 350 components every module is parsed
 * within about a second of each other — and the maximum wait is what makes a *short*
 * session persist anything at all: a plain quiet-period debounce keeps postponing while
 * parses keep arriving, and a server that is killed (Ctrl-C, `kill`, a CI step ending)
 * never runs a shutdown hook, so a flush that has not happened yet is simply lost. Losing
 * it is never wrong — the next run re-parses and writes what is missing — but it is a
 * wasted parse, and a two-second-long dev session is exactly what a benchmark or a smoke
 * test does.
 */
export const FLUSH_QUIET_MS = 750;
export const FLUSH_MAX_WAIT_MS = 2000;

export interface PersistedDocs {
	/** The parsed documentation, for the machine-readable docs (see ./machineReadable.ts). */
	docs: Rsg.PropsObject;
	/** The generated module source — the point of the cache, no parse and no serialization. */
	code: string;
	/** The file an `@example` doclet named (absolute), and whether it existed at parse time. */
	exampleFile: string | null;
	exampleFileExists: boolean;
	/** The run this entry was last used in; see MAX_UNUSED_RUNS. */
	run: number;
}

export interface PersistedExamples {
	chunks: Chunk[];
	code: string;
	run: number;
}

interface CacheFile {
	format: number;
	fingerprint: string;
	/** Number of runs that have opened this cache, the clock the eviction uses. */
	run: number;
	docs: Record<string, PersistedDocs>;
	examples: Record<string, PersistedExamples>;
}

export interface CacheCounters {
	docs: number;
	examples: number;
}

export interface PersistentCache {
	/** `undefined` when the config makes docs caching unsafe (a function `propsParser`). */
	getDocs(key: DocsKeyParts): PersistedDocs | undefined;
	setDocs(key: DocsKeyParts, value: Omit<PersistedDocs, 'run'>): void;
	getExamples(moduleId: string, source: string): PersistedExamples | undefined;
	setExamples(moduleId: string, source: string, value: Omit<PersistedExamples, 'run'>): void;
	/** Write the file if anything changed, evicting first. Safe to call more than once. */
	flush(): void;
	/**
	 * Ask for a flush soon. The dev server never reaches the end of a build, so this is how
	 * its cache is written: FLUSH_QUIET_MS after the last change, and never later than
	 * FLUSH_MAX_WAIT_MS after the first one. Both timers are `unref()`ed, so neither can be
	 * the reason a process stays alive.
	 */
	scheduleFlush(): void;
	/** Absolute path of the cache file, for the log line and the doctor. */
	readonly file: string;
	readonly hits: CacheCounters;
	readonly misses: CacheCounters;
	/** False when a function `propsParser` makes docs caching impossible (rule 3). */
	readonly docsCacheable: boolean;
}

/** Everything a docs entry is keyed and revalidated on. */
export interface DocsKeyParts {
	/** Absolute path of the component. */
	file: string;
	/** Its content. */
	source: string;
	/** What `getExampleFilename()` answered for it, and whether that file exists now. */
	examplesFile: string | false;
	examplesFileExists: boolean;
}

const sha = (input: string | Buffer): string =>
	crypto.createHash('sha256').update(input).digest('hex').slice(0, 32);

/** This package's own version, which every cached answer is implicitly tied to. */
function ownVersion(): string {
	try {
		const file = path.resolve(dirname(import.meta.url), '../../package.json');
		return JSON.parse(fs.readFileSync(file, 'utf8')).version || '?';
	} catch {
		return '?';
	}
}

/**
 * The version of a package as the *project* resolves it, falling back to the copy this
 * package resolves and to `?` when there is none. Resolution order matters: a project that
 * installs its own `@mdx-js/mdx` is the one whose version decides what an `.mdx` page
 * compiles to, and installing or removing one has to invalidate the cache.
 */
function versionOf(name: string, configDir: string): string {
	const anchors = [
		path.join(configDir, 'package.json'),
		path.resolve(dirname(import.meta.url), '../../package.json'),
	];
	for (const anchor of anchors) {
		try {
			return createRequire(anchor)(`${name}/package.json`).version as string;
		} catch {
			// Not resolvable from there, try the next anchor
		}
	}
	return '?';
}

/**
 * The config options a parse result can depend on: every option read by
 * `generatePropsModule`, `getProps`, `getExamples`, `generateExamplesModule`, `chunkify`,
 * `generateMdxModule` and `parseMdx`. Nothing else can change what those produce for a
 * given file — and `parseRelevantOptions.spec.ts` fails if that stops being true, by
 * running every parse against a proxied config and recording which keys it touched.
 *
 * Why an allow-list rather than the whole config: hashing the whole thing sounds safer, and
 * it is safe, but it also folds in `serverPort`, `styleguideDir` and `theme` — so a dev
 * server started on a different port, or a `styleguidist build` after a `styleguidist
 * server`, would throw away a cache whose entries were all still valid. Measured at 350
 * components, that is the difference between a 0.6 s and a 2.3 s dev-server start.
 *
 * The rule for adding to this list: if a new option is read anywhere under
 * `generatePropsModule` / `generateExamplesModule` / `generateMdxModule`, it belongs here.
 */
export const PARSE_RELEVANT_OPTIONS = [
	'configDir',
	'context',
	'defaultExample',
	'getExampleFilename',
	'handlers',
	'mdx',
	'propsParser',
	'resolver',
	'sortProps',
	'updateDocs',
	'updateExample',
] as const;

export type ParseRelevantOption = (typeof PARSE_RELEVANT_OPTIONS)[number];

/**
 * Everything other than a file's own content that a parse result depends on, as one string.
 *
 * Functions are folded in by source text: that is what catches an edited `updateExample` or
 * a swapped resolver, which no version number would. Class instances (a react-docgen
 * resolver) contribute their constructor name plus their own fields, which is the most
 * identity a structural dump can honestly claim.
 */
export function configFingerprint(config: Rsg.SanitizedStyleguidistConfig): string {
	const seen = new WeakSet<object>();
	const serialise = (value: unknown): unknown => {
		if (typeof value === 'function') {
			return `fn:${value.toString()}`;
		}
		if (value && typeof value === 'object') {
			if (seen.has(value as object)) {
				return '[circular]';
			}
			seen.add(value as object);
			if (Array.isArray(value)) {
				return value.map(serialise);
			}
			const proto = Object.getPrototypeOf(value);
			const tag =
				proto && proto.constructor && proto.constructor.name !== 'Object'
					? `${proto.constructor.name}:`
					: '';
			const out: Record<string, unknown> = {};
			for (const key of Object.keys(value as object).sort()) {
				out[key] = serialise((value as Record<string, unknown>)[key]);
			}
			return tag ? { [tag]: out } : out;
		}
		return value;
	};

	const options = config as unknown as Record<string, unknown>;
	const relevant: Record<string, unknown> = {};
	for (const key of PARSE_RELEVANT_OPTIONS) {
		relevant[key] = serialise(options[key]);
	}
	// A module-path parser's own identity, not just the string that names it: the file's
	// content (or its package's version) is what decides what it produces. See
	// propsParserIdentity(). A function parser keeps its `fn:` dump, which is only ever
	// used for the examples half of the cache — docs are not cached for it at all.
	if (typeof config.propsParser === 'string') {
		relevant.propsParser = propsParserIdentity(config.propsParser, config.configDir);
	}

	return sha(
		JSON.stringify({
			format: FORMAT,
			styleguidist: ownVersion(),
			// The packages that do the parsing, as the project resolves them
			reactDocgen: versionOf('react-docgen', config.configDir),
			mdx: versionOf('@mdx-js/mdx', config.configDir),
			// The default remark plugin list is `[remarkGfm]` when it is installed and empty
			// when it is not, so installing or removing it changes what an .mdx page compiles to
			remarkGfm: versionOf('remark-gfm', config.configDir),
			config: relevant,
		})
	);
}

/** Where the cache lives for a given Vite `cacheDir` (`node_modules/.vite` by default). */
export function cacheFilePath(viteCacheDir: string): string {
	return path.join(viteCacheDir, CACHE_DIR_NAME, CACHE_FILE_NAME);
}

/**
 * Open (or start) the persistent cache for one style guide.
 *
 * `viteCacheDir` is Vite's own resolved `cacheDir`, so a project that moves it
 * (`viteConfig.cacheDir`) moves this too, and a wiped `node_modules` or a plain
 * `rm -rf node_modules/.vite` takes this with everything else Vite keeps there. (Vite's own
 * `--force` is *not* one of those: it only clears its dependency optimizer's `deps/`
 * sub-folder. `styleguidist build --no-cache` is the switch for this one.)
 */
export function createPersistentCache(
	config: Rsg.SanitizedStyleguidistConfig,
	viteCacheDir: string
): PersistentCache {
	const dir = path.join(viteCacheDir, CACHE_DIR_NAME);
	const file = path.join(dir, CACHE_FILE_NAME);
	const fingerprint = configFingerprint(config);
	// A function propsParser cannot be identified across processes; see rule 3 in the header.
	const docsCacheable = typeof config.propsParser !== 'function';

	let data: CacheFile = { format: FORMAT, fingerprint, run: 1, docs: {}, examples: {} };
	try {
		const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as CacheFile;
		if (raw && raw.format === FORMAT && raw.fingerprint === fingerprint && raw.docs && raw.examples) {
			data = { ...raw, run: (Number(raw.run) || 0) + 1 };
		} else {
			logger.debug('Parse cache discarded: the style guide config, or a parser, changed');
		}
	} catch (err) {
		if ((err as { code?: string }).code !== 'ENOENT') {
			// A truncated or corrupt file must never be able to fail a build twice: throw it
			// away now rather than parse it again on the next run
			logger.debug(`Parse cache at ${file} is unreadable and was deleted: ${err}`);
			try {
				fs.rmSync(file, { force: true });
			} catch {
				/* nothing else to try */
			}
		}
	}

	const run = data.run;
	let dirty = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let deadline: ReturnType<typeof setTimeout> | undefined;
	const hits: CacheCounters = { docs: 0, examples: 0 };
	const misses: CacheCounters = { docs: 0, examples: 0 };

	// The file path is part of the key as well as its content: the same source under two
	// paths produces different module code (absolute paths are embedded in it). The examples
	// file and whether it exists are in there too, because `getExamples()` branches on both.
	const docsKey = ({ file: file_, source, examplesFile, examplesFileExists }: DocsKeyParts) =>
		sha(`${file_}|${sha(source)}|${examplesFile || ''}|${examplesFileExists ? '1' : '0'}`);
	// Examples are keyed by module id, not by file: the same Markdown file can be rendered
	// for two components with different `displayName`s, and `__COMPONENT__` expands
	// differently in each. The id carries all of that (see ./ids.ts).
	const examplesKey = (moduleId: string, source: string) => sha(`${moduleId}|${sha(source)}`);

	/**
	 * Drop what is not worth keeping: entries no run has touched for a while, and then, if
	 * the file would still be too large, the least recently used ones until it is not.
	 */
	const evict = () => {
		type Row = { kind: 'docs' | 'examples'; key: string; run: number; bytes: number };
		const rows: Row[] = [];
		let total = 0;
		for (const kind of ['docs', 'examples'] as const) {
			for (const [key, entry] of Object.entries(data[kind]) as [
				string,
				PersistedDocs | PersistedExamples,
			][]) {
				if ((Number(entry.run) || 0) <= run - MAX_UNUSED_RUNS) {
					delete data[kind][key];
					continue;
				}
				// Measured once here rather than by re-stringifying the whole file per candidate,
				// which would make eviction quadratic in the number of components
				const bytes = JSON.stringify(entry).length + key.length + 8;
				rows.push({ kind, key, run: Number(entry.run) || 0, bytes });
				total += bytes;
			}
		}
		if (total <= MAX_BYTES) {
			return;
		}
		rows.sort((a, b) => a.run - b.run || b.bytes - a.bytes);
		for (const row of rows) {
			if (total <= MAX_BYTES) {
				break;
			}
			delete (data[row.kind] as Record<string, unknown>)[row.key];
			total -= row.bytes;
		}
		logger.debug(`Parse cache trimmed to ${(total / 1024 / 1024).toFixed(1)} MB`);
	};

	const flush = () => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
		if (deadline) {
			clearTimeout(deadline);
			deadline = undefined;
		}
		if (!dirty) {
			return;
		}
		dirty = false;
		// The pid and a random suffix, not just the pid: two style guides can share a
		// node_modules, and a recycled pid must not be able to collide with a live temporary
		const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
		try {
			evict();
			fs.mkdirSync(dir, { recursive: true });
			// Written through a temporary file and renamed, so a build that is killed
			// mid-write cannot leave half a cache behind for the next one to read
			fs.writeFileSync(tmp, JSON.stringify(data));
			fs.renameSync(tmp, file);
		} catch (err) {
			logger.debug(`Could not write the parse cache: ${err}`);
			try {
				fs.rmSync(tmp, { force: true });
			} catch {
				/* nothing else to try */
			}
		}
	};

	return {
		file,
		hits,
		misses,
		docsCacheable,
		getDocs(key) {
			if (!docsCacheable) {
				return undefined;
			}
			const entry = data.docs[docsKey(key)];
			if (!entry) {
				misses.docs++;
				return undefined;
			}
			// A file an `@example` doclet names that has appeared, or vanished, since the parse
			// changes what getProps() produces without changing the component's own content
			if (
				entry.exampleFile !== null &&
				fs.existsSync(entry.exampleFile) !== entry.exampleFileExists
			) {
				misses.docs++;
				return undefined;
			}
			hits.docs++;
			// Touch it, so the eviction clock treats a cache that is being used as fresh
			if (entry.run !== run) {
				entry.run = run;
				dirty = true;
			}
			return entry;
		},
		setDocs(key, value) {
			if (!docsCacheable) {
				return;
			}
			data.docs[docsKey(key)] = { ...value, run };
			dirty = true;
		},
		getExamples(moduleId, source) {
			const entry = data.examples[examplesKey(moduleId, source)];
			if (!entry) {
				misses.examples++;
				return undefined;
			}
			hits.examples++;
			if (entry.run !== run) {
				entry.run = run;
				dirty = true;
			}
			return entry;
		},
		setExamples(moduleId, source, value) {
			data.examples[examplesKey(moduleId, source)] = { ...value, run };
			dirty = true;
		},
		flush,
		scheduleFlush() {
			// Quiet period: pushed back by every new change…
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(flush, FLUSH_QUIET_MS);
			timer.unref?.();
			// …but never past this deadline, which the first pending change sets and nothing
			// else touches
			if (!deadline) {
				deadline = setTimeout(flush, FLUSH_MAX_WAIT_MS);
				deadline.unref?.();
			}
		},
	};
}

/** The one-line summary printed in verbose mode when a run is over. */
export function cacheSummary(cache: PersistentCache): string {
	const hits = cache.hits.docs + cache.hits.examples;
	const misses = cache.misses.docs + cache.misses.examples;
	const docsNote = cache.docsCacheable
		? ''
		: ' (component docs are not cached: propsParser is a function)';
	return (
		`Parse cache: ${hits} ${hits === 1 ? 'hit' : 'hits'}, ${misses} ${
			misses === 1 ? 'miss' : 'misses'
		} — ${cache.file}${docsNote}`
	);
}
