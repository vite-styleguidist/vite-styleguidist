import type { ImportMarker } from './RsgImportMarker.js';
import type { MethodDescriptor, PropDescriptor, TagProps } from './RsgDocgen.js';
import type { Example } from './RsgExample.js';

export type ExpandMode = 'expand' | 'collapse' | 'hide';

export interface BaseComponent {
	hasExamples?: boolean;
	name?: string;
	slug?: string;
	href?: string;
	filepath?: string;
	pathLine?: string;
	description?: string;
	exampleMode?: ExpandMode;
	usageMode?: ExpandMode;
}

/** Component as seen by the client (after the virtual modules were evaluated). */
export interface Component extends BaseComponent {
	visibleName?: string;
	props?: {
		displayName?: string;
		visibleName?: string;
		description?: string;
		methods?: MethodDescriptor[];
		props?: PropDescriptor[];
		tags?: TagProps;
		example?: Example[];
		examples?: Example[];
	};
	module?: unknown;
	metadata?: {
		tags?: string[];
	};
}

/** Component as produced on the Node side, before serialization into a virtual module. */
export interface LoaderComponent extends BaseComponent {
	module: ImportMarker;
	props: ImportMarker;
	metadata: ImportMarker | Record<string, unknown>;
}
