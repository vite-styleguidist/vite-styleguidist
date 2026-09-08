import parseExample, { isExampleError, parseModifiers } from '../parseExample.js';

const content = '<h1>Hello Markdown!</h1>';

it('should parse modifiers as JSON', () => {
	const actual = parseExample(content, 'js', '{ "showcode": true }');
	expect(actual).toEqual({
		lang: 'js',
		settings: { showcode: true },
		content,
	});
});

it('should lowercase JSON keys', () => {
	const actual = parseExample(content, 'js', '{ "showCode": true }');
	expect(actual).toEqual({
		lang: 'js',
		settings: { showcode: true },
		content,
	});
});

it('should parse modifiers as a space-separated string', () => {
	const actual = parseExample(content, 'jsx', 'showcode static');
	expect(actual).toEqual({
		lang: 'jsx',
		settings: { showcode: true, static: true },
		content,
	});
});

it('should lowercase modifiers', () => {
	const actual = parseExample(content, 'jsx', 'showCode Static');
	expect(actual).toEqual({
		lang: 'jsx',
		settings: { showcode: true, static: true },
		content,
	});
});

it('should return settings as an empty object', () => {
	const actual = parseExample(content, 'js');
	expect(actual).toEqual({
		lang: 'js',
		settings: {},
		content,
	});
});
it('should accept language as null', () => {
	const actual = parseExample(content, null);
	expect(actual).toEqual({
		lang: null,
		settings: {},
		content,
	});
});

it('should apply an update function', () => {
	const actual = parseExample(content, 'js', 'coffee', (a) => ({ ...a, lang: 'pizza' }));
	expect(actual).toEqual({
		lang: 'pizza',
		settings: { coffee: true },
		content,
	});
});

it('should return an error when JSON is invalid', () => {
	const actual = parseExample(content, 'js', '{ nope }');
	expect(actual).toEqual({
		error: expect.stringMatching('Cannot parse modifiers'),
	});
});

describe('parseModifiers', () => {
	it('should turn space-separated words into flags', () => {
		expect(parseModifiers('padded noeditor')).toEqual({ padded: true, noeditor: true });
	});

	it('should parse JSON modifiers', () => {
		expect(parseModifiers('{ "props": { "className": "checks" } }')).toEqual({
			props: { className: 'checks' },
		});
	});

	it('should return an error for anything else', () => {
		const result = parseModifiers('{oops}');
		expect(isExampleError(result)).toBe(true);
		expect((result as { error: string }).error).toMatch('Cannot parse modifiers for "{oops}"');
	});
});
