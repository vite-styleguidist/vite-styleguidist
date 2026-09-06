import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import type { StyleguideRoot } from './reactRoot.js';

/**
 * React 18 and newer: a concurrent root. Never imported when the project's react-dom is
 * older than 18, where `react-dom/client` does not exist: the `rsg-react-root` alias in
 * src/scripts/make-vite-config.ts points at reactRoot.legacy.ts instead, so this static
 * import is only ever resolved where the module is present.
 */
export function mountRoot(node: Element): StyleguideRoot {
	const root = createRoot(node);
	return {
		render: (element: ReactElement) => root.render(element),
		unmount: () => root.unmount(),
	};
}
