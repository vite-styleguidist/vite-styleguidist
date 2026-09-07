/**
 * Parsing components and examples in worker threads (the `parallel` config option).
 *
 * Why this exists: rolldown calls `load` concurrently, but the two expensive things our
 * `load` does are synchronous CPU — react-docgen (a Babel parse plus a handler pass per
 * component) and chunkify (remark plus an acorn parse of every playground). Both run on the
 * main thread, so at 350 components they serialise behind one core while the other eleven
 * idle. Measured on that tree: 2880 ms → 1940 ms (−33%) with four workers, for +400 MB of
 * peak RSS. At 50 components the same four workers are worth 5% for the same +320 MB, which
 * is why `'auto'` has a threshold rather than simply being “on”. See AUTO_THRESHOLD and
 * docs/decisions/0018-parse-cache-and-parallel-parsing.md.
 *
 * What crosses the thread boundary is the hard part. A style guide config is full of
 * functions (`propsParser`, `resolver`, `handlers`, `updateExample`, …) and functions are
 * not structured-cloneable, so a worker cannot be handed the config. Instead the parent
 * sends a **plain** payload — the serialisable options the default paths read — and the
 * worker rebuilds a config from it plus the schema's own defaults. That reconstruction is
 * only faithful when the hooks really are the defaults, which `poolEligibility()` checks
 * per job kind: anything else runs on the main thread and behaves exactly as it does today.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import createLogger from 'glogg';
import configSchema, { defaultGetExampleFilename } from '../scripts/schemas/config.js';
import dirname from '../scripts/utils/dirname.js';
import type { Chunk } from './parseCache.js';
import type * as Rsg from '../typings/index.js';

const logger = createLogger('rsg');

/**
 * `parallel: 'auto'` turns the pool on from this many resolved components.
 *
 * Fitted to the two measured points (49 ms saved at 50 components, 940 ms at 350, median of
 * three): the saving is about `2.97·N − 100` ms, so the pool pays for its own start-up from
 * ~34 components. That break-even is not the threshold, because the pool also costs a few
 * hundred MB of peak RSS whatever N is, and 49 ms is not worth that. 150 is where the model
 * puts the saving at ~345 ms, about a fifth of that build — the point where the win is
 * visible to a person waiting for it, and where the measurement confirms it (see the ADR
 * for the ds150 numbers).
 */
export const AUTO_THRESHOLD = 150;

/**
 * How many workers `'auto'` (and `true`) start: never more than four, and never fewer than
 * two on a machine that has the cores for them.
 *
 * Measured at 350 components (median of three, `/usr/bin/time -l` around the whole build):
 * 2 workers 1730 ms / 1122 MB, 4 workers 1710 ms / 1220 MB, 6 workers 1720 ms / 1394 MB,
 * 8 workers 1970 ms / 1560 MB, 12 workers 2020 ms / 1975 MB, against 2660 ms / 863 MB with
 * no pool. Two, four and six are the same build; past six the workers compete with
 * rolldown's own threads for the same cores and each still costs ~100 MB. Four is the cap
 * an explicit `parallel: true` gets; the default `'auto'` picks it too, because the extra
 * headroom is what larger guides than the harness models will use.
 */
export const MAX_AUTO_WORKERS = 4;
export const MIN_AUTO_WORKERS = 2;

/**
 * How many parses `'auto'` waits for before it starts the pool.
 *
 * A guide can be over AUTO_THRESHOLD and still have almost nothing to parse: with the
 * persistent cache on — the default — a rebuild after editing five components is 345 cache
 * hits and 5 parses. Measured at 350 components: that build is 990 ms and 777 MB with the
 * pool never started, and 1080 ms and 1071 MB when the first miss starts it. The workers
 * cost more than the five parses they take.
 *
 * 25 is where the model puts the crossover: four workers save about three quarters of a
 * ~6 ms parse, so ~4.7 ms each, against ~120 ms of worker start-up. Below it the pool is a
 * loss, above it the loss is noise against what the pool goes on to save (the 25 parses
 * that happen first run on the main thread while the workers are still importing
 * react-docgen, which is time the pool would have spent waiting anyway).
 *
 * Only `'auto'` waits: `parallel: true` and `parallel: <n>` are instructions, not guesses.
 */
