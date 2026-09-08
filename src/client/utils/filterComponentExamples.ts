import filterExamplesByIndex from './filterExamplesByIndex.js';
import type * as Rsg from '../../typings/index.js';

/**
 * Return a copy of the given component with the examples array filtered
 * to contain only the specified index:
 * filterComponentExamples({ examples: [1,2,3], ...other }, 2) → { examples: [3], ...other }
 *
 * @param {object} component
 * @param {number} index
 * @returns {object}
 */
export default function filterComponentExamples(
	component: Rsg.Component,
	index: number
): Rsg.Component {
	// Nothing to pick from yet: with `lazyDocs` on (ADR 0019) a component whose documentation
	// is still on its way has an empty list of examples, and every index is out of range for
	// it. Filtering it would hand the renderer the “example not found” entry rather than the
	// empty list the component draws while it waits, and the route is evaluated again as soon
	// as the documentation arrives (see componentDocs.ts).
	if (component.loadDocs && !component.docsLoaded) {
		return component;
	}
	return {
		...component,
		props: {
			...component.props,
			examples:
				component.props && component.props.examples
					? filterExamplesByIndex(component.props.examples, index)
					: [],
		},
	};
}
