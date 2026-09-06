import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Syntax highlighting for the CodeMirror editor, expressed in Prism’s vocabulary.
 *
 * Every rule carries a `class` and no colours, so CodeMirror emits Prism’s own class names
 * (`token keyword`, `token string`, …) instead of generating a stylesheet of its own. The
 * colours then come from the same JSS rules that style static code blocks,
 * `src/client/styles/prismTheme.ts`, which read `theme.color.code*`. That is what keeps the
 * documented theming contract (Cookbook “How to change syntax highlighting colors?”) true for
 * the editor without a second copy of the palette: user themes, the `styles` option and theme
 * hot reloading all flow through JSS exactly as they did with Prism.
 *
 * The mapping follows what Prism’s `jsx` grammar produces for the same code, so the editor and
 * the static blocks agree on colours. Rules for a modified tag (`t.function(t.punctuation)`)
 * take precedence over the plain one (`t.punctuation`); rules on a parent tag (`t.keyword`)
 * also match its sub-tags (`controlKeyword`, `moduleKeyword`, `self`, `null`, …).
 */
const prismHighlightStyle = HighlightStyle.define([
	{ tag: t.comment, class: 'token comment' },
	{ tag: t.keyword, class: 'token keyword' },
	// `super`; Prism lists it among the keywords
	{ tag: t.atom, class: 'token keyword' },
	{ tag: t.bool, class: 'token boolean' },
	{ tag: t.number, class: 'token number' },
	{ tag: t.string, class: 'token string' },
	// Escapes are separate nodes inside a string and would otherwise lose the string colour
	{ tag: t.escape, class: 'token string' },
	{ tag: t.regexp, class: 'token regex' },
	{ tag: t.operator, class: 'token operator' },
	// `.` is an operator for Lezer but punctuation for Prism
	{ tag: t.derefOperator, class: 'token punctuation' },
	{ tag: t.punctuation, class: 'token punctuation' },
	// `=>` is `function(punctuation)` for Lezer, an operator for Prism
	{ tag: t.function(t.punctuation), class: 'token operator' },
	// JSX: `<`, `</`, `/>`, `>`
	{ tag: t.angleBracket, class: 'token punctuation' },
	{ tag: t.tagName, class: 'token tag' },
	{ tag: t.attributeName, class: 'token attr-name' },
	{ tag: t.attributeValue, class: 'token attr-value' },
	// Identifiers followed by `(`: `foo(` and `obj.method(`
	{ tag: t.function(t.variableName), class: 'token function' },
	{ tag: t.function(t.propertyName), class: 'token function' },
	{ tag: t.className, class: 'token class-name' },
	{ tag: t.typeName, class: 'token class-name' },
	// Object literal keys (`{ size: 'large' }`), Prism’s `literal-property`
	{ tag: t.definition(t.propertyName), class: 'token property' },
]);

export default prismHighlightStyle;
