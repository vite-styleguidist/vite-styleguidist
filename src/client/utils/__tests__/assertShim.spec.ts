// @vitest-environment node
import { createRequire } from 'node:module';
import path from 'node:path';

// The shim replaces Node's `assert` in the browser bundle (see getAliases in
// src/scripts/make-vite-config.ts). doctrine, a CommonJS dependency, calls it as
// a function (`require('assert')(...)`), so it must be CommonJS and callable.
const require = createRequire(import.meta.url);
const assertShim = require(path.resolve(import.meta.dirname, '../assertShim.cjs'));

describe('assertShim', () => {
	it('is callable like Node’s assert', () => {
		expect(() => assertShim(true)).not.toThrow();
		expect(() => assertShim(false, 'boom')).toThrow('boom');
	});

	it('provides the helpers doctrine uses', () => {
		expect(() => assertShim.ok(1)).not.toThrow();
		expect(() => assertShim.strictEqual('a', 'a')).not.toThrow();
		expect(() => assertShim.strictEqual('a', 'b')).toThrow();
	});

	it('satisfies doctrine’s type parser', () => {
		// doctrine.type.parseType asserts internally; a non-callable shim throws
		// `utility.assert is not a function` here
		const doctrine = require('doctrine');
		expect(doctrine.type.stringify(doctrine.type.parseType('string|number'))).toBeTruthy();
	});
});
