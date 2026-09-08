/**
 * The files a source file reaches through its own *relative* imports, transitively.
 *
 * This exists for one job: telling the parse cache (src/vite/persistentCache.ts) what a
 * component's documentation depends on besides the component itself, when the parser is a
 * `propsParser` of the user's own.
 *
 * The default parser needs nothing from here — react-docgen's importer reads the files it
 * follows and says so (see src/vite/modules/props.ts), which is exact. A `propsParser`
 * cannot be asked: `react-docgen-typescript`, the parser the option exists for, resolves
 * types through a TypeScript program that is built once at module scope, so neither its
 * return value nor the file reads it makes during a call describe what its answer depends
 * on. What it *does* follow, though, is the component's imports — `import { CardProps }
 * from './types'` is the whole of the pattern — and those we can read ourselves.
 *
 * So this is an over-approximation of a set we cannot compute exactly: every relative
 * import, whether or not the parser cared about it, and a type-only import very much
 * included. Over-approximating is the safe direction — the cost of a file in this list that
 * the parser never read is one cache miss too many when it changes.
 *
 * What it deliberately does not follow, and what is documented next to the `propsParser`
 * option as the limit of the cache:
 *
 * - **bare specifiers** (`@acme/tokens`, `react`): a package changes when it is installed,
 *   and walking into `node_modules` would drag the type graph of React itself into the key
 *   of every component;
 * - **path aliases** (`@/types`, a `tsconfig.json` `paths` entry): resolving them means
 *   reading the project's TypeScript and Vite configuration, and being wrong about it
 *   silently is worse than not trying;
 * - **`import()`**: nothing a props parser reads is behind a dynamic import.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'vite';
import createLogger from 'glogg';

const logger = createLogger('rsg');

/**
 * Extensions tried for a specifier that names no file, in the order Node and TypeScript
 * try them. `.d.ts` is in the list because a `.tsx` component's props interface is
 * routinely declared in one.
 */
const EXTENSIONS = ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

/**
 * TypeScript's ES module rule: `./types.js` in a `.ts` file means `./types.ts`. The same
 * rewrite react-docgen's own importer does when a `.js` specifier resolves to nothing.
 */
const TS_REWRITES: Record<string, string[]> = {
	'.js': ['.ts', '.tsx'],
	'.jsx': ['.tsx'],
	'.mjs': ['.mts'],
	'.cjs': ['.cts'],
};

/**
 * How many files one component's documentation may depend on.
 *
 * A guard, not a tuning knob: a component that imports a barrel file of a design system
 * reaches everything, and hashing a thousand files on every cache read would cost more than
 * the parse the cache is saving. A component over the cap keeps the files found first and
 * loses the rest — which can only mean a stale entry in a case that is already pathological,
 * so `--no-cache` is the documented answer there.
 */
export const MAX_IMPORTED_FILES = 100;

/** Keys that can never hold a child node; see getImports.ts, which walks the same way. */
const NON_NODE_KEYS = new Set(['type', 'start', 'end', 'range', 'loc']);

type Walkable = { type?: unknown; [key: string]: unknown } | Walkable[] | null | undefined;

/**
 * Every module request of an `import`, an `export … from`, an `import x = require(…)` or a
 * `require()` call under `node`.
 *
 * Unlike getImports(), type-only imports are kept: `import type { Props } from './types'`
 * imports nothing at run time and everything at documentation time.
 */
function collectSpecifiers(node: Walkable, out: string[]): void {
	if (!node || typeof node !== 'object') {
		return;
	}
	if (Array.isArray(node)) {
		for (const child of node) {
			collectSpecifiers(child, out);
		}
		return;
	}
	if (typeof node.type !== 'string') {
		return;
	}

	if (
		node.type === 'ImportDeclaration' ||
		node.type === 'ExportNamedDeclaration' ||
		node.type === 'ExportAllDeclaration'
	) {
		const source = node.source as { value?: unknown } | undefined;
		// `export const x = 1` is an ExportNamedDeclaration with no source
		if (source && typeof source.value === 'string' && source.value) {
			out.push(source.value);
		}
	} else if (node.type === 'TSImportEqualsDeclaration') {
		const reference = node.moduleReference as { type?: unknown; expression?: unknown } | undefined;
		if (reference && reference.type === 'TSExternalModuleReference') {
			const expression = reference.expression as { value?: unknown } | undefined;
			if (expression && typeof expression.value === 'string' && expression.value) {
				out.push(expression.value);
			}
		}
	} else if (node.type === 'CallExpression') {
		const callee = node.callee as { name?: unknown } | undefined;
		if (callee && callee.name === 'require') {
			const args = node.arguments as { value?: unknown }[] | undefined;
			const first = args && args[0];
			if (first && typeof first.value === 'string' && first.value) {
				out.push(first.value);
			}
		}
	}

	for (const key of Object.keys(node)) {
		if (!NON_NODE_KEYS.has(key)) {
			collectSpecifiers(node[key] as Walkable, out);
		}
	}
}

