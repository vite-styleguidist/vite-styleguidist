import path from 'node:path';
import getConfig from '../config.js';

// The `colorScheme` option (ADR 0011); its schema entry lives in schemas/config.ts
const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);

const cwd = process.cwd();
beforeEach(() => {
	process.chdir(testApp('defaults'));
});
afterAll(() => {
	process.chdir(cwd);
});

it('should default colorScheme to system', () => {
	expect(getConfig({})).toMatchObject({ colorScheme: 'system' });
});

it.each(['light', 'dark'])('should accept colorScheme %s', (colorScheme) => {
	expect(getConfig({ colorScheme } as any)).toMatchObject({ colorScheme });
});

it('should reject an unknown colorScheme', () => {
	expect(() => getConfig({ colorScheme: 'sepia' } as any)).toThrow(
		'colorScheme config option must be one of "system", "light", "dark", got "sepia"'
	);
});