export const POOL_START_AFTER_MISSES = 25;

/** The plain-data slice of the config a worker needs to reproduce the default parse. */
export interface WorkerConfigPayload {
	configDir: string;
	defaultExample: string | false;
	context: Record<string, string>;
}

export type JobRequest =
	| { id: number; kind: 'props'; file: string; source: string }
	| {
			id: number;
			kind: 'examples';
			moduleId: string;
			options: Rsg.ExamplesModuleOptions;
			source: string;
	  };

/** A log line a worker produced, replayed on the main thread (see the worker). */
export interface WorkerLog {
	level: 'warn' | 'info' | 'debug';
	message: string;
}

export interface JobResponse {
	id: number;
	ok: boolean;
	/** `{ code, docs }` for props, `{ code, chunks }` for examples. */
	value?: PropsResult | ExamplesResult;
	error?: { message: string; stack?: string };
	logs?: WorkerLog[];
}

export interface PropsResult {
	code: string;
	docs: Rsg.PropsObject;
}

export interface ExamplesResult {
	code: string;
	chunks: Chunk[];
}

/**
 * Which of the two job kinds may run in a worker for this config, and what forced the
 * others onto the main thread.
 *
 * The rule is deliberately conservative: a hook that is not the schema default is a
 * function the worker does not have, so that kind of job stays where the function is.
 * `context` is the one user option the examples path reads that *is* serialisable (a map of
 * names to module requests), so it travels.
 *
 * A module-path `propsParser` is not an exception. It could be imported by each worker, but
 * the parsers people reach for build a TypeScript program — measured at ~1 GB — and four
 * workers would build four of them. It runs on the main thread, where the persistent cache
 * already removes the repeat cost; see the ADR.
 */
export function poolEligibility(config: Rsg.SanitizedStyleguidistConfig): {
	props: boolean;
	examples: boolean;
	/** Option names that force a main-thread parse, in config order. */
	reason: string[];
} {
	const reason: string[] = [];
	const options = config as unknown as Record<string, unknown>;
	const schema = configSchema as unknown as Record<string, { default?: unknown }>;
	const isSchemaDefault = (key: keyof Rsg.SanitizedStyleguidistConfig) =>
		options[key] === schema[key]?.default;

	let props = true;
	const forcesMainThread = (key: string) => {
		props = false;
		reason.push(key);
	};

	// No default in the schema: set at all means custom
	if (config.propsParser !== undefined) {
		forcesMainThread('propsParser');
	}
	if (config.sortProps !== undefined) {
		forcesMainThread('sortProps');
	}
	if (config.updateDocs !== undefined) {
		forcesMainThread('updateDocs');
	}
	// These have schema defaults, so “custom” means “not the default object”
	if (!isSchemaDefault('resolver')) {
		forcesMainThread('resolver');
	}
	if (!isSchemaDefault('handlers')) {
		forcesMainThread('handlers');
	}
	if (config.getExampleFilename !== defaultGetExampleFilename) {
		forcesMainThread('getExampleFilename');
	}

	let examples = true;
	if (!isSchemaDefault('updateExample')) {
		examples = false;
		reason.push('updateExample');
	}

	return { props, examples, reason };
}

/** What `parallel` resolves to for a given style guide. */
export interface ParallelDecision {
	/** Number of workers to run, `0` when parsing stays on the main thread. */
	workers: number;
	/** One line, for the verbose log and the doctor. */
	reason: string;
}

