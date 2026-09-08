/**
 * The words of the two on-demand documentation states (`lazyDocs`, ADR 0019), in one place.
 *
 * They are in a module of their own rather than in the renderer that shows them because
 * `DocsLoadingRenderer` is replaceable through `styleguideComponents`: the alias points
 * `rsg-components/DocsLoading/DocsLoadingRenderer` at the replacement itself, so a
 * replacement cannot import anything from the module it replaces. This one it can, as
 * `vite-styleguidist/lib/client/rsg-components/DocsLoading/strings.js`.
 */

/** Next to the spinner while a component’s documentation is on its way. */
export const DOCS_LOADING_LABEL = 'Loading documentation…';

/**
 * The only recovery a built style guide has. A browser remembers a module whose fetch
 * failed and refuses to fetch the same URL again, and the URL is fixed at build time, so
 * the automatic retry-on-approach cannot succeed there — see ADR 0019.
 */
export const DOCS_LOADING_RELOAD = 'Reload the page';

/** Shown in the component’s body when its documentation could not be fetched. */
export function docsLoadingErrorMessage(name?: string): string {
	return `The documentation of ${name || 'this component'} could not be loaded.`;
}
