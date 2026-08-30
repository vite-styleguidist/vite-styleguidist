import compileCode, { DEFAULT_COMPILER_CONFIG } from '../compileCode.js';

const compilerConfig = DEFAULT_COMPILER_CONFIG;

describe('compileCode', () => {
	test('leave modern syntax as is (Sucrase does not downlevel)', () => {
		const result = compileCode(`const {foo, bar} = baz`, compilerConfig);
		expect(result).toBe(`const {foo, bar} = baz`);
	});

	test('strip TypeScript type annotations', () => {
		const result = compileCode(`const foo: number = 1;`, compilerConfig);
		expect(result).toBe(`const foo = 1;`);
	});

	test('transform imports to require()', () => {
		const result = compileCode(`import foo from 'bar'`, compilerConfig);
		expect(result).toMatchInlineSnapshot(`
"const bar$0 = require('bar');
const foo = bar$0.default || bar$0;"
`);
	});

	test('transform async/await is not throw an error', () => {
		const onError = vi.fn();
		const result = compileCode(
			`async function asyncFunction() { return await Promise.resolve(); }`,
			compilerConfig,
			onError
		);
		expect(onError).not.toHaveBeenCalled();
		expect(result).toBe(`async function asyncFunction() { return await Promise.resolve(); }`);
	});

	test('transform imports to require() in front of JSX', () => {
		const result = compileCode(
			`
import foo from 'bar';
import Button from 'button';
<Button />`,
			compilerConfig
		);
		expect(result).not.toMatch(/^import /m);
		expect(result).toContain(`require('bar')`);
		expect(result).toContain(`require('button')`);
		expect(result).toMatchInlineSnapshot(`
"
const bar$0 = require('bar');
const foo = bar$0.default || bar$0;
const button$0 = require('button');
const Button = button$0.default || button$0;
React.createElement(Button, null )"
`);
	});

	test('wrap JSX in Fragment if adjacent on line 1', () => {
		const onError = vi.fn();
		const result = compileCode(`<span /><span />`, compilerConfig, onError);
		expect(onError).not.toHaveBeenCalled();
		expect(result).toMatch(/^React\.createElement\(React\.Fragment, null/);
		expect(result.match(/React\.createElement\('span'/g)).toHaveLength(2);
		expect(result).toMatchInlineSnapshot(
			`"React.createElement(React.Fragment, null, React.createElement('span', null ), React.createElement('span', null ));"`
		);
	});

	test('don’t wrap JSX in Fragment if there is only one statement', () => {
		const result = compileCode(`<Button />;`, compilerConfig);
		expect(result).not.toContain('React.Fragment');
		expect(result).toMatchInlineSnapshot(`"React.createElement(Button, null );"`);
	});

	test('don’t wrap JSX in Fragment if it’s in the middle', () => {
		const result = compileCode(
			`const {foo, bar} = baz;
<div>
  <button>Click</button>
</div>`,
			compilerConfig
		);
		expect(result).not.toContain('React.Fragment');
		expect(result).toMatchInlineSnapshot(`
			"const {foo, bar} = baz;
			React.createElement('div', null
			  , React.createElement('button', null, "Click")
			)"
		`);
	});

	test('tagged template literals', () => {
		const result = compileCode(
			`const Button = styled.button\`
	color: tomato;
\`;
<Button />
`,
			compilerConfig
		);
		expect(result).toMatchInlineSnapshot(`
			"const Button = styled.button\`
				color: tomato;
			\`;
			React.createElement(Button, null )
			"
		`);
	});

	test('use the default compiler config when none is given', () => {
		expect(compileCode(`<Button />;`)).toBe(compileCode(`<Button />;`, compilerConfig));
	});

	test('report syntax errors via the onError callback and return an empty string', () => {
		const onError = vi.fn();
		const result = compileCode(`=`, compilerConfig, onError);
		expect(result).toBe('');
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(expect.any(SyntaxError));
		expect(onError.mock.calls[0][0].message).toMatchInlineSnapshot(`"Unexpected token (1:1)"`);
	});

	test('report the original error when wrapping adjacent JSX in a Fragment does not help', () => {
		const onError = vi.fn();
		// Starts with adjacent JSX (so the Fragment retry kicks in) but is broken anyway
		const result = compileCode(`<span /><span />{`, compilerConfig, onError);
		expect(result).toBe('');
		expect(onError).toHaveBeenCalledTimes(1);
		// The location must refer to the user’s code, not to the wrapped code
		expect(onError.mock.calls[0][0].message).toMatchInlineSnapshot(`"Unexpected token (1:17)"`);
	});
});
