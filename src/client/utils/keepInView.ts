/**
 * How much room is left between the element and the edge of its scroll container when it
 * has to be brought into view, so that the entry does not sit flush against the edge and
 * read as cut off.
 */
export const KEEP_IN_VIEW_MARGIN = 8;

/** Whether a computed overflow value makes a box a scroll port. */
const scrollable = (overflow: string): boolean => overflow === 'auto' || overflow === 'scroll';

/**
 * The nearest ancestor that actually scrolls, or `undefined` when nothing between the
 * element and the document does.
 */
function findScrollContainer(element: HTMLElement): HTMLElement | undefined {
	let node = element.parentElement;
	while (node) {
		const style = window.getComputedStyle(node);
		if (
			(scrollable(style.overflowX) && node.scrollWidth > node.clientWidth + 1) ||
			(scrollable(style.overflowY) && node.scrollHeight > node.clientHeight + 1)
		) {
			return node;
		}
		node = node.parentElement;
	}
	return undefined;
}

/**
 * Brings `element` inside its own scroll container, and nothing else.
 *
 * This exists because the selection of both navigations follows the scroll now
 * (`scrollSync`, ADR 0015), and a selection the reader cannot see says nothing: the
 * small-screen chip row is a horizontal scroller, so the current chip drifts off its right
 * edge as the reader scrolls down the page (measured: 197 px past the edge on the `basic`
 * example at 390 px), and a sidebar taller than the window does the same vertically.
 *
 * It scrolls the container by hand instead of calling `scrollIntoView`, which walks every
 * scrollable ancestor up to the viewport: moving the *page* here would move the very scroll
 * position that chose this element, and the two would chase each other. Nothing outside the
 * container can move as a result of this call.
 *
 * A no-op when the element is already fully inside, when nothing around it scrolls, and on
 * the server.
 */
export default function keepInView(element: HTMLElement): void {
	if (typeof window === 'undefined') {
		return;
	}
	const container = findScrollContainer(element);
	if (!container) {
		return;
	}
	const target = element.getBoundingClientRect();
	const port = container.getBoundingClientRect();

	if (target.left < port.left) {
		container.scrollLeft -= port.left - target.left + KEEP_IN_VIEW_MARGIN;
	} else if (target.right > port.right) {
		container.scrollLeft += target.right - port.right + KEEP_IN_VIEW_MARGIN;
	}

	if (target.top < port.top) {
		container.scrollTop -= port.top - target.top + KEEP_IN_VIEW_MARGIN;
	} else if (target.bottom > port.bottom) {
		container.scrollTop += target.bottom - port.bottom + KEEP_IN_VIEW_MARGIN;
	}
}
