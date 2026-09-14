import glogg from 'glogg';
import { isIdentifierMarker, isImportMarker, isLazyMarker } from '../typings/index.js';
import type { ImportMarker } from '../typings/index.js';

const logger = glogg('rsg');

/**
 * Serialize a JavaScript value into ES module source code.
 *
 * This replaces the old `to-ast` + `escodegen` pipeline of the webpack loaders.
 * The value tree may contain:
 * - import markers (`importIt()` / `importDefault()`), turned into `import * as __rsg_N`
 *   statements hoisted to the top of the module;
 * - lazy markers (`lazyImport()`), turned into a function that `import()`s the modules when
 *   it is called — the on-demand documentation of ADR 0019;
 * - identifier markers, emitted verbatim (e.g. the `evalInContext` helper);
 * - functions, emitted with `Function.prototype.toString()` — they must therefore be
 *   self-contained (this is how a `styles: theme => ({...})` config function reaches the browser);
 * - regular JSON-compatible data, `undefined` and regular expressions.
 */
export default class ModuleSerializer {
	private imports = new Map<string, string>();

	/** Return the local identifier bound to the given module id (adding an import if needed). */
	public importId(id: string): string {
		let name = this.imports.get(id);
		if (!name) {
			name = `__rsg_${this.imports.size}`;
			this.imports.set(id, name);
		}
		return name;
	}

	/** Expression evaluating to the module’s default export or, failing that, its namespace. */
	public importDefault(id: string): string {
		const name = this.importId(id);
		return `(${name}.default !== undefined ? ${name}.default : ${name})`;
	}

	/** All import statements collected so far. */
	public renderImports(): string {
		return Array.from(
			this.imports,
			([id, name]) => `import * as ${name} from ${JSON.stringify(id)};`
		).join('\n');
	}

	/**
	 * A function importing the marked modules on demand, resolving to an object with the
	 * marker’s own keys.
	 *
	 * The local names are scoped to the arrow function, so they cannot collide with the
	 * `__rsg_N` bindings of the hoisted static imports however many loaders a module has.
	 * The imports are written as literal `import()` calls with a string argument because
	 * that is the only form a bundler can follow: a dynamic id (`import(ids[i])`) would be
	 * left to the browser and break every production build.
	 */
	public serializeLazy(marker: { __rsgLazy: Record<string, ImportMarker> }): string {
		const entries = Object.entries(marker.__rsgLazy);
		const local = (index: number) => `__rsg_lazy_${index}`;
		const value = (item: ImportMarker, index: number) =>
			item.__rsgDefault
				? `(${local(index)}.default !== undefined ? ${local(index)}.default : ${local(index)})`
				: local(index);
		const result = `({ ${entries
			.map(([key, item], index) => `${JSON.stringify(key)}: ${value(item, index)}`)
			.join(', ')} })`;
		const imports = entries.map(([, item]) => `import(${JSON.stringify(item.__rsgImport)})`);
		// One import needs no Promise.all: that is the common shape, and it keeps the
		// generated module readable in the browser’s sources panel
		if (imports.length === 1) {
			return `(() => ${imports[0]}.then((${local(0)}) => ${result}))`;
		}
		const names = entries.map((_entry, index) => local(index)).join(', ');
		return `(() => Promise.all([${imports.join(', ')}]).then(([${names}]) => ${result}))`;
	}

	/** Serialize a value into a JavaScript expression. */
	public serialize(value: unknown, indent = ''): string {
		if (isImportMarker(value)) {
			return value.__rsgDefault
				? this.importDefault(value.__rsgImport)
				: this.importId(value.__rsgImport);
		}
		if (isLazyMarker(value)) {
			return this.serializeLazy(value);
		}
		if (isIdentifierMarker(value)) {
			return value.__rsgIdentifier;
		}
		if (value === undefined) {
			return 'undefined';
		}
		if (value === null) {
			return 'null';
		}
		switch (typeof value) {
			case 'string':
			case 'boolean':
				return JSON.stringify(value);
			case 'number':
				return Number.isFinite(value)
					? String(value)
					: value > 0
						? 'Infinity'
						: value < 0
							? '-Infinity'
							: 'NaN';
			case 'bigint':
				return `${value}n`;
			case 'function':
				return serializeFunction(value as (...args: unknown[]) => unknown);
			case 'symbol':
				logger.warn(
					`Cannot serialize symbol ${String(value)} for the style guide, replacing with undefined`
				);
				return 'undefined';
			default:
				break;
		}
		if (value instanceof RegExp) {
			return value.toString();
		}
		if (value instanceof Date) {
			return `new Date(${JSON.stringify(value.toISOString())})`;
		}
		if (Array.isArray(value)) {
			if (value.length === 0) {
				return '[]';
			}
			const inner = indent + '\t';
			return `[\n${value.map((item) => `${inner}${this.serialize(item, inner)}`).join(',\n')}\n${indent}]`;
		}
		// Plain objects (and class instances: only own enumerable properties are kept)
		const entries = Object.keys(value as Record<string, unknown>).map((key) => [
			key,
			(value as Record<string, unknown>)[key],
		]);
		if (entries.length === 0) {
			return '{}';
		}
		const inner = indent + '\t';
		return `{\n${entries
			.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${this.serialize(item, inner)}`)
			.join(',\n')}\n${indent}}`;
	}
}

/**
 * Turn a function into source code. Object method shorthand (`foo() {}`) and class
 * methods aren’t valid expressions on their own, so they are prefixed with `function`.
 */
function serializeFunction(fn: (...args: unknown[]) => unknown): string {
	const source = fn.toString();
	if (/^(async\s+)?(function\b|\(|[\w$]+\s*=>)/.test(source) || /^class\b/.test(source)) {
		return `(${source})`;
	}
	// Method shorthand: `name(args) { ... }`, `async name(args) { ... }` or `*name(args) { ... }`
	const method = source.match(/^(async\s+)?(\*\s*)?[\w$]+\s*\(/);
	if (method) {
		const asyncPrefix = method[1] || '';
		const generatorPrefix = method[2] || '';
		// Drop both prefixes: `function*` already carries the `*`
		const rest = source.slice(asyncPrefix.length + generatorPrefix.length);
		return `(${asyncPrefix}function${generatorPrefix ? '*' : ''} ${rest})`;
	}
	logger.warn(
		`Cannot serialize function for the style guide, replacing with undefined:\n${source}`
	);
	return 'undefined';
}
