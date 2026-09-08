import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import glogg from 'glogg';
import getExamples, { clearMdxWarnings, isUsableExampleFile } from '../getExamples.js';
import { defaultGetExampleFilename } from '../../../scripts/schemas/config.js';
import { EXAMPLES_PREFIX, MDX_PREFIX, NULL, parseExamplesId, toPosix } from '../../../vite/ids.js';
import type * as Rsg from '../../../typings/index.js';

const logger = glogg('rsg');

const displayName = 'Pizza';
// The default example is never read from disk by getExamples(), so it needs no fixture
const defaultExample = path.join(path.sep, 'styleguide', 'DefaultExample.md');

// Real temp directory instead of a mocked `fs`: getExamples() only calls `fs.existsSync()`
let dir: string;
let file: string;
let examplesFile: string;
let config: Rsg.SanitizedStyleguidistConfig;

beforeEach(() => {
	// The "please install @mdx-js/mdx" warning is once per file per run
	clearMdxWarnings();
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-getExamples-'));
	file = path.join(dir, 'pizza.js');
	examplesFile = path.join(dir, 'Pizza.md');
	config = {
		configDir: dir,
		getExampleFilename: defaultGetExampleFilename,
	} as unknown as Rsg.SanitizedStyleguidistConfig;
});

afterEach(() => {
	logger.removeAllListeners();
	fs.rmSync(dir, { recursive: true, force: true });
});

// Round-trip the id through the plugin’s parser to check the module options
// without duplicating the id format in the expectations
const parseId = (id: string) => parseExamplesId(NULL + id);

it('should import the examples file if it exists', () => {
	fs.writeFileSync(examplesFile, 'pizza');

	const result = getExamples(config, file, displayName, examplesFile, defaultExample);

	expect(result).toEqual({ __rsgImport: expect.any(String), __rsgDefault: true });
	expect(result?.__rsgImport.startsWith(`${EXAMPLES_PREFIX}file=${toPosix(examplesFile)}&`)).toBe(
		true
	);
	expect(parseId(result?.__rsgImport ?? '')).toEqual({
		file: toPosix(examplesFile),
		displayName,
		componentPath: toPosix(file),
		shouldShowDefaultExample: false,
	});
});

it('should import the default example if the examples file does not exist', () => {
	const result = getExamples(config, file, displayName, examplesFile, defaultExample);

	expect(result?.__rsgDefault).toBe(true);
	expect(parseId(result?.__rsgImport ?? '')).toEqual({
		file: toPosix(defaultExample),
		displayName,
		componentPath: toPosix(file),
		// The default example template contains __COMPONENT__ placeholders to expand
		shouldShowDefaultExample: true,
	});
});

it('should import the default example if the component has no examples file', () => {
	const result = getExamples(config, file, displayName, false, defaultExample);

	expect(result?.__rsgDefault).toBe(true);
	expect(parseId(result?.__rsgImport ?? '')).toEqual({
		file: toPosix(defaultExample),
		displayName,
		componentPath: toPosix(file),
		shouldShowDefaultExample: true,
	});
});

it('should return null if the component has no examples file and no default example', () => {
	expect(getExamples(config, file, displayName)).toBeNull();
	expect(getExamples(config, file, displayName, false, false)).toBeNull();
	// Examples file configured but missing on disk
	expect(getExamples(config, file, displayName, examplesFile)).toBeNull();
});

