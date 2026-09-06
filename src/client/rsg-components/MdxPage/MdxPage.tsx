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
	/** `exampleMode` of the owner, passed on to every playground of the page. */
	exampleMode?: string;
}

/**
 * Render one compiled `.mdx` page.
 *
 * `chunk.Content` is what `@mdx-js/mdx` compiled: a React component that takes a `components`
 * map and looks every HTML element and every capitalised name up in it. We hand it the style
 * guide’s own renderers so an `.mdx` page and a `.md` page paint the same way, plus the
 * `RsgPlayground` / `RsgStatic` pair the loader wrote into the page for each code fence.
 */
const MdxPage: React.FunctionComponent<MdxPageProps> = ({ chunk, name, exampleMode }) => {
	const components = useMdxComponents();
	const { Content, examples } = chunk;
	const context = useMemo(() => ({ examples, name, exampleMode }), [examples, name, exampleMode]);
	return (
		// The boundary is inside the renderer so a failing page still occupies its normal place
		// in the layout, and outside <Content> so it catches everything the page renders.
		<MdxPageRenderer name={name}>
			<MdxPageError name={name}>
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
	exampleMode: PropTypes.string,
};

export default MdxPage;
