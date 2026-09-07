import keepInView, { KEEP_IN_VIEW_MARGIN } from '../keepInView.js';

/**
 * jsdom does no layout, so a “scroll container” is an element with hand-written metrics and
 * a rect that answers from its own scroll offsets — which is what a browser reports.
 */
function setUpRow({
	clientWidth = 300,
	scrollWidth = 900,
	itemLeft = 0,
	itemWidth = 100,
	overflowX = 'auto',
} = {}) {
	const container = document.createElement('div');
	const item = document.createElement('a');
	container.append(item);
	document.body.append(container);

	Object.defineProperty(container, 'clientWidth', { value: clientWidth, configurable: true });
	Object.defineProperty(container, 'scrollWidth', { value: scrollWidth, configurable: true });
	Object.defineProperty(container, 'clientHeight', { value: 44, configurable: true });
	Object.defineProperty(container, 'scrollHeight', { value: 44, configurable: true });
	container.scrollLeft = 0;
	container.scrollTop = 0;

	container.getBoundingClientRect = () =>
		({ left: 0, right: clientWidth, top: 0, bottom: 44 }) as DOMRect;
	item.getBoundingClientRect = () =>
		({
			left: itemLeft - container.scrollLeft,
			right: itemLeft + itemWidth - container.scrollLeft,
			top: 0,
			bottom: 44,
		}) as DOMRect;

	const originalGetComputedStyle = window.getComputedStyle;
	window.getComputedStyle = ((node: Element) =>
		node === container
			? ({ overflowX, overflowY: 'visible' } as CSSStyleDeclaration)
			: originalGetComputedStyle(node)) as typeof window.getComputedStyle;

	return {
		container,
		item,
		restore: () => {
			window.getComputedStyle = originalGetComputedStyle;
			document.body.innerHTML = '';
		},
	};
}

describe('keepInView', () => {
	it('should scroll an element past the right edge just inside it', () => {
		const { container, item, restore } = setUpRow({ itemLeft: 587, itemWidth: 100 });
		try {
			keepInView(item);
			// 687 (its right edge) - 300 (the port) + the margin
			expect(container.scrollLeft).toBe(687 - 300 + KEEP_IN_VIEW_MARGIN);
		} finally {
			restore();
		}
	});

	it('should scroll an element past the left edge back into view', () => {
		const { container, item, restore } = setUpRow({ itemLeft: 20, itemWidth: 100 });
		try {
			container.scrollLeft = 341;
			keepInView(item);
			expect(container.scrollLeft).toBe(341 - (341 - 20) - KEEP_IN_VIEW_MARGIN);
		} finally {
			restore();
		}
	});

	it('should leave an element that is already visible alone', () => {
		const { container, item, restore } = setUpRow({ itemLeft: 16, itemWidth: 100 });
		try {
			keepInView(item);
			expect(container.scrollLeft).toBe(0);
		} finally {
			restore();
		}
	});

	it('should do nothing when nothing around the element scrolls', () => {
		// The desktop sidebar of a short guide: `overflow: auto`, but no overflow
		const { container, item, restore } = setUpRow({
			itemLeft: 587,
			scrollWidth: 300,
			overflowX: 'visible',
		});
		try {
			keepInView(item);
			expect(container.scrollLeft).toBe(0);
		} finally {
			restore();
		}
	});
});
