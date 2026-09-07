import glogg from 'glogg';
import ModuleSerializer from '../serialize.js';
import importIt, { importDefault } from '../../loaders/utils/importIt.js';

const logger = glogg('rsg');
afterEach(() => {
	logger.removeAllListeners();
});

const serialize = (value: unknown) => new ModuleSerializer().serialize(value);

// The serializer emits JavaScript source: evaluating it is the most faithful check
const evaluate = (code: string) => new Function(`return (${code});`)();

describe('JSON data', () => {
	it.each([
		['a string', 'pizza'],
		['a string with quotes and newlines', 'say "hi"\nplease'],
		['a number', 42],
		['a boolean', true],
		['null', null],
		['an empty array', []],
		['an empty object', {}],
		['nested arrays and objects', { a: [1, { b: ['c', null] }], d: { e: false } }],
	])('should round-trip %s', (_name, value) => {
		expect(evaluate(serialize(value))).toEqual(value);
	});

	it('should indent nested structures with tabs', () => {
		expect(serialize({ a: [1] })).toBe('{\n\t"a": [\n\t\t1\n\t]\n}');
	});

	it('should quote object keys', () => {
		expect(serialize({ 'not-an-identifier': 1 })).toMatch('"not-an-identifier": 1');
	});
});

describe('non-JSON values', () => {
	it('should serialize undefined', () => {
		expect(serialize(undefined)).toBe('undefined');
		expect(serialize({ a: undefined })).toBe('{\n\t"a": undefined\n}');
	});

	it('should serialize non-finite numbers', () => {
		expect(serialize(NaN)).toBe('NaN');
		expect(serialize(Infinity)).toBe('Infinity');
		expect(serialize(-Infinity)).toBe('-Infinity');
	});

	it('should serialize bigints', () => {
		expect(serialize(BigInt(42))).toBe('42n');
	});

	it('should serialize regular expressions', () => {
		const result = evaluate(serialize(/^a\/b$/gi));
		expect(result).toBeInstanceOf(RegExp);
		expect(result.source).toBe('^a\\/b$');
		expect(result.flags).toBe('gi');
	});

	it('should serialize dates', () => {
		const date = new Date('2020-01-02T03:04:05.678Z');
		const result = evaluate(serialize(date));
		expect(result).toBeInstanceOf(Date);
		expect(result.getTime()).toBe(date.getTime());
	});

	it('should keep only own enumerable properties of class instances', () => {
		class Pizza {
			public size = 'large';
			public get toppings() {
				return ['cheese'];
			}
		}
		expect(evaluate(serialize(new Pizza()))).toEqual({ size: 'large' });
	});

	it('should replace symbols with undefined and warn', () => {
		const warn = vi.fn();
		logger.once('warn', warn);
		expect(serialize(Symbol('pizza'))).toBe('undefined');
		expect(warn).toHaveBeenCalledWith(expect.stringMatching('Cannot serialize symbol'));
	});
});

describe('functions', () => {
	it('should serialize arrow functions', () => {
		const code = serialize((a: number, b: number) => a + b);
		expect(evaluate(code)(2, 3)).toBe(5);
	});

	it('should serialize function expressions', () => {
		const code = serialize(function pizza(size: string) {
			return `${size} pizza`;
		});
		expect(evaluate(code)('large')).toBe('large pizza');
	});

	it('should serialize async and generator function expressions', async () => {
		const asyncCode = serialize(async function fetchPizza() {
			return 'pizza';
		});
		await expect(evaluate(asyncCode)()).resolves.toBe('pizza');

		const generatorCode = serialize(function* toppings() {
			yield 'cheese';
		});
		expect([...evaluate(generatorCode)()]).toEqual(['cheese']);
	});

	// Method shorthand is only valid inside an object literal, so it must be
	// turned into a function expression (this is how `styles: { foo() {...} }` reaches the browser)
	it('should serialize object method shorthand', () => {
		const object = {
			pizza(size: string) {
				return `${size} pizza`;
			},
		};
		const code = serialize(object.pizza);
		expect(code).toMatch(/^\(function pizza\(/);
		expect(evaluate(code)('small')).toBe('small pizza');
	});

	it('should serialize async and generator method shorthand', async () => {
		const object = {
			async fetchPizza() {
				return 'pizza';
			},
			*toppings() {
				yield 'cheese';
			},
		};
		await expect(evaluate(serialize(object.fetchPizza))()).resolves.toBe('pizza');
		expect([...evaluate(serialize(object.toppings))()]).toEqual(['cheese']);
	});

	it('should serialize functions nested in data', () => {
		const code = serialize({
			styles: { Logo: (theme: { color: string }) => ({ color: theme.color }) },
		});
		const result = evaluate(code);
		expect(result.styles.Logo({ color: 'red' })).toEqual({ color: 'red' });
	});

	it('should serialize classes', () => {
		class Pizza {
			public size = 'large';
		}
		const Serialized = evaluate(serialize(Pizza));
		expect(new Serialized().size).toBe('large');
	});
});

describe('import markers', () => {
	it('should hoist imports and reference the module namespace', () => {
		const serializer = new ModuleSerializer();
		const code = serializer.serialize({ module: importIt('/path/to/Button.js') });
		expect(code).toBe('{\n\t"module": __rsg_0\n}');
		expect(serializer.renderImports()).toBe('import * as __rsg_0 from "/path/to/Button.js";');
	});

	it('should use a default export interop expression for default imports', () => {
		const serializer = new ModuleSerializer();
		const code = serializer.serialize(importDefault('react'));
		expect(code).toBe('(__rsg_0.default !== undefined ? __rsg_0.default : __rsg_0)');
		expect(serializer.renderImports()).toBe('import * as __rsg_0 from "react";');
	});

	it('should import each module once', () => {
		const serializer = new ModuleSerializer();
		serializer.serialize([importIt('react'), importDefault('react'), importIt('lodash')]);
		expect(serializer.renderImports()).toBe(
			['import * as __rsg_0 from "react";', 'import * as __rsg_1 from "lodash";'].join('\n')
		);
	});

	it('should escape module ids in import statements', () => {
		const serializer = new ModuleSerializer();
		serializer.serialize(importIt('\0virtual:rsg-props?file=/path/with "quotes".js&rsg'));
		expect(serializer.renderImports()).toBe(
			'import * as __rsg_0 from "\\u0000virtual:rsg-props?file=/path/with \\"quotes\\".js&rsg";'
		);
	});

	it('should render no imports when nothing was imported', () => {
		const serializer = new ModuleSerializer();
		serializer.serialize({ a: 1 });
		expect(serializer.renderImports()).toBe('');
	});

	it('should expose importId() and importDefault() for hand-written code', () => {
		const serializer = new ModuleSerializer();
		expect(serializer.importId('react')).toBe('__rsg_0');
		expect(serializer.importId('react')).toBe('__rsg_0');
		expect(serializer.importDefault('react')).toBe(
			'(__rsg_0.default !== undefined ? __rsg_0.default : __rsg_0)'
		);
	});
});

describe('identifier markers', () => {
	it('should emit the identifier verbatim', () => {
		const code = serialize({ evalInContext: { __rsgIdentifier: 'evalInContext' } });
		expect(code).toBe('{\n\t"evalInContext": evalInContext\n}');
	});
});
