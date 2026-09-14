import ReactDOM from 'react-dom';
import type { ReactElement } from 'react';
import type { StyleguideRoot } from './reactRoot.js';

// @types/react-dom 19 no longer declares the legacy API (removed from React 19), so the
// two calls are typed here by hand. Keep the default import form: it is what Vite's CommonJS
// interop resolves for react-dom 16/17 both in the dev server (pre-bundled) and in the
// Rolldown build, and the shape the spike validated on 16.14.0 and 17.0.2.
interface LegacyReactDOM {
	render(element: ReactElement, container: Element): void;
	unmountComponentAtNode(container: Element): boolean;
}

const legacy = ReactDOM as unknown as LegacyReactDOM;

/**
 * React 16.14 and 17: a legacy root. Never imported when the project's react-dom is 18 or
 * newer, where `ReactDOM.render()` logs a deprecation warning (18) or is gone (19): the
 * `rsg-react-root` alias in src/scripts/make-vite-config.ts points at reactRoot.modern.ts
 * there. Repeated `render()` calls into the same node update the existing tree, which is
 * what the page root relies on for hot updates and hash changes.
 */
export function mountRoot(node: Element): StyleguideRoot {
	return {
		render: (element) => {
			legacy.render(element, node);
		},
		unmount: () => {
			legacy.unmountComponentAtNode(node);
		},
	};
}
