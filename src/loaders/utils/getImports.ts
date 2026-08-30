import { transform } from 'sucrase';
import acornJsx from 'acorn-jsx';
import { walk } from 'estree-walker';
import getAst from './getAst.js';

/**
 * TypeScript syntax (type annotations, `as`, interfaces...) is stripped before
 * parsing: acorn only understands JavaScript, and examples may be TypeScript.
 * `jsxRuntime: 'preserve'` keeps the JSX for the acorn-jsx pass, and
 * `keepUnusedImports` keeps imports that only *look* unused before compilation.
 * Falls back to the raw source when Sucrase cannot parse it (e.g. adjacent JSX
 * roots, which are wrapped in a Fragment on the frontend instead).
 */
const stripTypes = (code: string): string => {
	try {
		return transform(code, {
			transforms: ['typescript', 'jsx'],
			jsxRuntime: 'preserve',
			keepUnusedImports: true,
			disableESTransforms: true,
		}).code;
	} catch {
		return code;
	}
};

/**
 * Returns a list of all strings used in import statements or require() calls
 */
export default function getImports(code: string): string[] {
	// Parse example source code, but ignore errors:
	// 1. Adjacent JSX elements must be wrapped in an enclosing tag (<X/><Y/>) -
	//    imports/requires are not allowed in this case, and we'll wrap the code
	//    in React.Fragment on the frontend
	// 2. All other errors - we'll deal with them on the frontend
	const ast = getAst(stripTypes(code), [acornJsx()]);
	if (!ast) {
		return [];
	}

	const imports: string[] = [];
	walk(ast as any, {
		enter: (node: any) => {
			// import foo from 'foo'
			// import 'foo'
			if (node.type === 'ImportDeclaration') {
				if (node.source) {
					imports.push(node.source.value);
				}
			}

			// require('foo')
			else if (node.type === 'CallExpression') {
				if (
					node.callee &&
					node.callee.name === 'require' &&
					node.arguments &&
					node.arguments[0].value
				) {
					imports.push(node.arguments[0].value);
				}
			}
		},
	});
	return imports;
}
