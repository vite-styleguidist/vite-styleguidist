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

	// jsdom does no layout and its Range lacks the two measuring methods CodeMirror calls
	// while it lays out the editor (Range.getClientRects()/getBoundingClientRect(), the
	// element variants exist). Empty rectangles are enough for the Editor and Playground
	// specs, which assert on DOM and behaviour, not on pixels; ResizeObserver and
	// IntersectionObserver are missing too but CodeMirror checks for them before use.
	const emptyRect = (): DOMRect => ({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
		toJSON: () => ({}),
	});
	if (!Range.prototype.getClientRects) {
		Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
	}
	if (!Range.prototype.getBoundingClientRect) {
		Range.prototype.getBoundingClientRect = emptyRect;
	}
}

// `classes(styles)` returns a class-name map whose values equal the rule keys,
// so renderer snapshots don't depend on generated JSS class names.
globalThis.classes = (styles) =>
	Object.fromEntries(Object.keys(styles(theme)).map((key) => [key, key]));
