import { transform } from 'sucrase';
import type { Options } from 'sucrase';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import transpileImports from './transpileImports.js';

/**
 * Default options for sucrase’s `transform()` (the `compilerConfig` config option).
 * Shared with the config schema so that the client and the Node side agree.
 */
export const DEFAULT_COMPILER_CONFIG: Options = {
	transforms: ['jsx', 'typescript'],
	// Examples get `React` injected, so the classic runtime just works
	jsxRuntime: 'classic',
	// Skip development-only __source/__self props (React 19 warns about them)
	production: true,
	// Leave modern syntax alone, all supported browsers understand it
	disableESTransforms: true,
	// Never strip imports: side-effect imports are common in examples and
	// import statements are rewritten to require() calls by Styleguidist
	keepUnusedImports: true,
};

const compile = (code: string, config: Options): string => transform(code, config).code;

const wrapCodeInFragment = (code: string): string => `<React.Fragment>${code}</React.Fragment>;`;

/**
 * Whether the code fails to parse *because* of adjacent JSX root elements
 * (`<X /><Y />`) — the one syntax error the playground fixes automatically.
 * Sucrase reports it as a generic "Unexpected token", so the check uses acorn,
 * which has a dedicated message (acorn cannot parse TypeScript, so TypeScript
 * examples with adjacent roots are reported as-is — write a fragment instead).
 */
const isAdjacentJsxError = (code: string): boolean => {
	try {
		Parser.extend(acornJsx()).parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
		return false;
	} catch (err) {
		return (
			err instanceof SyntaxError &&
			err.message.startsWith('Adjacent JSX elements must be wrapped in an enclosing tag')
		);
	}
};

/*
 * 1. Compile code using Sucrase (JSX and TypeScript → plain JavaScript, no downleveling)
 * 2. Wrap code in a React Fragment and retry when — and only when — it failed
 *    because of adjacent JSX root elements. Any other syntax error is reported to
 *    `onError` untouched: a broad retry would let broken code “succeed” by turning
 *    the invalid part into JSX text.
 * 3. Transform import statements into require() calls
 */
export default function compileCode(
	code: string,
	compilerConfig: Options = DEFAULT_COMPILER_CONFIG,
	onError?: (err: Error) => void
): string {
	try {
		let compiledCode: string;

		try {
			compiledCode = compile(code, compilerConfig);
		} catch (err) {
			if (err instanceof SyntaxError && isAdjacentJsxError(code)) {
				try {
					compiledCode = compile(wrapCodeInFragment(code), compilerConfig);
				} catch {
					throw err;
				}
			} else {
				throw err;
			}
		}

		return transpileImports(compiledCode);
	} catch (err) {
		if (onError && err instanceof Error) {
			onError(err);
		}
	}
	return '';
}
