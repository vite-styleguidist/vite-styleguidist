import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import getExamples from '../getExamples.js';
import { EXAMPLES_PREFIX, NULL, parseExamplesId, toPosix } from '../../../vite/ids.js';

const displayName = 'Pizza';
// The default example is never read from disk by getExamples(), so it needs no fixture
const defaultExample = path.join(path.sep, 'styleguide', 'DefaultExample.md');

// Real temp directory instead of a mocked `fs`: getExamples() only calls `fs.existsSync()`
let dir: string;
let file: string;
let examplesFile: string;

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-getExamples-'));
	file = path.join(dir, 'pizza.js');
	examplesFile = path.join(dir, 'Pizza.md');
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

// Round-trip the id through the plugin’s parser to check the module options
// without duplicating the id format in the expectations
const parseId = (id: string) => parseExamplesId(NULL + id);

it('should import the examples file if it exists', () => {
	fs.writeFileSync(examplesFile, 'pizza');

	const result = getExamples(file, displayName, examplesFile, defaultExample);

	expect(result).toEqual({ __rsgImport: expect.any(String), __rsgDefault: true });
	expect(result?.__rsgImport.startsWith(`${EXAMPLES_PREFIX}${toPosix(examplesFile)}?`)).toBe(true);
	expect(parseId(result?.__rsgImport ?? '')).toEqual({
		file: toPosix(examplesFile),
		displayName,
		componentPath: toPosix(file),
		shouldShowDefaultExample: false,
	});
});

it('should import the default example if the examples file does not exist', () => {
	const result = getExamples(file, displayName, examplesFile, defaultExample);

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
	const result = getExamples(file, displayName, false, defaultExample);

	expect(result?.__rsgDefault).toBe(true);
	expect(parseId(result?.__rsgImport ?? '')).toEqual({
		file: toPosix(defaultExample),
		displayName,
		componentPath: toPosix(file),
		shouldShowDefaultExample: true,
	});
});

it('should return null if the component has no examples file and no default example', () => {
	expect(getExamples(file, displayName)).toBeNull();
	expect(getExamples(file, displayName, false, false)).toBeNull();
	// Examples file configured but missing on disk
	expect(getExamples(file, displayName, examplesFile)).toBeNull();
});
