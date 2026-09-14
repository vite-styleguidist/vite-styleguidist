import path from 'node:path';
import getConfig from '../config.js';
import { CLIENT_CONFIG_OPTIONS } from '../../vite/modules/styleguide.js';

// The `scrollSync` option (ADR 0015); its schema entry lives in schemas/config.ts
const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);

const cwd = process.cwd();
beforeEach(() => {
	process.chdir(testApp('defaults'));
});
afterAll(() => {
	process.chdir(cwd);
});

it('should default scrollSync to selection', () => {
	expect(getConfig({})).toMatchObject({ scrollSync: 'selection' });
});

it.each([false, 'selection', 'hash'])('should accept scrollSync %s', (scrollSync) => {
	expect(getConfig({ scrollSync } as any)).toMatchObject({ scrollSync });
});

it.each([
	// `true` is not an alias: the option has two "on" modes and only one of them writes the URL
	[true, 'true'],
	['always', '"always"'],
])('should reject scrollSync %s', (scrollSync, printed) => {
	expect(() => getConfig({ scrollSync } as any)).toThrow(
		`scrollSync config option must be one of false, "selection", "hash", got ${printed}`
	);
});

it('should reach the browser', () => {
	// The client is where the option is used at all; a missing entry here would make it
	// silently do nothing (see the note at the top of schemas/config.ts)
	expect(CLIENT_CONFIG_OPTIONS).toContain('scrollSync');
});
