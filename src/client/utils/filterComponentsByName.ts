import getFilterRegExp from './getFilterRegExp.js';
import type * as Rsg from '../../typings/index.js';

/**
 * Fuzzy filters components list by component name.
 *
 * @param {array} components
 * @param {string} query
 * @return {array}
 */
export default function filterComponentsByName(
	components: Rsg.Component[],
	query: string
): Rsg.Component[] {
	const regExp = getFilterRegExp(query);
	return components.filter(({ name }) => regExp.test(name as string));
}