/**
 * Resolve the `parallel` option against the number of components the guide really has.
 *
 * `componentCount` is only known once the styleguide module has been generated, which is
 * always before the first props or examples module is loaded (they are imported *by* it),
 * so the `'auto'` branch is never asked to guess.
 */
export function resolveParallel(
	parallel: Rsg.SanitizedStyleguidistConfig['parallel'],
	componentCount: number
): ParallelDecision {
	if (parallel === false) {
		return { workers: 0, reason: 'parallel is false' };
	}
	if (typeof parallel === 'number') {
		return { workers: parallel, reason: `parallel is ${parallel}` };
	}
	// `true` and `'auto'` share the worker count; only `'auto'` looks at the guide's size
	const workers = Math.max(
		MIN_AUTO_WORKERS,
		Math.min(MAX_AUTO_WORKERS, (os.availableParallelism?.() ?? os.cpus().length) - 1)
	);
	if (parallel === true) {
		return { workers, reason: `parallel is true (${workers} workers)` };
	}
	if (componentCount < AUTO_THRESHOLD) {
		return {
			workers: 0,
			reason: `auto: ${componentCount} components, below the ${AUTO_THRESHOLD} the pool pays off from`,
		};
	}
	return {
		workers,
		reason: `auto: ${componentCount} components, ${workers} workers`,
	};
}

export interface ParsePool {
	/** Run `generatePropsModule()` in a worker. */
	props(file: string, source: string): Promise<PropsResult>;
	/** Run `generateExamplesModule()` in a worker. */
	examples(
		moduleId: string,
		options: Rsg.ExamplesModuleOptions,
		source: string
	): Promise<ExamplesResult>;
	close(): Promise<void>;
	/** False once the pool has been closed or has lost every worker; callers fall back. */
	readonly alive: boolean;
	readonly size: number;
}

/**
 * Absolute path of the worker module.
 *
 * Normally it sits next to this file (`lib/vite/parseWorker.js`). When Styleguidist runs
 * from its TypeScript sources — the unit tests — there is no `.js` sibling, and Node cannot
 * start a worker from a `.ts` file on every supported version, so the compiled copy in
 * `lib/` is used instead. That is the code that ships either way; `npm run compile` before
 * `npm run test:unit` is already the rule of this repository.
 */
export function parseWorkerFile(): string {
	const sibling = path.join(dirname(import.meta.url), 'parseWorker.js');
	if (fs.existsSync(sibling)) {
		return sibling;
	}
	return path.resolve(dirname(import.meta.url), '../../lib/vite/parseWorker.js');
}

interface Pending {
	resolve: (value: PropsResult & ExamplesResult) => void;
	reject: (err: Error) => void;
}

/**
 * Start a pool of `size` workers.
 *
 * The pool is created lazily, on the first parse that the persistent cache could not
 * answer: on a warm build every module is a cache hit and the workers would be pure
 * overhead (measured: +40 ms and +190 MB for nothing). Workers are then spawned all at
 * once, because each has to import react-docgen, remark and Prism before it can do anything
 * (~120 ms) and doing that in parallel is the point.
 */
export interface ParsePoolOptions {
	/**
	 * Worker entry to run instead of ./parseWorker.js. Only for tests — it is how the crash
	 * handling is exercised, by pointing the pool at a worker that dies on start-up.
	 */
	workerFile?: string;
}

