import React from 'react';
import type * as Rsg from '../../../typings/index.js';

/**
 * What the components a compiled MDX page instantiates need to know about the page.
 *
 * `RsgPlayground` is written into the MDX by the loader as `<RsgPlayground index={n} />` — the
 * index alone — so everything else (which example that is, which component the page documents,
 * whether examples start expanded) travels through this context instead of through the
 * component map. That keeps the map itself constant: a map rebuilt on every render would give
 * React a new component type each time and remount every playground, losing the code the
 * visitor typed into the editor.
 */
export interface MdxPageContents {
	/** The page’s playgrounds, in document order; `RsgPlayground` looks itself up by index. */
	examples: Rsg.RuntimeCodeExample[];
	/**
	 * The isolated-example number of this page’s first playground.
	 *
	 * Zero unless the page shares a component with another examples file (a `.md` examples file
	 * plus an `@example ./x.mdx` doclet, or the reverse): the numbers of a component run
	 * continuously over everything it documents, so a page that is not first starts above zero.
	 * `RsgPlayground` adds it to its own ordinal to build the isolate link, which is what
	 * `filterExamplesByIndex()` reads back.
	 */
	indexOffset?: number;
	/** Name of the component or section the page documents, for the isolate links. */
	name?: string;
	/** `exampleMode` of the owner: whether examples start with the code editor open. */
	exampleMode?: string;
}

const MdxPageContext = React.createContext<MdxPageContents>({ examples: [] });

export default MdxPageContext;

export function useMdxPageContext(): MdxPageContents {
	return React.useContext(MdxPageContext);
}
