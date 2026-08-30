import type { ImportMarker } from '../../typings/index.js';

/**
 * Create a marker telling the virtual-module serializer to `import` the given module
 * and to use its module namespace object in place of the marker.
 *
 * @param id Absolute file path, bare specifier or virtual module id.
 */
export default function importIt(id: string): ImportMarker {
	return { __rsgImport: id };
}

/**
 * Like `importIt()`, but the marker is replaced with the module’s default export
 * (falling back to the namespace for modules without one).
 */
export function importDefault(id: string): ImportMarker {
	return { __rsgImport: id, __rsgDefault: true };
}
