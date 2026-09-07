import path from 'node:path';
import glogg from 'glogg';
import kleur from 'kleur';
import { stringify } from 'q-i';
import sanitizeConfig, {
	collectConfigProblems,
	configProblemsToError,
	editDistance,
	suggestOption,
} from '../sanitizeConfig.js';

const logger = glogg('rsg');

it('should return non-empty required field as is', () => {
	const result = sanitizeConfig(
		{
			food: 'pizza',
		},
		{
			food: {
				required: true,
			},
		},
		''
	);
	expect(result).toBeTruthy();
	expect(result.food).toBe('pizza');
});

it('should return default value for empty non-required field', () => {
	const result = sanitizeConfig<{ food?: string }>(
		{},
		{
			food: {
				default: 'pizza',
			},
		},
		''
	);
	expect(result.food).toBe('pizza');
});

it('should return actual value for non-empty field with default value', () => {
	const result = sanitizeConfig(
		{
			food: 'burger',
		},
		{
			food: {
				default: 'pizza',
			},
		},
		''
	);
	expect(result.food).toBe('burger');
});

it('should accept required as a function', () => {
	const result = sanitizeConfig(
		{
			food: 'pizza',
		},
		{
			food: {
				required: () => true,
			},
		},
		''
	);
	expect(result.food).toBe('pizza');
});

it('should throw if required field is undefined', () => {
	const fn = () =>
		sanitizeConfig(
			{},
			{
				food: {
					required: true,
				},
			},
			''
		);
	expect(fn).toThrow('config option is required');
});

it('should throw with custom message returned by required function', () => {
	const fn = () =>
		sanitizeConfig(
			{},
			{
				food: {
					required: () => 'Not good',
				},
			},
			''
		);
	expect(fn).toThrow('Not good');
});

it('should throw when type in schema is incorrect', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 42,
			},
			{
				food: {
					type: 'pizza',
				},
			},
			''
		);
	expect(fn).toThrow('Wrong type');
});

it('should check type for number', () => {
	const result = sanitizeConfig(
		{
			food: 42,
		},
		{
			food: {
				type: 'number',
			},
		},
		''
	);
	expect(result.food).toBe(42);
});

it('should throw when field is not a number', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 'pizza',
			},
			{
				food: {
					type: 'number',
				},
			},
			''
		);
	expect(fn).toThrow('config option should be');
});

it('should check type for string', () => {
	const result = sanitizeConfig(
		{
			food: 'pizza',
		},
		{
			food: {
				type: 'string',
			},
		},
		''
	);
	expect(result.food).toBe('pizza');
});

it('should throw when field is not a string', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 42,
			},
			{
				food: {
					type: 'string',
				},
			},
			''
		);
	expect(fn).toThrow('config option should be');
});

it('should check type for boolean', () => {
	const result = sanitizeConfig(
		{
			food: true,
		},
		{
			food: {
				type: 'boolean',
			},
		},
		''
	);
	expect(result.food).toBe(true);
});

it('should throw when field is not a boolean', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 42,
			},
			{
				food: {
					type: 'boolean',
				},
			},
			''
		);
	expect(fn).toThrow('config option should be');
});

it('should check type for array', () => {
	const result = sanitizeConfig(
		{
			food: [1, 2],
		},
		{
			food: {
				type: 'array',
			},
		},
		''
	);
	expect(result.food).toEqual([1, 2]);
});

it('should throw when field is not an array', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 42,
			},
			{
				food: {
					type: 'array',
				},
			},
			''
		);
	expect(fn).toThrow('config option should be');
});

it('should check type for function', () => {
	const result = sanitizeConfig(
		{
			food: () => true,
		},
		{
			food: {
				type: 'function',
			},
		},
		''
	);
	expect(typeof result.food).toBe('function');
});

it('should throw when field is not a function', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 42,
			},
			{
				food: {
					type: 'function',
				},
			},
			''
		);
	expect(fn).toThrow('config option should be');
});

it('should check type for object', () => {
	const result = sanitizeConfig(
		{
			food: { a: 42 },
		},
		{
			food: {
				type: 'object',
			},
		},
		''
	);
	expect(result.food).toEqual({ a: 42 });
});

it('should throw when field is not an object', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 42,
			},
			{
				food: {
					type: 'object',
				},
			},
			''
		);
	expect(fn).toThrow('config option should be');
});

it('should check type for file path', () => {
	const result = sanitizeConfig(
		{
			food: import.meta.filename,
		},
		{
			food: {
				type: 'file path',
			},
		},
		import.meta.dirname
	);
	expect(result.food).toEqual(import.meta.filename);
});

it('should check type for relative file path and absolutize it', () => {
	const result = sanitizeConfig(
		{
			food: path.basename(import.meta.filename),
		},
		{
			food: {
				type: 'file path',
			},
		},
		import.meta.dirname
	);
	expect(result.food).toEqual(import.meta.filename);
});

