// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getConfig from '../../scripts/config.js';
import configSchema from '../../scripts/schemas/config.js';
import generatePropsModule from '../modules/props.js';
import generateExamplesModule from '../modules/examples.js';
import {
	AUTO_THRESHOLD,
	createParsePool,
	parseWorkerFile,
	poolEligibility,
	resolveParallel,
} from '../parsePool.js';
import type * as Rsg from '../../typings/index.js';

const testDir = path.resolve(import.meta.dirname, '../../../test');
const component = (name: string) => path.join(testDir, 'components', name);

const cwd = process.cwd();
let config: Rsg.SanitizedStyleguidistConfig;
beforeAll(() => {
	process.chdir(testDir);
	config = getConfig({ components: 'components/**/[A-Z]*.js' });
});
afterAll(() => {
	process.chdir(cwd);
});

describe('resolveParallel', () => {
	it('should keep every parse on the main thread for false', () => {
		expect(resolveParallel(false, 1000)).toEqual({ workers: 0, reason: 'parallel is false' });
	});

	it('should use the number it is given, whatever the guide’s size', () => {
		expect(resolveParallel(3, 1).workers).toBe(3);
		expect(resolveParallel(1, 10000).workers).toBe(1);
	});

	it('should start the pool for true even in a small guide', () => {
		const decision = resolveParallel(true, 1);
		expect(decision.workers).toBeGreaterThanOrEqual(1);
		expect(decision.reason).toContain('true');
	});

	it('should stay off below the auto threshold', () => {
		const decision = resolveParallel('auto', AUTO_THRESHOLD - 1);
		expect(decision.workers).toBe(0);
		expect(decision.reason).toContain(String(AUTO_THRESHOLD));
	});

	it('should start two to four workers from the auto threshold up', () => {
		const decision = resolveParallel('auto', AUTO_THRESHOLD);
		expect(decision.workers).toBeGreaterThanOrEqual(2);
		expect(decision.workers).toBeLessThanOrEqual(4);
		expect(decision.reason).toContain(`${AUTO_THRESHOLD} components`);
	});
});

describe('poolEligibility', () => {
	it('should send both kinds of parse to a worker with a default config', () => {
		expect(poolEligibility(config)).toEqual({ props: true, examples: true, reason: [] });
	});

	it.each([
		['propsParser', { propsParser: (() => ({})) as never }],
		['sortProps', { sortProps: ((props: unknown[]) => props) as never }],
		['updateDocs', { updateDocs: ((docs: unknown) => docs) as never }],
		['resolver', { resolver: {} as never }],
		['handlers', { handlers: (() => []) as never }],
		['getExampleFilename', { getExampleFilename: (() => false) as never }],
	])('should keep component docs on the main thread for a custom %s', (option, overrides) => {
		const eligible = poolEligibility({ ...config, ...overrides });
		expect(eligible.props).toBe(false);
		// Examples do not read any of these, so they still go to a worker
		expect(eligible.examples).toBe(true);
		expect(eligible.reason).toContain(option);
	});

	it('should keep examples on the main thread for a custom updateExample', () => {
		const eligible = poolEligibility({ ...config, updateExample: (props) => props });
		expect(eligible.examples).toBe(false);
		expect(eligible.props).toBe(true);
		expect(eligible.reason).toEqual(['updateExample']);
	});

	it('should treat a module-path propsParser as main-thread too', () => {
		// It could be imported by every worker, but the parsers people use build a TypeScript
		// program each; see the ADR
		const eligible = poolEligibility({ ...config, propsParser: '/some/parser.js' as never });
		expect(eligible.props).toBe(false);
	});
});

