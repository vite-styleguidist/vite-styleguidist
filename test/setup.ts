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

// Web storage: Node 22+ defines its own `localStorage`/`sessionStorage` globals, which
// are undefined (and print an ExperimentalWarning on access) unless the process runs
// with --localstorage-file, and they shadow jsdom's implementation on the test global.
// Components that remember a choice (ThemeToggle) need a working Storage, so replace
// Node's accessor with an in-memory one. Only accessor properties are replaced: a
// value property means a real implementation is already in place.
if (typeof window !== 'undefined') {
	const createMemoryStorage = (): Storage => {
		const store = new Map<string, string>();
		return {
			get length() {
				return store.size;
			},
			key: (index: number) => Array.from(store.keys())[index] ?? null,
			getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
			setItem: (key: string, value: string) => {
				store.set(String(key), String(value));
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
			clear: () => {
				store.clear();
			},
		};
	};
	for (const name of ['localStorage', 'sessionStorage']) {
		const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
		if (!descriptor || descriptor.get) {
			Object.defineProperty(globalThis, name, {
				value: createMemoryStorage(),
				configurable: true,
				writable: true,
			});
		}
	}
}

// `classes(styles)` returns a class-name map whose values equal the rule keys,
// so renderer snapshots don't depend on generated JSS class names.
globalThis.classes = (styles) =>
	Object.fromEntries(Object.keys(styles(theme)).map((key) => [key, key]));
