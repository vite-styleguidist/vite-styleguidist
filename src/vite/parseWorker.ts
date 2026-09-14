/**
 * The worker side of ./parsePool.ts. One of these runs per pool worker.
 *
 * It rebuilds the part of the style guide config that the *default* props and examples
 * pipelines read (see `poolEligibility()`) and then calls the very same generators the main
 * thread would have called, so the module source it sends back is byte-for-byte what a
 * single-threaded run produces. `pool.spec.ts` asserts that on real fixtures, and the
 * performance harness asserts it again on a whole 350-component build (docs.json, llms.txt
 * and every bundle hash).
 *
 * The imports at the top are the reason the pool is started all at once rather than one
 * worker at a time: pulling in react-docgen, remark and Prism costs about as much as
 * parsing a component, and every worker pays it exactly once.
 */
import { parentPort, workerData } from 'node:worker_threads';
import glogg from 'glogg';
import configSchema, { defaultGetExampleFilename } from '../scripts/schemas/config.js';
import generatePropsModule from './modules/props.js';
import generateExamplesModule from './modules/examples.js';
import type { JobRequest, JobResponse, WorkerConfigPayload, WorkerLog } from './parsePool.js';
import type * as Rsg from '../typings/index.js';

const payload = workerData as WorkerConfigPayload;
const schema = configSchema as Record<string, { default?: unknown }>;

/**
 * A config good enough for the default paths: the plain options the parent sent, plus the
 * schema defaults for every function the parent could not send.
 *
 * The pool only sends a job here when those functions really *are* the defaults, so this is
 * the same object the main thread would have used. `propsParser`, `sortProps` and
 * `updateDocs` are deliberately absent — a config that sets any of them never reaches a
 * worker, and leaving them undefined here means a bug in the eligibility check produces
 * default output rather than silently different output.
 */
const config = {
	configDir: payload.configDir,
	defaultExample: payload.defaultExample,
	context: payload.context,
	getExampleFilename: defaultGetExampleFilename,
	handlers: schema.handlers.default,
	resolver: schema.resolver.default,
	updateExample: schema.updateExample.default,
} as unknown as Rsg.SanitizedStyleguidistConfig;

/**
 * glogg dispatches through an emitter that only has listeners in the parent process, so a
 * warning raised in here (“react-docgen could not find a component”, the deprecated
 * `example` fence language) would simply vanish. Every line is collected per job and
 * replayed on the main thread instead.
 *
 * Patching the emitter's own methods works because glogg returns the same object for the
 * same namespace, whichever module asked for it and whenever it asked.
 */
const logs: WorkerLog[] = [];
const emitter = glogg('rsg') as unknown as Record<string, (message: string) => void>;
for (const level of ['warn', 'info', 'debug'] as const) {
	emitter[level] = (message: string) => {
		logs.push({ level, message });
	};
}

parentPort?.on('message', (job: JobRequest) => {
	logs.length = 0;
	const respond = (response: Omit<JobResponse, 'logs'>) =>
		parentPort?.postMessage({ ...response, logs: [...logs] } satisfies JobResponse);
	try {
		const value =
			job.kind === 'props'
				? generatePropsModule(config, job.file, job.source)
				: generateExamplesModule(config, job.options, job.source);
		respond({ id: job.id, ok: true, value });
	} catch (err) {
		respond({
			id: job.id,
			ok: false,
			error: {
				message: err instanceof Error ? err.message : String(err),
				stack: err instanceof Error ? err.stack : undefined,
			},
		});
	}
});
