import type { DocumentationObject, MethodDescriptor, PropDescriptor } from './RsgDocgen.js';
import type { ImportMarker } from './RsgImportMarker.js';

export interface MethodWithDocblock extends MethodDescriptor {
	docblock: string;
}

/** Intermediate shape produced by getProps() while post-processing react-docgen output. */
export interface TempPropsObject extends DocumentationObject {
	displayName: string;
	visibleName?: string;
	methods?: MethodWithDocblock[];
	doclets: Record<string, any>;
	example?: ImportMarker | null;
}

/** Final shape of the props module generated for each component. */
export interface PropsObject extends Omit<TempPropsObject, 'props'> {
	props?: Record<string, PropDescriptor> | PropDescriptor[];
	examples?: ImportMarker | null;
}