export function createParsePool(
	config: Rsg.SanitizedStyleguidistConfig,
	size: number,
	options: ParsePoolOptions = {}
): ParsePool {
	const payload: WorkerConfigPayload = {
		configDir: config.configDir,
		defaultExample: config.defaultExample,
		context: config.context,
	};

	const workerUrl = pathToFileURL(options.workerFile || parseWorkerFile());
	const workers = new Set<Worker>();
	const idle: Worker[] = [];
	const queue: JobRequest[] = [];
	const pending = new Map<number, Pending>();
	let nextId = 1;
	let closed = false;

	const pump = () => {
		while (idle.length > 0 && queue.length > 0) {
			const worker = idle.pop() as Worker;
			const job = queue.shift() as JobRequest;
			worker.postMessage(job);
		}
	};

	/**
	 * A worker died. Its in-flight job is gone with it, and so is any job still queued if it
	 * was the last worker — fail those loudly instead of leaving the build waiting forever.
	 * The pool then reports itself dead and the plugin parses on the main thread again.
	 */
	const onWorkerGone = (worker: Worker, err: Error) => {
		workers.delete(worker);
		const index = idle.indexOf(worker);
		if (index !== -1) {
			idle.splice(index, 1);
		}
		if (workers.size > 0) {
			// Other workers can still take what is queued; only the in-flight job is lost, and
			// there is no way to tell which one it was, so every outstanding job fails
			failAll(err);
			pump();
			return;
		}
		failAll(err);
	};

	const failAll = (err: Error) => {
		for (const [id, entry] of pending) {
			pending.delete(id);
			entry.reject(err);
		}
		queue.length = 0;
	};

	for (let i = 0; i < size; i++) {
		const worker = new Worker(workerUrl, {
			workerData: payload,
			// Keep the worker's stdio attached to the terminal: an unexpected crash inside a
			// dependency prints where a user can see it
			stdout: false,
			stderr: false,
		});
		worker.on('message', (message: JobResponse) => {
			const entry = pending.get(message.id);
			pending.delete(message.id);
			// glogg's emitter lives in the parent process, so a worker collects its lines and
			// the parent prints them — otherwise “Cannot parse Foo.tsx” would vanish
			message.logs?.forEach((line) => logger[line.level](line.message));
			idle.push(worker);
			pump();
			if (!entry) {
				return;
			}
			if (message.ok) {
				entry.resolve(message.value as PropsResult & ExamplesResult);
			} else {
				const err = new Error(message.error?.message || 'A parse worker failed');
				err.stack = message.error?.stack || err.stack;
				entry.reject(err);
			}
		});
		worker.on('error', (err) => {
			logger.debug(`A parse worker crashed: ${err.stack || err.message}`);
			onWorkerGone(
				worker,
				new Error(
					`A parse worker crashed and the modules it was parsing could not be generated: ${err.message}`
				)
			);
		});
		worker.on('exit', (code) => {
			if (closed || !workers.has(worker)) {
				return;
			}
			onWorkerGone(
				worker,
				new Error(`A parse worker exited unexpectedly with code ${code} while parsing`)
			);
		});
		// Deliberately *not* unref()'d: an unref'd worker lets Node exit while a parse is
		// still in flight. The pool is torn down explicitly, at closeBundle and when the dev
		// server closes, which is what lets the process exit.
		workers.add(worker);
		idle.push(worker);
	}

	// `Omit` over a discriminated union collapses to the shared keys, so the job body is
	// spelled out as a union of the two halves instead
	type JobBody =
		| Omit<Extract<JobRequest, { kind: 'props' }>, 'id'>
		| Omit<Extract<JobRequest, { kind: 'examples' }>, 'id'>;
	const submit = (job: JobBody): Promise<PropsResult & ExamplesResult> => {
		if (closed || workers.size === 0) {
			return Promise.reject(new Error('The parse pool is closed'));
		}
		const id = nextId++;
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			queue.push({ ...job, id } as JobRequest);
			pump();
		});
	};

	return {
		size,
		get alive() {
			return !closed && workers.size > 0;
		},
		props: (file, source) => submit({ kind: 'props', file, source }),
		examples: (moduleId, options, source) =>
			submit({ kind: 'examples', moduleId, options, source }),
		async close() {
			if (closed) {
				return;
			}
			closed = true;
			const all = [...workers];
			workers.clear();
			idle.length = 0;
			await Promise.all(all.map((worker) => worker.terminate()));
			failAll(new Error('The parse pool was closed before this module was parsed'));
		},
	};
}