it('should throw when file does not exist', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 'pizza.js',
			},
			{
				food: {
					type: 'existing file path',
				},
			},
			import.meta.dirname
		);
	expect(fn).toThrow('does not exist');
});

it('should check type for directory path', () => {
	const result = sanitizeConfig(
		{
			food: import.meta.dirname,
		},
		{
			food: {
				type: 'directory path',
			},
		},
		import.meta.dirname
	);
	expect(result.food).toEqual(import.meta.dirname);
});

it('should check type for relative directory path and absolutize it', () => {
	const result = sanitizeConfig(
		{
			food: 'data',
		},
		{
			food: {
				type: 'file path',
			},
		},
		import.meta.dirname
	);
	expect(result.food).toEqual(path.join(import.meta.dirname, 'data'));
});

it('should throw with correct type name', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: null,
			},
			{
				food: {
					type: 'object',
				},
			},
			''
		);
	expect(fn).toThrow('config option should be object, received null');
});

it('should pass value to a custom process function', () => {
	const result = sanitizeConfig(
		{
			food: true,
		},
		{
			food: {
				type: ['boolean', 'string'],
				process: (val) => (val === true ? 'pizza' : val),
			},
		},
		''
	);
	expect(result.food).toEqual('pizza');
});

it('should not throw if process function returns value for undefined required field', () => {
	const fn = () =>
		sanitizeConfig(
			{},
			{
				food: {
					required: true,
					process: () => 'pizza',
				},
			},
			''
		);
	expect(fn).not.toThrow('config option is required');
});

it('should throw when directory does not exist', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 'pizza.js',
			},
			{
				food: {
					type: 'existing directory path',
				},
			},
			import.meta.dirname
		);
	expect(fn).toThrow('does not exist');
});

it('should throw for unknown options', () => {
	const fn = () =>
		sanitizeConfig<{ drink?: any; food?: any }>(
			{
				book: 'hobbit',
			} as any,
			{
				drink: {},
				food: {},
			},
			''
		);
	expect(fn).toThrow('Unknown config option');
});

it('should throw for unknown options with suggestion', () => {
	const fn = () =>
		sanitizeConfig<{ drink?: any; food?: any }>(
			{
				dring: 'pizza',
			} as any,
			{
				drink: {},
				food: {},
			},
			''
		);
	expect(fn).toThrow('Did you mean');
});

it('should warn for deprecated options', () => {
	const warn = vi.fn();
	logger.once('warn', warn);

	const result = sanitizeConfig(
		{
			food: 'pizza',
		},
		{
			food: {
				deprecated: 'Don’t use!',
			},
		},
		''
	);
	expect(result.food).toBe('pizza');
	expect(warn).toHaveBeenCalledWith(
		expect.stringMatching('config option is deprecated. Don’t use!')
	);
});

it('should throw for removed options', () => {
	const fn = () =>
		sanitizeConfig(
			{
				food: 'pizza',
			},
			{
				food: {
					removed: 'Don’t use!',
				},
			},
			''
		);
	expect(fn).toThrow('was removed');
});

describe('class instance type', () => {
	// Used by the `resolver` option: react-docgen resolvers are class instances,
	// which lodash’s isPlainObject (the `object` type checker) rejects
	class Resolver {
		public resolve() {
			return [];
		}
	}

	it('should accept an instance of a class', () => {
		const resolver = new Resolver();
		const result = sanitizeConfig(
			{
				food: resolver,
			},
			{
				food: {
					type: 'class instance',
				},
			},
			''
		);
		expect(result.food).toBe(resolver);
	});

	it('should accept a plain object too', () => {
		const result = sanitizeConfig(
			{
				food: { a: 42 },
			},
			{
				food: {
					type: 'class instance',
				},
			},
			''
		);
		expect(result.food).toEqual({ a: 42 });
	});

	it.each([
		['null', null],
		['an array', [1, 2]],
		['a function', () => 42],
		['a number', 42],
	])('should throw when field is %s', (_name, value) => {
		const fn = () =>
			sanitizeConfig(
				{
					food: value,
				},
				{
					food: {
						type: 'class instance',
					},
				},
				''
			);
		expect(fn).toThrow('config option should be class instance');
	});
});

