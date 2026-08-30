// Minimal browser replacement for Node’s `assert` module, aliased in
// src/scripts/make-vite-config.ts. `doctrine` (used on the client to stringify
// JSDoc types) is CommonJS and calls `require('assert')(...)`, so the shim must
// be CommonJS too: an ES module’s namespace object is not callable after the
// bundler’s interop. Copied verbatim into lib/ by scripts/copy-assets.js.
'use strict';

function assert(value, message) {
	if (!value) {
		throw new Error(message || 'Assertion failed');
	}
}

assert.ok = assert;
assert.equal = function equal(actual, expected, message) {
	// eslint-disable-next-line eqeqeq
	assert(actual == expected, message || `${actual} == ${expected}`);
};
assert.strictEqual = function strictEqual(actual, expected, message) {
	assert(actual === expected, message || `${actual} === ${expected}`);
};
assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
	assert(actual !== expected, message || `${actual} !== ${expected}`);
};
assert.fail = function fail(message) {
	assert(false, message || 'Assertion failed');
};

module.exports = assert;
