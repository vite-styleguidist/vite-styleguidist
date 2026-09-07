import path from 'node:path';
import getConfig from '../config.js';
import { CLIENT_CONFIG_OPTIONS } from '../../vite/modules/styleguide.js';

// The `pageNav` option (ADR 0016); its schema entry lives in schemas/config.ts
const testApp = (name: string) => path.resolve(import.meta.dirname, '../../../test/apps', name);

const cwd = process.cwd();
beforeEach(() => {
	process.chdir(testApp('defaults'));
});
afterAll(() => {
	process.chdir(cwd);
});

it('should default pageNav to false', () => {
	expect(getConfig({})).toMatchObject({ pageNav: false });
});

it.each([true, false])('should accept pageNav %s', (pageNav) => {
	expect(getConfig({ pageNav })).toMatchObject({ pageNav });
});

/**
 * The object form (`{ minLevel, maxLevel, title }`) is where the option is meant to grow,
 * and rejecting it now is what keeps that addition non-breaking: a config that means
 * something specific must not silently mean “on” until the options exist.
 */
it.each([
	[{}, '{}'],
	[{ minLevel: 3 }, '{"minLevel":3}'],
])('should reject the object form %s until it does something', (pageNav, printed) => {
	expect(() => getConfig({ pageNav } as any)).toThrow(
		`pageNav config option must be a boolean, got ${printed}`
	);
});

it('should reject a value that is neither', () => {
	expect(() => getConfig({ pageNav: 'yes' } as any)).toThrow(/pageNav/);
});

it('should reach the browser', () => {
	// The client is where the option is used at all; a missing entry here would make it
	// silently do nothing (see the note at the top of schemas/config.ts)
	expect(CLIENT_CONFIG_OPTIONS).toContain('pageNav');
});