describe('collecting every problem', () => {
	// The messages below are asserted byte for byte: a style guide that fails validation has
	// printed exactly these for years, and users (and this suite) match on them. Colours are
	// off so the assertions can be literal strings.
	const enabled = kleur.enabled;
	beforeAll(() => {
		kleur.enabled = false;
	});
	afterAll(() => {
		kleur.enabled = enabled;
	});

	it('should keep the message of a single problem unchanged', () => {
		expect(() => sanitizeConfig({ food: 42 }, { food: { type: 'string' } }, '')).toThrow(
			'food config option should be string, received number.\n'
		);
	});

	it('should keep the message of a single removed option unchanged', () => {
		expect(() =>
			sanitizeConfig({ food: 'pizza' }, { food: { removed: 'Don’t use!' } }, '')
		).toThrow('food config option was removed. Don’t use!');
	});

	it('should keep the message of a single unknown option unchanged', () => {
		expect(() => sanitizeConfig<{ drink?: any }>({ dring: 42 } as any, { drink: {} }, '')).toThrow(
			`Unknown config option dring was found, the value is:\n${stringify(
				42
			)}\n\nDid you mean drink?`
		);
	});

	it('should report every problem in one error', () => {
		let message = '';
		try {
			sanitizeConfig<{ drink?: any; food?: any }>(
				{
					book: 'hobbit',
					food: 42,
					drink: 'water',
				} as any,
				{
					drink: { removed: 'Not any more.' },
					food: { type: 'string' },
				},
				''
			);
		} catch (err: any) {
			message = err.message;
		}
		expect(message).toBe(
			[
				'Found 3 problems:',
				'',
				'1. Unknown config option book was found, the value is:',
				`${stringify('hobbit')}`,
				'',
				// Unknown options first, then the schema’s own order (drink before food)
				'2. drink config option was removed. Not any more.',
				'',
				'3. food config option should be string, received number.',
			].join('\n')
		);
	});

	it('should not let a deprecated option fail anything', () => {
		const warn = vi.fn();
		logger.once('warn', warn);
		expect(() =>
			sanitizeConfig({ food: 'pizza' }, { food: { deprecated: 'Use drink instead' } }, '')
		).not.toThrow();
		expect(warn).toHaveBeenCalled();
	});

	it('should leave a deprecated option out of the error for the other problems', () => {
		expect(() =>
			sanitizeConfig<{ drink?: any; food?: any }>(
				{ food: 'pizza', drink: 42 } as any,
				{ food: { deprecated: 'Use drink instead' }, drink: { type: 'string' } },
				''
			)
		).toThrow('drink config option should be string, received number.\n');
	});

	it('should collect problems without throwing', () => {
		const { config, problems } = collectConfigProblems<{ drink?: any; food?: any }>(
			{ book: 'hobbit', food: 42 } as any,
			{ drink: { default: 'water' }, food: { type: 'string' } },
			''
		);
		expect(problems.map((problem) => [problem.kind, problem.key, problem.severity])).toEqual([
			['unknown', 'book', 'error'],
			['type', 'food', 'error'],
		]);
		// Options that did validate are still normalized, so the doctor can go on using them
		expect(config.drink).toBe('water');
	});

	it('should say there is no error when nothing is wrong', () => {
		expect(configProblemsToError([])).toBeUndefined();
	});

	it('should rethrow an unexpected exception of a process function as is', () => {
		const boom = new TypeError('Boom');
		expect(() =>
			sanitizeConfig(
				{ food: 'pizza' },
				{
					food: {
						process: () => {
							throw boom;
						},
					},
				},
				''
			)
		).toThrow(boom);
	});
});

describe('suggestOption', () => {
	const options = ['components', 'styleguideComponents', 'theme', 'skipComponentsWithoutExample'];

	it('should suggest an option with a missing letter', () => {
		expect(suggestOption('styleguidComponents', options)).toBe('styleguideComponents');
	});

	it('should suggest an option with two letters swapped', () => {
		// A transposition is one edit for Damerau-Levenshtein and two for plain Levenshtein,
		// which is why `thmee` used to be reported without a suggestion at all
		expect(suggestOption('thmee', options)).toBe('theme');
	});

	it('should suggest an option written with the wrong case', () => {
		expect(suggestOption('Components', options)).toBe('components');
	});

	it('should suggest the closest option, not the first close one', () => {
		expect(suggestOption('component', options)).toBe('components');
	});

	it('should not suggest anything for a word nothing looks like', () => {
		expect(suggestOption('pizza', options)).toBeUndefined();
	});

	it('should not suggest a short option for a long typo', () => {
		expect(suggestOption('numberOfPizzas', options)).toBeUndefined();
	});

	it('should allow more typos in a long option name', () => {
		expect(suggestOption('skipComponentWithoutExamples', options)).toBe(
			'skipComponentsWithoutExample'
		);
	});
});

describe('editDistance', () => {
	it.each([
		['', '', 0],
		['a', '', 1],
		['', 'ab', 2],
		['pizza', 'pizza', 0],
		['theme', 'thmee', 1],
		['theme', 'thme', 1],
		['theme', 'thelme', 1],
		['theme', 'thema', 1],
		['ab', 'ba', 1],
		['components', 'pizza', 9],
	])('distance between %s and %s should be %s', (a, b, expected) => {
		expect(editDistance(a, b)).toBe(expected);
		expect(editDistance(b, a)).toBe(expected);
	});
});
