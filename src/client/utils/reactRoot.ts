import type { ReactElement } from 'react';

/**
 * The small part of a React root the style guide needs: enough for the page root
 * (src/client/index.ts) and for each example preview (rsg-components/Preview).
 *
 * Two implementations exist, and only one of them is ever bundled into a style guide:
 * - reactRoot.modern.ts wraps `createRoot()` from `react-dom/client` (React 18+);
 * - reactRoot.legacy.ts wraps `ReactDOM.render()` / `unmountComponentAtNode()` (16.14 and 17).
 *
 * Client code imports `mountRoot()` from the bare specifier `rsg-react-root`, which the
 * Vite config aliases to one of the two files after reading the version of `react-dom`
 * installed in the project (see `getReactRootFlavor()` in src/scripts/make-vite-config.ts).
 * The selection has to happen in Node, at config time: `react-dom/client` does not exist
 * before React 18, and a static import of it breaks Vite's import analysis and the Rolldown
 * build there before any runtime check could run. tsconfig.json and vitest.config.ts point the
 * specifier at the modern file, so type-checking and unit tests use the API of the React the
 * repo develops against.
 */
export interface StyleguideRoot {
	render(element: ReactElement): void;
	unmount(): void;
}
