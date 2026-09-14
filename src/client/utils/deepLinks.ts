/**
 * Taking the reader to the thing an address points at, on a page that is still filling in.
 *
 * With `lazyDocs` on (ADR 0019) the document the browser lands on is mostly empty
 * containers, and both halves of “scroll to the fragment” are affected by that:
 *
 * - **the target may not exist yet.** A fragment naming a heading *inside* a component’s
 *   documentation — `#sizes-of-widget20`, the ids markdown-to-jsx mints for every `##` of a
 *   Readme and the ids the “on this page” list is built on (ADR 0016) — names an element
 *   that only exists once that component’s documentation has been loaded. Ten animation
 *   frames of `getElementById` never see it, and the reader is left at the top of the page
 *   with no error. So when the frames run out, everything still on demand is loaded and the
 *   search goes on — the same safety net `StyleGuide.loadDocsBeforeGivingUp()` is for an
 *   unmatched route;
 * - **the target moves after the scroll.** A link to a component near the end of the guide
 *   scrolls to a position clamped by a document that is shorter than it is about to be, so
 *   the containers left on screen *above* the target load, grow, and push it down — measured
 *   at up to about 1.7 screens on a 40-component guide, with the sidebar’s scroll-spy still
 *   highlighting the entry that was clicked. Nothing re-scrolled, because the element was
 *   found on the very first attempt and the initial scroll happens once.
 *
 * Both are the same routine: keep the target under the reader’s eyes while the page settles,
 * driven by “documentation arrived” rather than by a frame count, and stop as soon as the
 * reader takes over or SETTLE_MS has passed. Stopping matters as much as scrolling — a page
 * that keeps yanking itself back is worse than one that lands short.
 */
import { loadAllComponentDocs, subscribeToLoads } from './componentDocs.js';
import { getOriginId } from './handleHash.js';
import { readStickyOffset } from '../styles/styles.js';
import type * as Rsg from '../../typings/index.js';

/**
 * How many frames the search waits for its target before asking for the documentation of
 * the whole guide. `render()` commits asynchronously (React 18’s `createRoot`) and a lazily
 * loaded page can take a few more frames after that, so one attempt is not enough; ~10
 * frames is a sixth of a second, which is cheaper than a sweep of the guide.
 */
export const INITIAL_SCROLL_FRAMES = 10;

/**
 * How long the target is kept under the reader’s eyes, from the first attempt.
 *
 * Long enough for the components between the viewport and the target to load and grow
 * (measured in tenths of a second, not seconds, on a guide of any size), short enough that
 * a page which goes on loading for other reasons stops moving under a reader who has by
 * then started reading.
 */
export const SETTLE_MS = 3000;

/** Events that mean the reader has taken over and the page must stop moving itself. */
const TAKEOVER_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

/**
 * Scroll an element to the top of the viewport.
 *
 * On small screens the sidebar is a sticky header that would cover the target;
 * `scrollIntoView` aligns to the very top, so the same offset the `scroll-padding-top` in
 * styles.ts uses is subtracted here by hand.
 */
export function scrollToElement(element: HTMLElement): void {
	const offset = readStickyOffset();
	if (offset > 0) {
		const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
		window.scrollTo(0, Math.max(0, top));
	} else {
		element.scrollIntoView(true);
	}
}

export interface DeepLinkScroller {
	/** Honour the fragment of the address the page was *opened* with. */
	onLoad(): void;
	/** Honour a fragment the address has just changed to (`hashchange`). */
	onHashChange(): void;
	/** Stop whatever is in flight. Only used by the specs; a page lives longer than this. */
	cancel(): void;
}

export interface DeepLinkOptions {
	/**
	 * The section tree of the guide, as a getter: it is replaced on every hot update, and
	 * the safety net must load the components of the tree the page is rendering now.
	 */
	getSections: () => Rsg.Section[];
	/** Only for the specs, which have no rAF worth waiting 16 ms for. */
	now?: () => number;
}

/**
 * The one piece of state a page needs: what it is currently trying to scroll to.
 *
 * A second address (a `hashchange` while the first is still settling) cancels the first,
 * which is why this is a factory rather than two free functions.
 */
export default function createDeepLinkScroller({
	getSections,
	now = () => Date.now(),
}: DeepLinkOptions): DeepLinkScroller {
	let cancelCurrent: (() => void) | undefined;

	const cancel = () => {
		cancelCurrent?.();
		cancelCurrent = undefined;
	};

	const follow = (id: string) => {
		cancel();

		const deadline = now() + SETTLE_MS;
		let framesLeft = INITIAL_SCROLL_FRAMES;
		let askedForEverything = false;
		let stopped = false;
		let unsubscribe: (() => void) | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const stop = () => {
			if (stopped) {
				return;
			}
			stopped = true;
			unsubscribe?.();
			unsubscribe = undefined;
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
			TAKEOVER_EVENTS.forEach((type) => window.removeEventListener(type, stop));
			if (cancelCurrent === stop) {
				cancelCurrent = undefined;
			}
		};

		const nextFrame = (callback: () => void) => {
			/* istanbul ignore else: every browser has requestAnimationFrame; jsdom may not */
			if (typeof window.requestAnimationFrame === 'function') {
				window.requestAnimationFrame(callback);
			} else {
				setTimeout(callback, 0);
			}
		};

		/**
		 * Look for the element and, if it is there, put it back where the reader asked for it.
		 * Called on every frame until it is found, and on every load afterwards: a component
		 * that fills in above the target is what moves the target.
		 */
		const align = () => {
			if (stopped) {
				return;
			}
			const element = document.getElementById(id);
			if (element) {
				scrollToElement(element);
			} else if (framesLeft > 0) {
				framesLeft--;
				nextFrame(align);
			} else if (!askedForEverything) {
				// The fragment names something no rendered component has drawn — a heading
				// inside a Readme that has not been loaded. Load what is still on demand and
				// look again; a fragment that names nothing at all simply runs out of time.
				askedForEverything = true;
				loadAllComponentDocs(getSections());
			}
			if (now() >= deadline) {
				stop();
			}
		};

		// The reader wins, always: any deliberate move stops the page moving itself
		TAKEOVER_EVENTS.forEach((type) => window.addEventListener(type, stop, { passive: true }));

		// Documentation arriving is the only thing that changes where the target is. Two
		// frames, because the store resolves the import before React has re-rendered with it.
		unsubscribe = subscribeToLoads(() => {
			if (stopped) {
				return;
			}
			nextFrame(() => {
				align();
				nextFrame(align);
			});
		});

		// Nothing is guaranteed to arrive — a fragment that names nothing loads nothing — so
		// the end of the settling period is a timer of its own, and the only thing that is
		// certain to release the listeners above
		timer = setTimeout(stop, SETTLE_MS);
		timer.unref?.();

		cancelCurrent = stop;
		align();
	};

	return {
		onLoad() {
			// Only a fragment that names an element is acted on: the “otherwise scroll to the
			// top” branch below is deliberately not reused here, because on a load it would
			// fight the browser’s own scroll restoration on every routed page.
			const id = getOriginId(window.location.hash);
			if (id) {
				follow(id);
			}
		},
		onHashChange() {
			const hash = window.location.hash;
			if (!hash) {
				return;
			}
			const id = getOriginId(hash);
			if (id) {
				follow(id);
			} else {
				cancel();
				window.scrollTo(0, 0);
			}
		},
		cancel,
	};
}
