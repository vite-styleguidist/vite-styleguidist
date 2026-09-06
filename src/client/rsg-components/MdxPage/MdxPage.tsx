import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import MdxPageRenderer from 'rsg-components/MdxPage/MdxPageRenderer';
import MdxPageError from 'rsg-components/MdxPage/MdxPageError';
import MdxPageContext from 'rsg-components/MdxPage/MdxPageContext';
import { useMdxComponents } from 'rsg-components/MdxPage/mdxComponents';
import type * as Rsg from '../../../typings/index.js';

export interface MdxPageProps {
	/** The single chunk an `.mdx` virtual module exports: the compiled page and its playgrounds. */
	chunk: Rsg.MdxExample;
	/** Name of the component or section the page documents. */
	name?: string;
	/** Path of the `.mdx` file, named in the error panel when the page fails to render. */
	file?: string;
	/** `exampleMode` of the owner, passed on to every playground of the page. */
	exampleMode?: string;
	/**
	 * The isolated-example number of this page’s first playground — non-zero only when the
	 * component documents more than one examples file (see MdxPageContext).
	 */
	indexOffset?: number;
}

/**
 * Render one compiled `.mdx` page.
 *
 * `chunk.Content` is what `@mdx-js/mdx` compiled: a React component that takes a `components`
 * map and looks every HTML element and every capitalised name up in it. We hand it the style
 * guide’s own renderers so an `.mdx` page and a `.md` page paint the same way, plus the
 * `RsgPlayground` / `RsgStatic` pair the loader wrote into the page for each code fence.
 */
const MdxPage: React.FunctionComponent<MdxPageProps> = ({
	chunk,
	name,
	file,
	exampleMode,
	indexOffset = 0,
}) => {
	const components = useMdxComponents();
	const { Content, examples } = chunk;
	const context = useMemo(
		() => ({ examples, name, exampleMode, indexOffset }),
		[examples, name, exampleMode, indexOffset]
	);
	return (
		// The boundary is inside the renderer so a failing page still occupies its normal place
		// in the layout, and outside <Content> so it catches everything the page renders.
		<MdxPageRenderer name={name}>
			<MdxPageError name={name} file={file}>
				<MdxPageContext.Provider value={context}>
					<Content components={components} />
				</MdxPageContext.Provider>
			</MdxPageError>
		</MdxPageRenderer>
	);
};

MdxPage.propTypes = {
	chunk: PropTypes.any.isRequired,
	name: PropTypes.string,
	file: PropTypes.string,
	exampleMode: PropTypes.string,
	indexOffset: PropTypes.number,
};

export default MdxPage;
