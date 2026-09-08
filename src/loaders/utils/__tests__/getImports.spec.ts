import getImports from '../getImports.js';

test('find calls to require() in code', () => {
	expect(getImports(`require('foo')`)).toEqual(['foo']);
	expect(getImports(`require('./foo')`)).toEqual(['./foo']);
	expect(getImports(`require('foo');require('bar')`)).toEqual(['foo', 'bar']);
});

test('find require() calls anywhere in the code, not just at the top level', () => {
	expect(getImports(`function f() { const a = require('deep'); }`)).toEqual(['deep']);
	expect(getImports(`class C { m() { return require('method'); } }`)).toEqual(['method']);
	expect(getImports(`const o = { a: require('object') };`)).toEqual(['object']);
	expect(getImports(`const o = [require('array')];`)).toEqual(['array']);
	expect(getImports(`<A x={require('attr')} />`)).toEqual(['attr']);
	expect(getImports(`require('member').property`)).toEqual(['member']);
});

test('find import statements in code', () => {
	expect(getImports(`import A from 'pizza';`)).toEqual(['pizza']);
	expect(getImports(`import A from './pizza';`)).toEqual(['./pizza']);
	expect(getImports(`import A from "pizza";`)).toEqual(['pizza']);
	expect(getImports(`import { A as X, B } from 'lunch';`)).toEqual(['lunch']);
	expect(getImports(`import A, { B as X, C } from 'lunch';`)).toEqual(['lunch']);
	expect(getImports(`import * as A from 'lunch';`)).toEqual(['lunch']);
	expect(getImports(`import 'side-effect';`)).toEqual(['side-effect']);
	expect(getImports(`import A from '@scope/pkg/sub';`)).toEqual(['@scope/pkg/sub']);
	expect(getImports(`import A from 'foo';import B from 'bar';`)).toEqual(['foo', 'bar']);
});

test('find import statements with import attributes', () => {
	expect(getImports(`import data from './d.json' with { type: 'json' };`)).toEqual(['./d.json']);
});

test('find TypeScript import-equals declarations', () => {
	expect(getImports(`import A = require('foo');`)).toEqual(['foo']);
	expect(getImports(`export import A = require('foo');`)).toEqual(['foo']);
});

test('work with JSX', () => {
	expect(getImports(`const A = require('pizza');<Button/>`)).toEqual(['pizza']);
	expect(getImports(`import A from 'pizza';<Button>foo</Button>`)).toEqual(['pizza']);
	expect(getImports(`import A from 'pizza';<><A/><A/></>`)).toEqual(['pizza']);
	expect(getImports(`import A from 'pizza';<A {...props} />`)).toEqual(['pizza']);
	expect(getImports(`import A from 'pizza';<A.B.C />`)).toEqual(['pizza']);
});

test('work with TypeScript syntax without a separate strip step', () => {
	expect(getImports(`import A from 'a';\nconst f = <T,>(x: T): T => x;`)).toEqual(['a']);
	expect(getImports(`import A from 'a';\nconst x = {} satisfies Record<string, string>;`)).toEqual([
		'a',
	]);
	expect(getImports(`import A from 'a';\nenum E { X }`)).toEqual(['a']);
	expect(getImports(`import A from 'a';\ninterface I { a: string }`)).toEqual(['a']);
	expect(getImports(`import A from 'a';\nconst x = y!.z as const;`)).toEqual(['a']);
	expect(getImports(`import A from 'a';\nabstract class C { abstract m(): void }`)).toEqual(['a']);
	// Decorators and `accessor` used to make Sucrase bail out, which lost every import in
	// the fence; oxc parses them, so the imports are found.
	expect(getImports(`import A from 'a';\n@dec class B {}`)).toEqual(['a']);
	expect(getImports(`import A from 'a';\nclass B { accessor x = 1; }`)).toEqual(['a']);
});

test('allow comments', () => {
	expect(
		getImports(`
/**
 * Some important comment
 */
import A from 'dog'
/* Less important comments */
import B from 'cat'
// Absolutely not important comment
import C from 'capybara'
import D from 'hamster' // One more comment
import E from 'snake'
`)
	).toEqual(['dog', 'cat', 'capybara', 'hamster', 'snake']);
});

test('ignore type-only imports, which import nothing at runtime', () => {
	expect(getImports(`import type { A } from 'foo';\nconst x: A = 1;`)).toEqual([]);
	expect(getImports(`import type A from 'foo';\nconst x: A = 1;`)).toEqual([]);
	expect(getImports(`import type A = require('foo');`)).toEqual([]);
	// …but an inline `type` specifier still leaves a value import behind
	expect(getImports(`import { type A, B } from 'foo';\nconst x: A = B;`)).toEqual(['foo']);
});

test('ignore re-exports, which the runtime require() shim never asks for', () => {
	expect(getImports(`export { a } from 'foo';`)).toEqual([]);
	expect(getImports(`export * from 'foo';`)).toEqual([]);
	expect(getImports(`export * as ns from 'foo';`)).toEqual([]);
	expect(getImports(`export type { A } from 'foo';`)).toEqual([]);
});

test('ignore dynamic import(), which bypasses the runtime require() shim', () => {
	expect(getImports(`import('foo')`)).toEqual([]);
	expect(getImports(`const A = await import('foo');`)).toEqual([]);
	expect(getImports(`import('foo').then((m) => m.default)`)).toEqual([]);
});

test('ignore dynamic requires', () => {
	expect(getImports(`require('foo' + 'bar')`)).toEqual([]);
	expect(getImports('require(`foo`)')).toEqual([]);
	expect(getImports(`require(name)`)).toEqual([]);
	expect(getImports(`require(...args)`)).toEqual([]);
	expect(getImports(`require(0)`)).toEqual([]);
	expect(getImports(`require('')`)).toEqual([]);
});

test('ignore require() calls that are not the runtime shim', () => {
	expect(getImports(`mod.require('foo')`)).toEqual([]);
});

test('ignore a require() with no arguments instead of throwing', () => {
	expect(() => getImports(`require()`)).not.toThrow();
	expect(getImports(`require()`)).toEqual([]);
});

test('ignore imports in comments', () => {
	expect(
		getImports(`
import A from 'pizza'
// import one from 'one';
/** import two from 'two' */
/* import three from 'three' */
/*
import four from 'four';
import five from 'five';
*/
`)
	).toEqual(['pizza']);
});

test('ignore imports in strings', () => {
	expect(
		getImports(`
import A from 'pizza'
const foo = "import foo from 'foo'"
const bar = 'import bar from "bar"'
const baz = \`import baz from 'baz'\`
`)
	).toEqual(['pizza']);
});

test('ignore imports in JSX', () => {
	expect(
		getImports(`
import A from 'pizza';
<p>import foo from 'foo'</p>
`)
	).toEqual(['pizza']);
});

test('ignore multiple root JSX elements', () => {
	expect(getImports(`<A /><B />`)).toEqual([]);
	// The whole fence is skipped, imports included — it is wrapped in a Fragment and
	// reported by the browser instead
	expect(getImports(`import A from 'pizza';\n<A /><B />`)).toEqual([]);
});

test('ignore syntax errors', () => {
	expect(getImports(`*`)).toEqual([]);
	expect(getImports(`import A from 'foo`)).toEqual([]);
	expect(getImports(`const x = {`)).toEqual([]);
});

test('return nothing for code with no imports', () => {
	expect(getImports(``)).toEqual([]);
	expect(getImports(`\n   \n`)).toEqual([]);
	expect(getImports(`// just a comment`)).toEqual([]);
	expect(getImports(`<Button>Press me</Button>`)).toEqual([]);
});
