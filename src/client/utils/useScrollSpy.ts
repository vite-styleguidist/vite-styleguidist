import { useEffect, useRef, useState } from 'react';
import { readStickyOffset } from '../styles/styles.js';
import { getParameterByName } from './handleHash.js';

/**
 * How far below the sticky header the activation line sits, in pixels. An anchor becomes
 * the current one once its top edge has crossed that line going up.
 *
 * The line itself is `--rsg-sticky-offset + ACTIVATION_OFFSET`, read on every measurement
 * because the offset changes when the viewport crosses `mq.small` (the sidebar becomes a
 * sticky header there, ~105 px, and is 0 on wide screens). Keeping the activation line and
 * `scroll-padding-top` on the same variable is what makes a clicked anchor land exactly on
 * the line instead of a pixel above or below it.
 */
export const ACTIVATION_OFFSET = 8;

/**
 * How long a scroll still counts as “the browser finishing a hash navigation” rather than
 * “the reader scrolling”. Following a link makes the browser scroll, and that scroll must
 * not be allowed to move the highlight off the entry the reader just clicked.
 */
export const NAVIGATION_SETTLE_MS = 250;

export interface ScrollSpyOptions {
	/**
	 * When false the hook does nothing at all: no listeners, no observer, and the result is
	 * always `undefined`. This is how `scrollSync: false` and the display modes without a
	 * sidebar keep exactly the behaviour they had before the spy existed.
	 */
	enabled?: boolean;
	/** Distance below `--rsg-sticky-offset` where an anchor activates; see ACTIVATION_OFFSET. */
	activationOffset?: number;
}

/** `now()` that survives environments without `performance` (old jsdom, some test doubles). */
const now = (): number =>
	typeof performance !== 'undefined' && typeof performance.now === 'function'
		? performance.now()
		: Date.now();

/**
 * The id the current location points at, when it is one of `ids`.
 *
 * Two fragment shapes reach an element on the page, and the pin below has to recognise
 * both, because the two navigations that use this hook write different ones:
 *
 * - a plain `#slug`, which is what the sidebar links to in the default display mode;
 * - `#/Route?id=slug` (or `#!/Route?id=slug`), which is what an in-page link has to look
 *   like on a routed page, where the fragment *is* the route — the `?id=` parameter
 *   src/client/index.ts scrolls to, and the shape of every PageNav entry (getHeadingHref).
 *
 * Reading only the first shape is what made the pin dead for PageNav: `#/Files/One?id=x`
 * is never an element id, so `ids.includes()` failed and clicking an entry in the last
 * screenful highlighted the last one instead — the exact failure rule 5 of ADR 0015 exists
 * to prevent. A route *without* an `?id=` is still ignored, which is what keeps a plain
 * navigation (`#!/Button`) from pinning anything.
 */
function readHashId(ids: string[]): string | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	const hash = window.location.hash;
	if (hash.length < 2) {
		return undefined;
	}
	if (hash.startsWith('#/') || hash.startsWith('#!/')) {
		// `getParameterByName` decodes the value, the same way index.ts reads it
		const id = getParameterByName(hash, 'id');
		return id && ids.includes(id) ? id : undefined;
	}
	let id: string;
	try {
		id = decodeURIComponent(hash.slice(1));
	} catch {
		// A malformed escape (`#%`) throws; there is nothing to select then
		return undefined;
	}
	return ids.includes(id) ? id : undefined;
}

/**
 * Which of `ids` the reader is currently looking at, updated as the page scrolls.
 *
 * The hook is deliberately incurious about what the anchors are: it takes element ids and
 * returns one of them, so the sidebar can feed it component slugs and an “on this page”
 * rail can feed it heading ids (ADR 0016). It reads the DOM on every measurement, so ids
 * whose element is missing are simply skipped — a list that is a superset of what the page
 * renders is fine.
 *
 * Detection is a hybrid, because neither half is enough on its own (both measured, ADR
 * 0015): an `IntersectionObserver` triggers a recompute whenever an anchor enters or
 * leaves the viewport (it also catches layout shifts that move anchors without a scroll),
 * and a `requestAnimationFrame`-throttled `scroll` listener catches the fast scrolls an
 * observer misses — a 600 px wheel step can cross a whole activation band between frames.
 * Whatever the trigger, the answer is recomputed from element geometry, never from the
 * observer entries, so a missed callback can only delay the update by a frame.
 *
 * The three edge rules, all of which a purely “last anchor above the line” answer gets
 * wrong:
 *
 * - above the first anchor (the top of the document) the first anchor is current;
 * - at the bottom of the document the last anchor is current, even when its top never
 *   reaches the activation line because the page cannot scroll any further;
 * - a page that does not scroll at all has no bottom rule, otherwise every short page
 *   would permanently highlight its last anchor.
 *
 * Following a link *pins* the result: a `hashchange` to one of `ids` — written either as
 * `#slug` or as the `?id=` parameter of a routed fragment — selects that id at once and
 * geometry is ignored until the reader scrolls by hand (a `wheel` or `touchmove`,
 * or any scroll arriving more than {@link NAVIGATION_SETTLE_MS} after the navigation, which
 * covers the keyboard and the scrollbar). Without the pin, clicking an entry in the last
 * screenful of the document would highlight the last one instead.
 *
 * The hook never writes the URL, never dispatches events and adds no motion of its own, so
 * there is nothing here for `prefers-reduced-motion` to opt out of. It is safe on the
 * server and in jsdom: every effect is guarded, and a missing `IntersectionObserver` only
 * costs the trigger half.
 *
 * @param ids Element ids to watch, in any order (the answer comes from geometry, not order)
 * @param options See {@link ScrollSpyOptions}
 * @returns The id of the current anchor, or `undefined` while there is nothing to report
 */
