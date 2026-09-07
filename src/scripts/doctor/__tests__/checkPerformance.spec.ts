// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import checkPerformance, { componentCountOf, viteCacheDir } from '../checkPerformance.js';
import { CACHE_DIR_NAME, CACHE_FILE_NAME } from '../../../vite/persistentCache.js';
import { AUTO_THRESHOLD } from '../../../vite/parsePool.js';
import type { DoctorFinding } from '../types.js';
import type * as Rsg from '../../../typings/index.js';

const config = (overrides: Partial<Rsg.SanitizedStyleguidistConfig> = {}) =>
	overrides as Partial<Rsg.SanitizedStyleguidistConfig>;
const find = (findings: DoctorFinding[], id: string) =>
	findings.find((finding) => finding.id === id) as DoctorFinding;

let dir: string;
beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-doctor-perf-'));
});
afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('viteCacheDir', () => {
	it('should default to Vite’s own node_modules/.vite', () => {
		expect(viteCacheDir(config(), '/project')).toBe(path.join('/project', 'node_modules', '.vite'));
	});

	it('should follow a cacheDir set in the viteConfig option', () => {
		expect(viteCacheDir(config({ viteConfig: { cacheDir: '.cache' } }), '/project')).toBe(
			path.join('/project', '.cache')
		);
	});

	it('should ignore a viteConfig function, which the doctor never runs', () => {
		expect(viteCacheDir(config({ viteConfig: () => ({ cacheDir: '.cache' }) }), '/project')).toBe(
			path.join('/project', 'node_modules', '.vite')
		);
	});
});

describe('componentCountOf', () => {
	it('should read the count checkProject already resolved', () => {
		expect(
			componentCountOf([
				{ id: 'project.components', level: 'info', title: '', meta: { count: 42 } },
			])
		).toBe(42);
	});

	it('should be undefined when that check did not run', () => {
		expect(componentCountOf([])).toBeUndefined();
	});
});

describe('the cache finding', () => {
	it('should say where the cache lives and that nothing is in it yet', () => {
		const finding = find(checkPerformance(config(), dir), 'perf.cache');
		expect(finding.level).toBe('info');
		expect(finding.title).toBe('Parse cache: on, nothing cached yet');
		expect(finding.detail).toContain(path.join(CACHE_DIR_NAME, CACHE_FILE_NAME));
		expect(finding.meta).toMatchObject({ enabled: true, bytes: 0, docsCacheable: true });
	});

	it('should report the size of a cache that exists', () => {
		const file = path.join(dir, 'node_modules', '.vite', CACHE_DIR_NAME, CACHE_FILE_NAME);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, 'x'.repeat(2 * 1024 * 1024));
		const finding = find(checkPerformance(config(), dir), 'perf.cache');
		expect(finding.title).toBe('Parse cache: 2.0 MB written');
		expect(finding.fix).toContain('--no-cache');
	});

	it('should report a small cache in kB rather than as 0.0 MB', () => {
		const file = path.join(dir, 'node_modules', '.vite', CACHE_DIR_NAME, CACHE_FILE_NAME);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, 'x'.repeat(30 * 1024));
		expect(find(checkPerformance(config(), dir), 'perf.cache').title).toBe(
			'Parse cache: 30 kB written'
		);
	});

	it('should say when the option is off', () => {
		const finding = find(checkPerformance(config({ cache: false }), dir), 'perf.cache');
		expect(finding.title).toBe('Parse cache: off');
		expect(finding.meta).toMatchObject({ enabled: false });
	});

	it('should explain that a function propsParser keeps docs out of the cache', () => {
		const finding = find(
			checkPerformance(config({ propsParser: (() => ({})) as never }), dir),
			'perf.cache'
		);
		expect(finding.detail).toContain('propsParser is a function');
		expect(finding.fix).toContain('module');
		expect(finding.meta).toMatchObject({ docsCacheable: false });
	});
});

describe('the parallel finding', () => {
	it('should say what auto decided for a small guide', () => {
		const finding = find(checkPerformance(config(), dir, 10), 'perf.parallel');
		expect(finding.level).toBe('info');
		expect(finding.title).toContain('off');
		expect(finding.detail).toContain(String(AUTO_THRESHOLD));
	});

	it('should say how many workers a large guide gets', () => {
		const finding = find(checkPerformance(config(), dir, AUTO_THRESHOLD), 'perf.parallel');
		expect(finding.title).toMatch(/Parallel parsing: \d workers/);
		expect(finding.meta).toMatchObject({ parallel: 'auto', componentCount: AUTO_THRESHOLD });
	});

	it('should not pretend to know when the component count is unavailable', () => {
		const finding = find(checkPerformance(config(), dir), 'perf.parallel');
		expect(finding.title).toContain('decided from the number of components');
	});

	it('should name the option that keeps component docs on the main thread', () => {
		const finding = find(
			checkPerformance(config({ sortProps: ((props: never) => props) as never }), dir, 500),
			'perf.parallel'
		);
		expect(finding.detail).toContain('sortProps');
		expect(finding.meta).toMatchObject({ eligibleProps: false, eligibleExamples: true });
	});

	it('should say when nothing at all can run in a worker', () => {
		const finding = find(
			checkPerformance(
				config({
					sortProps: ((props: never) => props) as never,
					updateExample: ((props: never) => props) as never,
				}),
				dir,
				500
			),
			'perf.parallel'
		);
		expect(finding.title).toContain('off');
		expect(finding.detail).toContain('Nothing can run in a worker');
	});

	it('should report an explicit worker count', () => {
		const finding = find(checkPerformance(config({ parallel: 2 }), dir, 3), 'perf.parallel');
		expect(finding.title).toBe('Parallel parsing: 2 workers');
	});
});
