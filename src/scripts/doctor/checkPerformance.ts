/**
 * What the two performance options (`cache` and `parallel`) will actually do for this
 * project, reported as info findings.
 *
 * Both options decide things at run time — where Vite put its cache directory, how many
 * components the globs really resolved, whether a config hook forces a main-thread parse —
 * and none of that is visible from the config file. The doctor is where a maintainer can
 * see it without starting a build, and it is the first place to look when “why is my build
 * still slow” turns out to be “a custom `sortProps` keeps every parse on the main thread”.
 *
 * Everything here is `info`: an option that is off, or a cache that has not been written
 * yet, is not a problem, and the doctor's exit code must not turn on how fast a build is.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CACHE_DIR_NAME, CACHE_FILE_NAME } from '../../vite/persistentCache.js';
import { poolEligibility, resolveParallel } from '../../vite/parsePool.js';
import configSchema from '../schemas/config.js';
import * as consts from '../consts.js';
import { plural } from './text.js';
import type { DoctorFinding } from './types.js';
import type * as Rsg from '../../typings/index.js';

/**
 * Vite's `cacheDir` for this project, the way Vite itself resolves it: the `cacheDir` of the
 * user's Vite config when there is one, otherwise `node_modules/.vite` next to the project.
 *
 * Only the `viteConfig` *option* is read. A `vite.config.js` file is not loaded — the doctor
 * runs no user code — so a project that moves its cache there gets the default location
 * reported. The finding says the directory follows Vite's, which is the durable statement.
 */
export function viteCacheDir(
	config: Partial<Rsg.SanitizedStyleguidistConfig>,
	configDir: string
): string {
	const viteConfig = config.viteConfig;
	const configured =
		viteConfig && typeof viteConfig === 'object' && typeof viteConfig.cacheDir === 'string'
			? viteConfig.cacheDir
			: undefined;
	return configured
		? path.resolve(configDir, configured)
		: path.join(configDir, 'node_modules', '.vite');
}

/**
 * How many components `checkProject` resolved, read back from the finding it already
 * emitted rather than running every component glob a second time. `undefined` when that
 * check did not run or failed, in which case the `parallel: 'auto'` line says what it
 * depends on instead of pretending to know the answer.
 */
export function componentCountOf(findings: DoctorFinding[]): number | undefined {
	const found = findings.find((finding) => finding.id === 'project.components');
	const count = found?.meta?.count;
	return typeof count === 'number' ? count : undefined;
}

export default function checkPerformance(
	config: Partial<Rsg.SanitizedStyleguidistConfig>,
	configDir: string,
	componentCount?: number
): DoctorFinding[] {
	const findings: DoctorFinding[] = [];

	// `cache`
	const cacheEnabled = config.cache !== false;
	const dir = path.join(viteCacheDir(config, configDir), CACHE_DIR_NAME);
	const file = path.join(dir, CACHE_FILE_NAME);
	const stat = (() => {
		try {
			return fs.statSync(file);
		} catch {
			return undefined;
		}
	})();
	const parserIsFunction = typeof config.propsParser === 'function';

	findings.push({
		id: 'perf.cache',
		level: 'info',
		title: cacheEnabled
			? stat
				? `Parse cache: ${(stat.size / 1024 / 1024).toFixed(1)} MB written`
				: 'Parse cache: on, nothing cached yet'
			: 'Parse cache: off',
		detail: cacheEnabled
			? [
					file,
					parserIsFunction
						? 'Component docs are not cached: propsParser is a function, which has no identity across runs. Point the option at a module instead to cache them.'
						: undefined,
				]
					.filter(Boolean)
					.join('\n')
			: 'The cache option is false, so every run re-parses every component and every examples file.',
		fix: cacheEnabled
			? parserIsFunction
				? 'Move the parser into its own module and set propsParser to its path.'
				: `Delete ${dir} to clear it; styleguidist build --no-cache skips it for one run.`
			: undefined,
		docs: `${consts.DOCS_CONFIG}#cache`,
		file: cacheEnabled ? file : undefined,
		meta: {
			enabled: cacheEnabled,
			file,
			bytes: stat?.size ?? 0,
			docsCacheable: !parserIsFunction,
		},
	});

	// `parallel`
	const parallel = (config.parallel ?? 'auto') as Rsg.SanitizedStyleguidistConfig['parallel'];
	// poolEligibility() compares four options against their schema defaults, and a config
	// whose validation failed may not have them — an *absent* option would then read as a
	// custom one and the doctor would blame a hook the user never wrote. Fill them in first,
	// so this answers for the run the user is actually going to get.
	const withDefaults = { ...config } as Record<string, unknown>;
	for (const key of ['resolver', 'handlers', 'getExampleFilename', 'updateExample'] as const) {
		if (withDefaults[key] === undefined) {
			withDefaults[key] = configSchema[key].default;
		}
	}
	const eligible = poolEligibility(withDefaults as unknown as Rsg.SanitizedStyleguidistConfig);
	const decision =
		parallel === 'auto' && componentCount === undefined
			? undefined
			: resolveParallel(parallel, componentCount ?? 0);
	const anythingEligible = eligible.props || eligible.examples;

	findings.push({
		id: 'perf.parallel',
		level: 'info',
		title: !decision
			? 'Parallel parsing: auto, decided from the number of components'
			: decision.workers === 0 || !anythingEligible
				? 'Parallel parsing: off, every parse runs on the main thread'
				: `Parallel parsing: ${plural(decision.workers, 'worker')}`,
		detail: [
			decision ? decision.reason : undefined,
			!anythingEligible && eligible.reason.length > 0
				? `Nothing can run in a worker: ${eligible.reason.join(', ')} ${
						eligible.reason.length === 1 ? 'is' : 'are'
					} set, and a worker cannot be given a function.`
				: eligible.reason.length > 0
					? `On the main thread whatever this option says: ${eligible.reason.join(', ')} (component docs use ${
							eligible.props ? 'workers' : 'the main thread'
						}, examples use ${eligible.examples ? 'workers' : 'the main thread'}).`
					: undefined,
		]
			.filter(Boolean)
			.join('\n'),
		docs: `${consts.DOCS_CONFIG}#parallel`,
		meta: {
			parallel,
			workers: decision?.workers,
			componentCount,
			eligibleProps: eligible.props,
			eligibleExamples: eligible.examples,
			mainThreadReasons: eligible.reason,
		},
	});

	return findings;
}