export default function useScrollSpy(
	ids: string[],
	{ enabled = true, activationOffset = ACTIVATION_OFFSET }: ScrollSpyOptions = {}
): string | undefined {
	// `ids` is a new array on every render of the caller, so the effect depends on a joined
	// key (an element id cannot contain a newline) and reads the array itself from a ref.
	const idsKey = ids.join('\n');
	const idsRef = useRef(ids);
	// Refs must not be written while rendering, and effects run in declaration order, so
	// this one has replaced the list before the measuring effect below re-runs for a new
	// `idsKey` — and before any listener it registered can fire.
	useEffect(() => {
		idsRef.current = ids;
	});

	const [activeId, setActiveId] = useState<string | undefined>(() => readHashId(ids));

	// Timestamp of the last hash navigation while its scroll is still in flight; `undefined`
	// means “geometry decides”. A ref, not state: changing it must not re-render.
	const pinnedAtRef = useRef<number | undefined>(undefined);

	// A deep link (or a reload on a scrolled page) is a navigation like any other: the
	// browser scrolls to the fragment somewhere around mount, and until it has, geometry
	// would answer “the first anchor”. Mount-only, and before the effect that measures.
	useEffect(() => {
		if (readHashId(idsRef.current) !== undefined) {
			pinnedAtRef.current = now();
		}
	}, []);

	useEffect(() => {
		if (!enabled || typeof window === 'undefined') {
			return;
		}

		/**
		 * The current anchor, from geometry alone. `undefined` means “no answer” (none of the
		 * ids is in the DOM), which leaves the last known value in place.
		 *
		 * One pass, no sorting: the anchor with the greatest top at or above the line wins,
		 * and the topmost and bottommost anchors are collected in the same loop for the edge
		 * rules. That is O(anchors) `getBoundingClientRect()` calls per tick — 0.206 ms
		 * average at 306 anchors in Chromium (ADR 0015) — and it makes the order of `ids`
		 * irrelevant, so a caller cannot get it subtly wrong by listing them out of document
		 * order.
		 */
		const measure = (): string | undefined => {
			const line = readStickyOffset() + activationOffset;
			let above: { id: string; top: number } | undefined;
			let first: { id: string; top: number } | undefined;
			let last: { id: string; top: number } | undefined;

			for (const id of idsRef.current) {
				const element = document.getElementById(id);
				if (!element) {
					continue;
				}
				const { top } = element.getBoundingClientRect();
				if (!first || top < first.top) {
					first = { id, top };
				}
				if (!last || top > last.top) {
					last = { id, top };
				}
				if (top <= line && (!above || top > above.top)) {
					above = { id, top };
				}
			}

			if (!first || !last) {
				return undefined;
			}

			const root = document.documentElement;
			// `scrollHeight` is 0 in jsdom, which reads as “does not scroll” — the honest
			// answer for an environment without layout
			const scrolls = root.scrollHeight - window.innerHeight > 1;
			const atBottom = window.scrollY + window.innerHeight >= root.scrollHeight - 2;
			if (scrolls && atBottom) {
				return last.id;
			}
			return (above ?? first).id;
		};

		let frame = 0;

		const update = () => {
			frame = 0;
			if (pinnedAtRef.current !== undefined) {
				return;
			}
			const next = measure();
			if (next !== undefined) {
				setActiveId((current) => (current === next ? current : next));
			}
		};

		const schedule = () => {
			if (frame === 0) {
				frame = window.requestAnimationFrame(update);
			}
		};

		const handleScroll = () => {
			// A scroll that arrives once the navigation has settled is the reader’s own, from
			// the keyboard or the scrollbar — neither of which sends `wheel` or `touchmove`.
			if (pinnedAtRef.current !== undefined && now() - pinnedAtRef.current > NAVIGATION_SETTLE_MS) {
				pinnedAtRef.current = undefined;
			}
			schedule();
		};

		// Unambiguous reader input: release the pin without waiting for the settle window, so
		// scrolling away from a just-clicked entry updates the highlight on the same frame.
		const handleInput = () => {
			pinnedAtRef.current = undefined;
			schedule();
		};

		const handleHashChange = () => {
			const id = readHashId(idsRef.current);
			if (id !== undefined) {
				pinnedAtRef.current = now();
				setActiveId(id);
			}
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('wheel', handleInput, { passive: true });
		window.addEventListener('touchmove', handleInput, { passive: true });
		window.addEventListener('resize', schedule);
		window.addEventListener('hashchange', handleHashChange);

		// Trigger only; the geometry pass above is the answer. Default options on purpose: a
		// `rootMargin` built from the activation line would have to be rebuilt every time
		// `--rsg-sticky-offset` changes, and would buy nothing the scroll listener misses.
		let observer: IntersectionObserver | undefined;
		if (typeof IntersectionObserver !== 'undefined') {
			observer = new IntersectionObserver(schedule);
			for (const id of idsRef.current) {
				const element = document.getElementById(id);
				if (element) {
					observer.observe(element);
				}
			}
		}

		// The page may already be scrolled (a reload, a `key` change, a mode switch)
		update();

		return () => {
			if (frame !== 0) {
				window.cancelAnimationFrame(frame);
			}
			observer?.disconnect();
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('wheel', handleInput);
			window.removeEventListener('touchmove', handleInput);
			window.removeEventListener('resize', schedule);
			window.removeEventListener('hashchange', handleHashChange);
		};
	}, [enabled, idsKey, activationOffset]);

	// Turning the spy off hides whatever it had found, so a consumer never has to remember
	// to ignore the result itself
	return enabled ? activeId : undefined;
}
