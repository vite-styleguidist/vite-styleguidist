import { parseAst } from 'vite';
import createLogger from 'glogg';

const logger = createLogger('rsg');

/**
 * Keys that can never hold a child node, skipped so the walk does not recurse into
 * position bookkeeping on every single node of every single playground.
 */
const NON_NODE_KEYS = new Set(['type', 'start', 'end', 'range', 'loc']);

/** Anything the walk may meet: a node, an array of nodes, `null`, a string, a number… */
type Walkable = { type?: unknown; [key: string]: unknown } | Walkable[] | null | undefined;

/**
 * Collect the module requests of every `import` declaration and `require()` call under
 * `node`.
 *
 * Hand-written rather than estree-walker's generic visitor: only two node types matter
 * here, and the enter/leave/skip machinery is most of the cost of walking ~1750
 * playgrounds. Like estree-walker, it only descends into arrays and into objects that
 * carry a `type`, so the set of nodes it can reach is the same.
 */
function collectImports(node: Walkable, imports: string[]): void {
	if (!node || typeof node !== 'object') {
		return;
	}

	if (Array.isArray(node)) {
		for (const child of node) {
			collectImports(child, imports);
		}
		return;
	}

	if (typeof node.type !== 'string') {
		return;
	}

	if (node.type === 'ImportDeclaration') {
		// `import type { Props } from './types'` imports nothing at runtime, so it must not
		// become a static import of the example module: TypeScript examples routinely point
		// type-only imports at files that export no value at all. This is also what the old
		// Sucrase strip did for us — it deleted type-only imports before acorn ever saw them.
		const source = node.source as { value?: unknown } | undefined;
		if (node.importKind !== 'type' && source && typeof source.value === 'string') {
			imports.push(source.value);
		}
	} else if (node.type === 'TSImportEqualsDeclaration') {
		// TypeScript's `import Foo = require('foo')`. Sucrase used to rewrite it to a plain
		// `require()` call before acorn saw it, so it has always been part of the contract;
		// oxc keeps it as its own node with the request under a TSExternalModuleReference.
		const reference = node.moduleReference as { type?: unknown; expression?: unknown } | undefined;
		if (node.importKind !== 'type' && reference && reference.type === 'TSExternalModuleReference') {
			const expression = reference.expression as { value?: unknown } | undefined;
			if (expression && typeof expression.value === 'string' && expression.value) {
				imports.push(expression.value);
			}
		}
	} else if (node.type === 'CallExpression') {
		// require('foo') — and only that: `require(name)` and `require('foo' + bar)` cannot
		// be resolved at build time, and a member call like `mod.require('foo')` is not our
		// shim. An empty string is dropped as well, because it resolves to nothing.
		const callee = node.callee as { name?: unknown } | undefined;
		if (callee && callee.name === 'require') {
			const args = node.arguments as { value?: unknown }[] | undefined;
			const first = args && args[0];
			if (first && typeof first.value === 'string' && first.value) {
				imports.push(first.value);
			}
		}
	}

	for (const key of Object.keys(node)) {
		if (!NON_NODE_KEYS.has(key)) {
			collectImports(node[key] as Walkable, imports);
		}
	}
}

/**
 * Returns a list of all strings used in import statements or require() calls.
 *
 * The scan runs on the oxc parser Vite re-exports as `parseAst`: it is native, already
 * resident in the process (rolldown is the bundler), and it reads TSX directly. The
 * previous implementation had to strip TypeScript with Sucrase and then parse the result
 * with acorn + acorn-jsx — two JavaScript passes over every playground in the style guide.
 *
 * Dynamic `import()` is deliberately *not* collected: playground code is compiled in the
 * browser and its module requests are served by a `require()` shim built from this list
 * (see `generateExampleRuntime`), which a native `import()` never consults. Collecting
 * them would only add unreachable static imports — and turn an example that dynamically
 * imports a missing module from a runtime message into a build failure.
 */
export default function getImports(code: string): string[] {
	let ast;
	try {
		// `lang: 'tsx'` covers every fence Styleguidist accepts (js, jsx, ts, tsx).
		ast = parseAst(code, { lang: 'tsx' });
	} catch (err) {
		// Parse errors are not errors here:
		// 1. Adjacent JSX elements must be wrapped in an enclosing tag (<X/><Y/>) —
		//    imports/requires are not allowed in this case, and we'll wrap the code
		//    in React.Fragment on the frontend
		// 2. All other errors — we'll deal with them on the frontend
		logger.debug(
			`oxc cannot parse example code: ${err instanceof Error ? err.message : err}\n\nCode:\n${code}`
		);
		return [];
	}

	const imports: string[] = [];
	collectImports(ast.body as unknown as Walkable, imports);
	return imports;
}
