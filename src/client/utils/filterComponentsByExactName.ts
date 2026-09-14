import type * as Rsg from '../../typings/index.js';

/**
 * Filters list of components by component name.
 *
 * `nameFromPath` counts as the component’s name too (`lazyDocs`, ADR 0019): a component
 * whose documentation is not loaded yet is known by the name its file path gave it, and
 * the sidebar mints links from that name. Matching both is what keeps such a link working
 * after the documentation has arrived and renamed the component to its `displayName`.
 *
 * @param {Array} components
 * @param {string} name
 * @return {Array}
 */
export default function filterComponentsByExactName(
	components: Rsg.Component[],
	name: string
): Rsg.Component[] {
	return components.filter(
		(component) => component.name === name || component.nameFromPath === name
	);
}
