// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	CACHE_DIR_NAME,
	CACHE_FILE_NAME,
	FLUSH_MAX_WAIT_MS,
	FLUSH_QUIET_MS,
	MAX_UNUSED_RUNS,
	cacheFilePath,
	cacheSummary,
	configFingerprint,
	createPersistentCache,
} from '../persistentCache.js';
import type { DocsKeyParts } from '../persistentCache.js';
import type * as Rsg from '../../typings/index.js';
import configSchema from '../../scripts/schemas/config.js';

const baseConfig = (overrides: Partial<Rsg.SanitizedStyleguidistConfig> = {}) =>
	({
		configDir: '/project',
		context: {},
		defaultExample: false,
		getExampleFilename: configSchema.getExampleFilename.default,
		handlers: configSchema.handlers.default,
		mdx: {},
		resolver: configSchema.resolver.default,
		updateExample: configSchema.updateExample.default,
		...overrides,
	}) as unknown as Rsg.SanitizedStyleguidistConfig;

let dir: string;
beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-cache-'));
});
afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

const docsKey = (overrides: Partial<DocsKeyParts> = {}): DocsKeyParts => ({
	file: '/project/src/Button.js',
	source: 'export default () => null',
	examplesFile: '/project/src/Readme.md',
	examplesFileExists: true,
	...overrides,
});

const docsValue = {
	docs: { displayName: 'Button' } as unknown as Rsg.PropsObject,
	code: 'export default { displayName: "Button" };',
	exampleFile: null,
	exampleFileExists: false,
};

describe('createPersistentCache', () => {
	it('should live in a folder of its own inside Vite’s cacheDir', () => {
		const cache = createPersistentCache(baseConfig(), dir);
		expect(cache.file).toBe(path.join(dir, CACHE_DIR_NAME, CACHE_FILE_NAME));
		expect(cacheFilePath(dir)).toBe(cache.file);
	});

	it('should serve an entry a previous run wrote', () => {
		const first = createPersistentCache(baseConfig(), dir);
		first.setDocs(docsKey(), docsValue);
		first.setExamples('virtual:rsg-examples?file=/project/src/Readme.md&rsg', 'source', {
			chunks: [],
			code: 'export default [];',
		});
		first.flush();

		const second = createPersistentCache(baseConfig(), dir);
		expect(second.getDocs(docsKey())?.code).toBe(docsValue.code);
		expect(
			second.getExamples('virtual:rsg-examples?file=/project/src/Readme.md&rsg', 'source')?.code
		).toBe('export default [];');
		expect(second.hits).toEqual({ docs: 1, examples: 1 });
		expect(second.misses).toEqual({ docs: 0, examples: 0 });
	});

	it('should key entries on the content of the file, not its path alone', () => {
		const first = createPersistentCache(baseConfig(), dir);
		first.setDocs(docsKey(), docsValue);
		first.flush();

		const second = createPersistentCache(baseConfig(), dir);
		expect(second.getDocs(docsKey({ source: 'export default () => 1' }))).toBeUndefined();
		expect(second.misses.docs).toBe(1);
	});

	it('should re-check the examples file, which the component’s own content cannot show', () => {
		const first = createPersistentCache(baseConfig(), dir);
		first.setDocs(docsKey({ examplesFile: false, examplesFileExists: false }), docsValue);
		first.flush();

		// A Readme.md that has appeared since is a different module, same component source
		const second = createPersistentCache(baseConfig(), dir);
		expect(second.getDocs(docsKey())).toBeUndefined();
	});

	it('should re-check a file an @example doclet names', () => {
		const doclet = path.join(dir, 'extra.md');
		const first = createPersistentCache(baseConfig(), dir);
		first.setDocs(docsKey(), { ...docsValue, exampleFile: doclet, exampleFileExists: false });
		first.flush();

		const second = createPersistentCache(baseConfig(), dir);
		expect(second.getDocs(docsKey())).toBeDefined();

		fs.writeFileSync(doclet, '# Extra');
		const third = createPersistentCache(baseConfig(), dir);
		expect(third.getDocs(docsKey())).toBeUndefined();
	});

	it('should discard everything when a parse-relevant option changes', () => {
		const first = createPersistentCache(baseConfig(), dir);
		first.setDocs(docsKey(), docsValue);
		first.flush();

		const changed = createPersistentCache(
			baseConfig({ updateDocs: (docs) => docs }),
			dir
		);
		expect(changed.getDocs(docsKey())).toBeUndefined();
	});

	it('should keep everything when an option no parse reads changes', () => {
		const first = createPersistentCache(baseConfig(), dir);
		first.setDocs(docsKey(), docsValue);
		first.flush();

		// The whole point of the narrow fingerprint: a build after a dev server on another
		// port, or with another theme, still hits
		const other = createPersistentCache(
			baseConfig({ serverPort: 7070, theme: { color: { link: 'red' } } } as never),
			dir
		);
		expect(other.getDocs(docsKey())?.code).toBe(docsValue.code);
	});

	it('should not cache component docs when propsParser is a function', () => {
		const config = baseConfig({ propsParser: () => ({}) as never });
		const cache = createPersistentCache(config, dir);
		expect(cache.docsCacheable).toBe(false);
		cache.setDocs(docsKey(), docsValue);
		cache.flush();

		const second = createPersistentCache(config, dir);
		expect(second.getDocs(docsKey())).toBeUndefined();
		// Examples do not go through the parser, so they are cached as usual
		second.setExamples('id', 'source', { chunks: [], code: 'code' });
		second.flush();
		expect(createPersistentCache(config, dir).getExamples('id', 'source')?.code).toBe('code');
	});

	it('should cache component docs when propsParser is a module path', () => {
		const parser = path.join(dir, 'parser.cjs');
		fs.writeFileSync(parser, 'module.exports = () => ({});\n');
		const config = baseConfig({ propsParser: parser as never, configDir: dir });

		const first = createPersistentCache(config, dir);
		expect(first.docsCacheable).toBe(true);
		first.setDocs(docsKey(), docsValue);
		first.flush();
		expect(createPersistentCache(config, dir).getDocs(docsKey())?.code).toBe(docsValue.code);

		// Editing the parser file changes its identity, so nothing it produced is trusted
		fs.writeFileSync(parser, 'module.exports = () => ({ displayName: "X" });\n');
		expect(createPersistentCache(config, dir).getDocs(docsKey())).toBeUndefined();
	});

	it('should survive a corrupt cache file and delete it', () => {
		const file = cacheFilePath(dir);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, '{"format":1,"docs":{ truncated');

		const cache = createPersistentCache(baseConfig(), dir);
		expect(cache.getDocs(docsKey())).toBeUndefined();
		expect(fs.existsSync(file)).toBe(false);

		// …and the run that found it can still write a good one
		cache.setDocs(docsKey(), docsValue);
		cache.flush();
		expect(createPersistentCache(baseConfig(), dir).getDocs(docsKey())?.code).toBe(docsValue.code);
	});

	it('should leave no temporary files behind', () => {
		const cache = createPersistentCache(baseConfig(), dir);
		cache.setDocs(docsKey(), docsValue);
		cache.flush();
		expect(fs.readdirSync(path.join(dir, CACHE_DIR_NAME))).toEqual([CACHE_FILE_NAME]);
	});

	it('should not rewrite the file when nothing changed', () => {
		const cache = createPersistentCache(baseConfig(), dir);
		cache.setDocs(docsKey(), docsValue);
		cache.flush();
		const first = fs.statSync(cache.file).mtimeMs;
		cache.flush();
		expect(fs.statSync(cache.file).mtimeMs).toBe(first);
	});

	it('should drop entries no recent run has touched', () => {
		let cache = createPersistentCache(baseConfig(), dir);
		cache.setDocs(docsKey(), docsValue);
		cache.setDocs(docsKey({ file: '/project/src/Old.js' }), docsValue);
		cache.flush();

		// Keep reading one of them for enough runs that the other ages out
		for (let i = 0; i < MAX_UNUSED_RUNS; i++) {
			cache = createPersistentCache(baseConfig(), dir);
			expect(cache.getDocs(docsKey())).toBeDefined();
			cache.flush();
		}

		const final = createPersistentCache(baseConfig(), dir);
		expect(final.getDocs(docsKey())).toBeDefined();
		expect(final.getDocs(docsKey({ file: '/project/src/Old.js' }))).toBeUndefined();
	});
});

