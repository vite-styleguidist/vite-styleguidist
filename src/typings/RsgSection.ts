import type { ImportMarker } from './RsgImportMarker.js';
import type { MarkdownExample, Example } from './RsgExample.js';
import type {
	LoaderComponent,
	LazyLoaderComponent,
	ExpandMode,
	Component,
} from './RsgComponent.js';

export interface BaseSection {
	name?: string;
	slug?: string;
	ignore?: string | string[];
	description?: string;
	exampleMode?: ExpandMode;
	usageMode?: ExpandMode;
	href?: string;
	sectionDepth?: number;
	external?: boolean;
	expand?: boolean;
}

export interface ProcessedSection extends BaseSection {
	visibleName?: string;
	filepath?: string;
	externalLink?: boolean;
	href?: string;
}

/**
 * Section used on the client in javascript
 * It is the output of the function `client/utils/processSection`
 */
export interface Section extends ProcessedSection {
	content?: Example[] | string;
	components?: Component[];
	sections?: Section[];
}

/**
 * Item of the Table Of Contents used in
 * ComponentsList
 * TableOfContent
 * filterSectionByName
 */
export interface TOCItem extends ProcessedSection {
	heading?: boolean;
	shouldOpenInNewTab?: boolean;
	selected?: boolean;
	/**
	 * Whether the current entry is somewhere *inside* this one. A collapsed section stands
	 * in for it then, because its children are not rendered at all (see
	 * ComponentsList/ComponentsListRenderer).
	 */
	containsSelected?: boolean;
	initialOpen?: boolean;
	forcedOpen?: boolean;
	content?: React.ReactNode;
	components?: TOCItem[];
	sections?: TOCItem[];
}

/**
 * Used in the config file and at the early stages of processing
 * in `schema/config.ts` this is the type that is used
 */
export interface ConfigSection extends BaseSection {
	components?: string | string[] | (() => string[]);
	sections?: ConfigSection[];
	content?: string | (() => string);
}

/**
 * Section as produced on the Node side: file references are import markers
 * that the virtual-module serializer turns into `import` statements.
 */
export interface LoaderSection extends BaseSection {
	slug?: string;
	content?: ImportMarker | MarkdownExample;
	components: LoaderComponent[];
	sections: LoaderSection[];
}

/**
 * Section as serialized with `lazyDocs` on: same shape, except that each component keeps
 * only what the tree can know without parsing it and hides the rest behind a loader
 * (see LazyLoaderComponent and docs/decisions/0019-on-demand-documentation.md).
 */
export interface LazyLoaderSection extends Omit<LoaderSection, 'components' | 'sections'> {
	components: LazyLoaderComponent[];
	sections: LazyLoaderSection[];
}
