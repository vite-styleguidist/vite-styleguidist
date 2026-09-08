/**
 * Marker objects used while generating the styleguide's virtual modules.
 *
 * The Node side builds plain data structures (sections, components, examples) and
 * uses these markers wherever the generated JavaScript module must *import*
 * something (a user component, a Markdown file, a JSON metadata file) or refer
 * to a local identifier (the `evalInContext` helper). The serializer
 * (src/vite/serialize.ts) turns them into `import` statements and identifiers.
 */

export interface ImportMarker {
	/** Module id to import: an absolute file path, a bare specifier or a virtual module id. */
	__rsgImport: string;
	/** Use the default export instead of the module namespace object. */
	__rsgDefault?: boolean;
}

export interface IdentifierMarker {
	/** Name of an identifier that is in scope in the generated module. */
	__rsgIdentifier: string;
}

export const isImportMarker = (value: unknown): value is ImportMarker =>
	!!value && typeof value === 'object' && typeof (value as ImportMarker).__rsgImport === 'string';

export const isIdentifierMarker = (value: unknown): value is IdentifierMarker =>
	!!value &&
	typeof value === 'object' &&
	typeof (value as IdentifierMarker).__rsgIdentifier === 'string';

/**
 * Marker telling the serializer to emit a *loader*: a function that imports the given
 * modules on demand and resolves to an object with the same keys.
 *
 * `{ props: importDefault(id), module: importIt(id) }` becomes
 * `() => Promise.all([import(…), import(…)]).then(([a, b]) => ({ props: a.default, module: b }))`,
 * which is what puts a component’s documentation in a chunk of its own (`lazyDocs`, see
 * docs/decisions/0019-on-demand-documentation.md).
 */
export interface LazyMarker {
	/** Modules to import on demand, keyed by the property they are exposed under. */
	__rsgLazy: Record<string, ImportMarker>;
}

export const isLazyMarker = (value: unknown): value is LazyMarker =>
	!!value &&
	typeof value === 'object' &&
	!!(value as LazyMarker).__rsgLazy &&
	typeof (value as LazyMarker).__rsgLazy === 'object';
