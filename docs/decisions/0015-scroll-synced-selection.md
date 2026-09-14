# 0015: Scroll-synced selection and hash

- **Date:** 2026-09-07
- **Status:** accepted

## Context

Clicking a sidebar entry scrolls to the component and sets the hash; scrolling by hand changes neither the selection nor the URL, so on a one-page style guide the sidebar highlight is wrong for most of the time a reader spends on the page.

Three things about the current machinery decide what is possible. First, the hash is a route in two of the three modes: `#!/Button` isolates (`getInfoFromHash`), `#/Section/Name` is the `pagePerSection` route, and only the default mode’s `#slug` is an inert anchor (`getRouteData` sees `{}` for it). Second, selection is a pure function of `window.location` evaluated during render (`TableOfContents.tsx`), and the only thing that re-renders on a URL change is the `hashchange` listener in `src/client/index.ts`. Third, that same file registers `scrollToOrigin` on `hashchange`, which scrolls the page to the hash target.

A prototype against the built `examples/basic` guide (Chromium, 1280×800, 20 wheel steps) measured the three ways to write the URL: `history.replaceState` alone left the highlight untouched (`aria-current` on nothing) and history length unchanged at 2; `replaceState` plus a synthetic `hashchange` moved the highlight correctly but `scrollToOrigin` yanked the viewport back **4 times** in one scroll; `location.hash = id` also worked but grew `history.length` from 3 to 8, one entry per heading crossed. An observer-only design (a 120 px band under the sticky header) missed activations when a wheel step crossed the whole band between frames; recomputing from geometry on every observer tick _and_ on an rAF-throttled scroll listener tracked all six components in both directions. Cost with 306 anchors over a 168,861 px document: 240 recomputes, 49.4 ms total, 0.206 ms average, 1.4 ms worst case.

## Options considered

1. **Write the hash as a navigation** (`location.hash = id`). Selection follows for free, because the app already re-renders on `hashchange`. Rejected: measured +5 history entries for a single page scroll, and `scrollToOrigin` fights the reader.
2. **`replaceState` plus a synthetic `hashchange`.** No history growth, selection follows. Rejected as the primary mechanism: `scrollToOrigin` still fires (4 measured scroll jumps), so it would need `index.ts` to learn which hashes the spy wrote — more moving parts than driving the highlight from state.
3. **Highlight from React state, URL written only with `replaceState` and no event** (chosen). Nothing observes the write, so nothing fights it; the URL half becomes optional because the highlight no longer depends on it.
4. **Do nothing / document it as intended.** Rejected: the sidebar is wrong most of the time on the default one-page guide, which is the shape most style guides have.

## Decision

Add a `useScrollSpy` hook (`src/client/utils/useScrollSpy.ts`) and a `ScrollSyncedToc` component that mounts it **around the sidebar only**, plus a `scrollSync` config option with three values: `false` (pre-1.0 behaviour), `'selection'` (default — the highlight follows the scroll, the URL is never touched) and `'hash'` (highlight plus `history.replaceState` of the fragment). The contract:

1. **The spy never fires `hashchange` and never calls `pushState`.** URL writes are `replaceState` only, debounced 150 ms after scrolling settles and skipped when the value would not change (WebKit throttles `replaceState` to 100 calls per 30 s). `src/client/index.ts` is untouched.
2. **The route part of a hash is never rewritten.** The URL is only ever written when the current fragment is a plain anchor: a fragment that starts with `#/` or `#!/` is left alone, so the view cannot change underneath the reader.
3. **The spy is off wherever there is nothing to follow**: any display mode but the default one, `showSidebar: false`, and `pagePerSection` (one component per page means no component-level anchors — measured: zero on the sections example’s landing page).
4. **Detection is a hybrid**: an `IntersectionObserver` as a trigger, an rAF-throttled scroll listener as the safety net, and the active anchor recomputed from element geometry each tick against an activation line of `--rsg-sticky-offset + 8px`, with “document bottom → last anchor”, “above the first anchor → first anchor” and no bottom rule at all for a page that does not scroll.
5. **Following a link wins over geometry until the reader scrolls.** A `hashchange` to a watched id selects it immediately and pins it — the id written either as a plain `#slug` or as the `?id=` parameter of a routed fragment, which is the only in-page link a routed page can carry (0016) and the shape `src/client/index.ts` already scrolls to; the pin is released by a `wheel` or `touchmove`, or by any scroll arriving more than 250 ms after the navigation (the keyboard and the scrollbar send nothing else). Without it, clicking an entry in the last screenful would highlight the last one instead, because the page cannot scroll far enough to put the clicked anchor on the activation line.
6. **Selection stays a prop.** `TableOfContents` gains an `activeSlug` input that wins over the route match while it is set, and is `undefined` whenever scroll sync is off or the spy has no answer yet, which is what keeps the pre-1.0 behaviour. Overrides of `TableOfContentsRenderer`/`ComponentsListRenderer` keep receiving `selected` and are unaffected; an override of `TableOfContents` itself that ignores the new prop degrades to “no scroll highlight”.
7. `'selection'` is the default because it changes nothing that is scriptable or documented; `'hash'` is opt-in because the URL is both.

## Consequences

- The first sidebar entry is highlighted as soon as a guide loads, where before 1.0 nothing was highlighted until the reader navigated. `scrollSync: false` restores that.
- With `scrollSync: 'hash'`, the current history entry remembers the last scrolled fragment rather than the clicked one, so Forward after Back returns the reader to where they stopped reading. Back itself is unaffected (measured: history length constant across a full-page scroll).
- Code that listens for `hashchange` to detect navigation will not see scroll-driven changes; code that polls `location.hash` will. Both go in the 1.0 release notes.
- The small-screen chip row stops falling back to a route prefix match once the spy has an answer: the route names the entry the reader clicked, and both would be current at once.
- A selection the reader cannot see says nothing, so both navigations bring the current entry inside their own scroll container when it moves out of it (`src/client/utils/keepInView.ts`): the small-screen chip row is a horizontal scroller whose current chip drifted 197 px past its right edge on the `basic` example at 390 px, and a sidebar taller than the window does the same vertically. Only the container scrolls — `scrollIntoView` would walk up to the viewport and move the very page scroll that chose the entry.
- With `tocMode: 'collapse'` the entry the spy picks is usually inside a section that is not rendered, so the section itself carries the mark while it is closed (the chip row already marked its ancestors that way). Without it the default `scrollSync` highlighted the first section on load and nothing at all afterwards — measured on the `mdx` example, no highlight at 14 of 21 scroll positions. A closed section is _not_ re-opened by the spy: re-opening one the reader has just collapsed would be worse than saying where they are and leaving it shut.
- `pagePerSection` guides gain nothing from this record at component granularity. Heading-level navigation for those pages is [0016](0016-table-of-contents.md).
- `useScrollSpy` is the shared mechanism 0016 consumes: it takes element ids and returns one of them, knowing nothing about what the anchors are, so only one implementation of scroll-spy exists in the client.
- The per-tick cost is O(anchors) `getBoundingClientRect()` calls: 0.206 ms average at 306 anchors in Chromium. The React re-render cost on a guide with hundreds of components was not measured; scoping the state to the sidebar subtree is what keeps it from mattering.
- Existing e2e specs are unaffected (`component.spec.ts` and `mdx.spec.ts` use isolated views; `examples.spec.ts` crawls hrefs and asserts nothing about hash stability). New specs must not assume the hash is constant while scrolling.
