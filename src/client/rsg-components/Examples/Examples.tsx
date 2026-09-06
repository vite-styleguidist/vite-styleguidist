import React from 'react';
import PropTypes from 'prop-types';
import Playground from 'rsg-components/Playground';
import Markdown from 'rsg-components/Markdown';
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

const Examples: React.FunctionComponent<ExamplesRenderer> = ({
	examples,
	name,
	exampleMode,
	depth,
}) => {
	const { codeRevision } = useStyleGuideContext();
	const heading =
		depth === undefined ? undefined : <Heading level={Math.min(6, depth + 1)}>Examples</Heading>;
	return (
		<ExamplesRenderer name={name} heading={heading}>
			{examples.map((example, index) => {
				switch (example.type) {
					case 'code':
						return (
							<Playground
								code={example.content}
								lang={example.lang}
								evalInContext={example.evalInContext}
								key={`${codeRevision}/${index}`}
								name={name}
								index={index}
								settings={example.settings ?? {}}
								exampleMode={exampleMode}
							/>
						);
					case 'markdown':
						return <Markdown text={example.content} key={index} />;
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