describe('MDX', () => {
	it('should import an .mdx examples file through the MDX module', () => {
		const mdxFile = path.join(dir, 'Pizza.mdx');
		fs.writeFileSync(mdxFile, '# Pizza');

		const result = getExamples(config, file, displayName, mdxFile, defaultExample);

		expect(result?.__rsgImport.startsWith(`${MDX_PREFIX}file=${toPosix(mdxFile)}&`)).toBe(true);
		expect(parseExamplesId(NULL + (result?.__rsgImport ?? ''))).toEqual({
			file: toPosix(mdxFile),
			displayName,
			componentPath: toPosix(file),
			shouldShowDefaultExample: false,
		});
	});

	it('should warn and skip a discovered .mdx file when @mdx-js/mdx is missing', async () => {
		const mdx = await import('../mdx.js');
		vi.spyOn(mdx, 'isMdxAvailable').mockReturnValue(false);
		const mdxFile = path.join(dir, 'Pizza.mdx');
		fs.writeFileSync(mdxFile, '# Pizza');

		expect(getExamples(config, file, displayName, mdxFile, defaultExample)).toBeNull();
		vi.restoreAllMocks();
	});

	it('should warn once per file when a discovered .mdx file is skipped', async () => {
		const mdx = await import('../mdx.js');
		vi.spyOn(mdx, 'isMdxAvailable').mockReturnValue(false);
		const mdxFile = path.join(dir, 'Pizza.mdx');
		fs.writeFileSync(mdxFile, '# Pizza');
		const warn = vi.fn();
		logger.on('warn', warn);

		// Both entry points see the same file: processComponent asks isUsableExampleFile()
		// whether the component has examples at all, then getExamples() builds the module
		expect(isUsableExampleFile(config, mdxFile)).toBe(false);
		expect(getExamples(config, file, displayName, mdxFile, defaultExample)).toBeNull();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toMatch('@mdx-js/mdx');
		expect(warn.mock.calls[0][0]).toMatch(mdxFile);
		vi.restoreAllMocks();
	});

	// With `skipComponentsWithoutExample` the component never reaches getExamples(): it is
	// filtered out on the isUsableExampleFile() answer alone, so the diagnostic has to
	// happen here or nowhere (C7)
	it('should warn from isUsableExampleFile when the component is about to be skipped', async () => {
		const mdx = await import('../mdx.js');
		vi.spyOn(mdx, 'isMdxAvailable').mockReturnValue(false);
		const mdxFile = path.join(dir, 'Pizza.mdx');
		fs.writeFileSync(mdxFile, '# Pizza');
		const warn = vi.fn();
		logger.on('warn', warn);

		expect(isUsableExampleFile(config, mdxFile)).toBe(false);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toMatch(`npm install --save-dev @mdx-js/mdx`);
		expect(warn.mock.calls[0][0]).toMatch(mdxFile);
		vi.restoreAllMocks();
	});

	it('should throw from isUsableExampleFile for an .mdx file named by a custom getExampleFilename', async () => {
		const mdx = await import('../mdx.js');
		vi.spyOn(mdx, 'isMdxAvailable').mockReturnValue(false);
		const mdxFile = path.join(dir, 'Pizza.mdx');
		fs.writeFileSync(mdxFile, '# Pizza');
		const custom = {
			...config,
			getExampleFilename: () => mdxFile,
		} as unknown as Rsg.SanitizedStyleguidistConfig;

		expect(() => isUsableExampleFile(custom, mdxFile)).toThrow('@mdx-js/mdx');
		vi.restoreAllMocks();
	});

	it('should say a .md examples file and a missing file are usable or not', () => {
		fs.writeFileSync(examplesFile, 'pizza');
		expect(isUsableExampleFile(config, examplesFile)).toBe(true);
		expect(isUsableExampleFile(config, path.join(dir, 'Nope.md'))).toBe(false);
		expect(isUsableExampleFile(config, false)).toBe(false);
	});

	it('should throw for an .mdx file named by a custom getExampleFilename', async () => {
		const mdx = await import('../mdx.js');
		vi.spyOn(mdx, 'isMdxAvailable').mockReturnValue(false);
		const mdxFile = path.join(dir, 'Pizza.mdx');
		fs.writeFileSync(mdxFile, '# Pizza');
		const custom = {
			...config,
			getExampleFilename: () => mdxFile,
		} as unknown as Rsg.SanitizedStyleguidistConfig;

		expect(() => getExamples(custom, file, displayName, mdxFile, defaultExample)).toThrow(
			'@mdx-js/mdx'
		);
		vi.restoreAllMocks();
	});
});