describe('the worker pool', () => {
	/**
	 * The examples module imports two browser helpers by absolute path, and the main thread
	 * resolves them inside `src/` here (Styleguidist is running from its sources) while the
	 * worker, which Node can only start from compiled JavaScript, resolves them inside
	 * `lib/`. In a real run both are `lib/`. Everything else must match byte for byte.
	 */
	const normalize = (code: string) =>
		code.replace(/\/(?:src|lib)\/loaders\/utils\/client\/(\w+)\.[tj]s/g, '/client/$1');

	it('should have a compiled worker to run', () => {
		expect(fs.existsSync(parseWorkerFile())).toBe(true);
	});

	it('should produce exactly what the main thread produces', async () => {
		const pool = createParsePool(config, 2);
		try {
			for (const name of ['Button/Button.js', 'Placeholder/Placeholder.js', 'Price/Price.js']) {
				const file = component(name);
				const source = fs.readFileSync(file, 'utf8');
				const fromWorker = await pool.props(file, source);
				const fromMainThread = generatePropsModule(config, file, source);
				expect(fromWorker.code).toBe(fromMainThread.code);
				expect(fromWorker.docs).toEqual(fromMainThread.docs);
			}

			const file = component('Button/Readme.md');
			const source = fs.readFileSync(file, 'utf8');
			const options = {
				file,
				displayName: 'Button',
				componentPath: component('Button/Button.js'),
			};
			const fromWorker = await pool.examples('id', options, source);
			const fromMainThread = generateExamplesModule(config, options, source);
			expect(normalize(fromWorker.code)).toBe(normalize(fromMainThread.code));
			expect(fromWorker.chunks).toEqual(fromMainThread.chunks);
		} finally {
			await pool.close();
		}
	});

	it('should parse several files at once', async () => {
		const pool = createParsePool(config, 2);
		try {
			const files = ['Button/Button.js', 'Price/Price.js', 'Annotation/Annotation.js'].map(
				component
			);
			const results = await Promise.all(
				files.map((file) => pool.props(file, fs.readFileSync(file, 'utf8')))
			);
			expect(results.map((result) => result.docs.displayName)).toEqual([
				'Button',
				'Price',
				'Annotation',
			]);
		} finally {
			await pool.close();
		}
	});

	it('should replay a warning raised inside a worker', async () => {
		const warn = vi.fn();
		const logger = (await import('glogg')).default('rsg');
		logger.on('warn', warn);
		const pool = createParsePool(config, 1);
		try {
			// “Cannot parse <file>” is the warning users see most often — and it must not be
			// swallowed just because react-docgen ran off-thread
			await pool.props(component('Placeholder/Placeholder.json'), '{"a": 1}');
			expect(warn).toHaveBeenCalledWith(
				expect.stringContaining('Cannot parse components/Placeholder/Placeholder.json')
			);
		} finally {
			(logger as unknown as { off?: (event: string, fn: unknown) => void }).off?.('warn', warn);
			await pool.close();
		}
	});

	it('should reject, not hang, when a worker dies', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-worker-'));
		const suicidal = path.join(dir, 'worker.js');
		fs.writeFileSync(suicidal, 'process.exit(3);\n');
		const pool = createParsePool(config, 1, { workerFile: suicidal });
		try {
			await expect(pool.props('/a.js', 'x')).rejects.toThrow(/parse worker/i);
			expect(pool.alive).toBe(false);
		} finally {
			await pool.close();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('should reject the jobs still in flight when it is closed', async () => {
		const pool = createParsePool(config, 1);
		const file = component('Button/Button.js');
		const inFlight = pool.props(file, fs.readFileSync(file, 'utf8'));
		const rejected = expect(inFlight).rejects.toThrow(/closed/);
		await pool.close();
		await rejected;
		await expect(pool.props(file, 'x')).rejects.toThrow(/closed/);
		expect(pool.alive).toBe(false);
	});
});

describe('the worker’s reconstructed config', () => {
	it('should be built from the schema defaults the eligibility check guarantees', () => {
		// A worker cannot be handed a function, so it rebuilds these from the schema. If a
		// default ever stops being a value the worker can read, this is where it shows.
		for (const key of ['handlers', 'resolver', 'updateExample'] as const) {
			expect((configSchema as Record<string, { default?: unknown }>)[key].default).toBeDefined();
		}
	});
});
