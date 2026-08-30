// Vitest/pretty-format snapshot serializer that recursively replaces the absolute
// repository root in object keys, values and array items with `~`, so snapshots
// containing file paths are portable between machines.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import escapeRegExp from 'lodash/escapeRegExp.js';
import isPlainObject from 'lodash/isPlainObject.js';

const MASK = '~';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_REGEXP = new RegExp(escapeRegExp(ROOT), 'g');
// Marker used to skip values we already processed (avoids infinite recursion).
const KEY = '__SERIALIZER_DEABSDEEP__';

const deabs = (value) => (typeof value === 'string' ? value.replace(ROOT_REGEXP, MASK) : value);

function mapObject(obj, seen = new WeakMap()) {
	if (seen.has(obj)) {
		return seen.get(obj);
	}

	const target = {};
	seen.set(obj, target);

	for (const key of Object.keys(obj)) {
		let value = deabs(obj[key]);
		if (Array.isArray(value)) {
			value = value.map((item) => (isPlainObject(item) ? mapObject(item, seen) : deabs(item)));
		} else if (isPlainObject(value)) {
			value = mapObject(value, seen);
		}
		target[deabs(key)] = value;
	}

	// The $$typeof property is a React marker used for serialization; keep it.
	if (obj.$$typeof) {
		target.$$typeof = obj.$$typeof;
	}

	return target;
}

function deabsDeep(value) {
	if (Array.isArray(value)) {
		return value.map(deabs);
	}
	return mapObject(value);
}

export default {
	test(value) {
		return (
			(Array.isArray(value) || isPlainObject(value)) &&
			!Object.prototype.hasOwnProperty.call(value, KEY)
		);
	},
	serialize(value, config, indentation, depth, refs, printer) {
		const next = deabsDeep(value);
		Object.defineProperty(next, KEY, { enumerable: false, value: true });
		return printer(next, config, indentation, depth, refs);
	},
};
