import React from 'react';
import PropTypes from 'prop-types';
import Playground from 'rsg-components/Playground';
import Markdown from 'rsg-components/Markdown';
import MdxPage from 'rsg-components/MdxPage';
import Heading from 'rsg-components/Heading';
import ExamplesRenderer from 'rsg-components/Examples/ExamplesRenderer';
import { useStyleGuideContext } from 'rsg-components/Context';
import type * as Rsg from '../../../typings/index.js';

export interface ExamplesRenderer {
	examples: Rsg.Example[];
	name?: string;
	exampleMode?: string;
	/**
	 * Heading depth of the owner: when given (a component's examples) the list gets an
	 * “Examples” heading one level below it. A section's content has no such heading.
	 */
	depth?: number;
}

/**
 * The isolated-example number each chunk of a page starts at (`#!/Button/2`).
 *
 * It is not the array position: a Markdown chunk owns one number, an MDX page owns one per
 * playground, and a component’s list may concatenate both — its examples file and its
 * `@example` doclet file (see processComponents.ts). `filterExamplesByIndex()` walks the same
 * numbering from the other end, and `toManifestExamples()` writes it into `docs.json`; the
 * three must be changed together.
 */
function exampleIndexes(examples: Rsg.Example[]): number[] {
	let next = 0;
	return examples.map((example) => {
		const first = next;
		next += example.type === 'mdx' ? example.examples.length : 1;
		return first;
	});
}

const Examples: React.FunctionComponent<ExamplesRenderer> = ({
	examples,
	name,
	exampleMode,
	depth,
}) => {
	const { codeRevision } = useStyleGuideContext();
	const heading =
		depth === undefined ? undefined : <Heading level={Math.min(6, depth + 1)}>Examples</Heading>;
	const indexes = exampleIndexes(examples);
	return (
		<ExamplesRenderer name={name} heading={heading}>
			{examples.map((example, index) => {
				const first = indexes[index];
				switch (example.type) {
					case 'code':
						return (
							<Playground
								code={example.content}
								lang={example.lang}
								evalInContext={example.evalInContext}
								key={`${codeRevision}/${index}`}
								name={name}
								index={first}
								settings={example.settings ?? {}}
								exampleMode={exampleMode}
							/>
						);
					case 'markdown':
						return <Markdown text={example.content} key={index} />;
					// A whole `.mdx` page arrives as a single chunk: its prose is one compiled React
					// tree, and its playgrounds are rendered from inside it by `RsgPlayground`.
					// Keyed on `codeRevision` like the playgrounds above, so a hot update of the
					// file remounts the page (and clears its error boundary).
					case 'mdx':
						return (
							<MdxPage
								chunk={example}
								name={name}
								exampleMode={exampleMode}
								indexOffset={first}
								key={`${codeRevision}/${index}`}
							/>
						);
					default:
						return null;
				}
			})}
		</ExamplesRenderer>
	);
};

Examples.propTypes = {
	examples: PropTypes.array.isRequired,
	name: PropTypes.string.isRequired,
	exampleMode: PropTypes.string.isRequired,
	depth: PropTypes.number,
};

export default Examples;
