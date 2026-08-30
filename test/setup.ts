// Global test setup for Vitest (see vitest.config.ts `test.setupFiles`).
import '@testing-library/jest-dom/vitest';
import * as theme from '../src/client/styles/theme.js';

// Most specs run in jsdom; a few Node-only ones opt out with `// @vitest-environment node`
if (typeof window !== 'undefined') {
	// requestAnimationFrame “polyfill”: run callbacks synchronously so components that
	// defer work to the next frame (Preview) settle within the same test tick.
	window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
		callback(0);
		return 0;
	}) as typeof window.requestAnimationFrame;
	globalThis.requestAnimationFrame = window.requestAnimationFrame;
}

// `classes(styles)` returns a class-name map whose values equal the rule keys,
// so renderer snapshots don't depend on generated JSS class names.
globalThis.classes = (styles) =>
	Object.fromEntries(Object.keys(styles(theme)).map((key) => [key, key]));