describe('configFingerprint', () => {
	it('should change when a function option is edited', () => {
		const before = configFingerprint(baseConfig({ sortProps: (props) => props }));
		const after = configFingerprint(baseConfig({ sortProps: (props) => props.slice() }));
		expect(before).not.toBe(after);
	});

	it('should be stable for the same config', () => {
		expect(configFingerprint(baseConfig())).toBe(configFingerprint(baseConfig()));
	});
});

describe('cacheSummary', () => {
	it('should count hits and misses of both kinds', () => {
		const cache = createPersistentCache(baseConfig(), dir);
		cache.setDocs(docsKey(), docsValue);
		cache.getDocs(docsKey());
		cache.getExamples('id', 'source');
		expect(cacheSummary(cache)).toContain('Parse cache: 1 hit, 1 miss');
		expect(cacheSummary(cache)).toContain(cache.file);
	});

	it('should say when a function propsParser keeps docs out of the cache', () => {
		const cache = createPersistentCache(baseConfig({ propsParser: () => ({}) as never }), dir);
		expect(cacheSummary(cache)).toContain('propsParser is a function');
	});
});

describe('scheduleFlush', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('should write after a quiet period', () => {
		const cache = createPersistentCache(baseConfig(), dir);
		cache.setDocs(docsKey(), docsValue);
		cache.scheduleFlush();
		vi.advanceTimersByTime(FLUSH_QUIET_MS - 1);
		expect(fs.existsSync(cache.file)).toBe(false);
		vi.advanceTimersByTime(1);
		expect(fs.existsSync(cache.file)).toBe(true);
	});

	it('should write within the maximum wait even while changes keep arriving', () => {
		// The start-up burst of a dev server: a parse every few hundred milliseconds keeps
		// pushing the quiet period back, and a server killed before the first write would
		// have persisted nothing
		const cache = createPersistentCache(baseConfig(), dir);
		for (let elapsed = 0; elapsed < FLUSH_MAX_WAIT_MS; elapsed += 500) {
			cache.setDocs(docsKey({ file: `/project/src/C${elapsed}.js` }), docsValue);
			cache.scheduleFlush();
			vi.advanceTimersByTime(500);
		}
		expect(fs.existsSync(cache.file)).toBe(true);
	});

	it('should not keep the process alive', () => {
		const cache = createPersistentCache(baseConfig(), dir);
		cache.setDocs(docsKey(), docsValue);
		cache.scheduleFlush();
		// An unref()'d timer is not counted by the loop that keeps Node running
		expect(vi.getTimerCount()).toBeGreaterThan(0);
		cache.flush();
		expect(vi.getTimerCount()).toBe(0);
	});
});
