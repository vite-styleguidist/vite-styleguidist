import type * as Rsg from '../../typings/index.js';
import getUrl from './getUrl.js';
import { getLoadedDocs, getLoadedModule, withDocs, withPlaceholderDocs } from './componentDocs.js';

export interface HrefOptions {
	hashPath?: string[];
	useRouterLinks: boolean;
	useHashId?: boolean;
}

/**
 * Do things that are hard or impossible to do in a loader: we don’t have access to component name
 * and props in the styleguide-loader because we’re using `require` to load the component module.
 *
 * With `lazyDocs` on (ADR 0019) the documentation is not in the tree: it is either in the
 * store already — a component whose documentation arrived before this render — or the
 * component gets the empty placeholder and the name its file path gave it, which is what
 * the sidebar, the routes and the headings are drawn from until it does.
 *
 * @param {Array} components
 * @return {Array}
 */
export default function processComponents(
	components: Rsg.Component[],
	{ useRouterLinks, useHashId, hashPath }: HrefOptions
): Rsg.Component[] {
	return components.map((component) => {
		const docs = component.props || getLoadedDocs(component);
		// A component with neither documentation nor a loader to get it: as before, it is
		// nothing the guide can render
		if (!docs && !component.nameFromPath) {
			return {};
		}

		const processed = docs
			? withDocs(component, docs, getLoadedModule(component))
			: withPlaceholderDocs(component);

		return {
			...processed,
			href:
				component.href ||
				getUrl({
					name: processed.name,
					slug: component.slug,
					anchor: !useRouterLinks,
					hashPath: useRouterLinks ? hashPath : false,
					useSlugAsIdParam: useRouterLinks ? useHashId : false,
				}),
		};
	});
}
