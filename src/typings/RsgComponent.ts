import type { ImportMarker, LazyMarker } from './RsgImportMarker.js';
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
	/**
	 * The component’s name as derived from its file path (`getNameFromFilePath()`, which is
	 * also react-docgen’s own fallback for a component without a resolvable name).
	 *
	 * Only present with `lazyDocs` on: the section tree then knows nothing about a component
	 * until its documentation is loaded, and the sidebar, the routes and the headings need a
	 * name before that. `displayName` from the documentation replaces it as soon as the
	 * documentation arrives, and both names resolve as a route so that a link minted before
	 * the load keeps working. See docs/decisions/0019-on-demand-documentation.md.
	 */
	nameFromPath?: string;
}

/** The documentation of one component: what the `rsg-props:` module exports. */
export interface ComponentDocs {
	displayName?: string;
	visibleName?: string;
	description?: string;
	methods?: MethodDescriptor[];
	props?: PropDescriptor[];
	tags?: TagProps;
	example?: Example[];
	examples?: Example[];
}

/** What a component’s on-demand loader resolves to (`lazyDocs`). */
export interface ComponentDocsModule {
	/** The `rsg-props:` module’s documentation object. */
	props: ComponentDocs;
	/** The component’s own module namespace, as `component.module` with `lazyDocs` off. */
	module?: unknown;
}

/** Component as seen by the client (after the virtual modules were evaluated). */
export interface Component extends BaseComponent {
	visibleName?: string;
	props?: ComponentDocs;
	module?: unknown;
	metadata?: {
		tags?: string[];
	};
	/**
	 * Imports the component’s documentation, with `lazyDocs` on. Absent with `lazyDocs`
	 * off, where `props` and `module` are in the section tree from the start.
	 */
	loadDocs?: () => Promise<ComponentDocsModule>;
	/**
	 * Whether `props` is the real documentation. `false` means `props` is the empty
	 * placeholder a component whose documentation has not been loaded yet renders from
	 * (no description, no props table, no examples).
	 */
	docsLoaded?: boolean;
}

/** Component as produced on the Node side, before serialization into a virtual module. */
export interface LoaderComponent extends BaseComponent {
	module: ImportMarker;
	props: ImportMarker;
	metadata: ImportMarker | Record<string, unknown>;
}

/**
 * Component as serialized with `lazyDocs` on: `module` and `props` are gone from the tree
 * and behind `loadDocs` instead, and the name the tree needs meanwhile is `nameFromPath`.
 */
export interface LazyLoaderComponent extends BaseComponent {
	nameFromPath: string;
	metadata: ImportMarker | Record<string, unknown>;
	loadDocs: LazyMarker;
}