const isFile = (candidate: string): boolean => {
	try {
		return fs.statSync(candidate).isFile();
	} catch {
		return false;
	}
};

/** The file a relative specifier names, or `undefined` for anything we do not follow. */
export function resolveRelativeImport(specifier: string, fromFile: string): string | undefined {
	if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
		return undefined;
	}
	const base = path.resolve(path.dirname(fromFile), specifier);
	const extension = path.extname(base);
	const candidates = [
		// `./types.ts`, written out in full
		...(extension ? [base] : []),
		// `./types` → `./types.ts`, `./types.tsx`, …
		...EXTENSIONS.map((ext) => base + ext),
		// `./types.js` → `./types.ts` (TypeScript ES modules)
		...(TS_REWRITES[extension] || []).map((ext) => base.slice(0, -extension.length) + ext),
		// `./types` → `./types/index.ts`, …
		...EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
	];
	return candidates.find(isFile);
}

/**
 * What one file imports, memoized on its content stamp.
 *
 * A design system's components import the same handful of files, and a cold build parses
 * every component: without this, `src/types.ts` would be read and parsed once per component
 * that mentions it. The stamp is the mtime and the size, so an edit — the only thing that
 * makes a stale entry visible — drops it.
 */
const importsOfFile = new Map<string, { stamp: string; files: string[] }>();

/** Only for tests and for a long-lived dev server; see clearImportedFilesCache below. */
export function clearImportsCache(): void {
	importsOfFile.clear();
}

function importsOf(file: string): string[] {
	let stamp: string;
	try {
		const stat = fs.statSync(file);
		stamp = `${stat.mtimeMs}:${stat.size}`;
	} catch {
		return [];
	}
	const cached = importsOfFile.get(file);
	if (cached && cached.stamp === stamp) {
		return cached.files;
	}

	let files: string[] = [];
	try {
		const source = fs.readFileSync(file, 'utf8');
		// `lang: 'tsx'` reads every flavour a component can be written in
		const ast = parseAst(source, { lang: 'tsx' });
		const specifiers: string[] = [];
		collectSpecifiers(ast.body as unknown as Walkable, specifiers);
		files = [
			...new Set(
				specifiers
					.map((specifier) => resolveRelativeImport(specifier, file))
					.filter((resolved): resolved is string => !!resolved)
			),
		];
	} catch (err) {
		// A file that cannot be read or parsed contributes nothing. It is not an error here:
		// whatever is wrong with it, the parser is about to report it much better than we can.
		logger.debug(`Cannot scan the imports of ${file}: ${err instanceof Error ? err.message : err}`);
	}

	importsOfFile.set(file, { stamp, files });
	return files;
}

/**
 * Every file `entry` reaches through relative imports, transitively, `entry` excluded.
 *
 * Breadth first, so the cap above keeps the files closest to the component — the ones a
 * props parser is most likely to have read.
 */
export default function getImportedFiles(entry: string): string[] {
	const found = new Set<string>();
	const queue = [entry];
	const visited = new Set<string>([entry]);

	while (queue.length > 0 && found.size < MAX_IMPORTED_FILES) {
		const file = queue.shift() as string;
		for (const imported of importsOf(file)) {
			// A package is identified by its version, not by its files (see the header)
			if (visited.has(imported) || imported.includes(`${path.sep}node_modules${path.sep}`)) {
				continue;
			}
			visited.add(imported);
			found.add(imported);
			if (found.size >= MAX_IMPORTED_FILES) {
				break;
			}
			queue.push(imported);
		}
	}

	return [...found];
}
