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
