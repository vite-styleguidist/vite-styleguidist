# 0019: On-demand component documentation

- **Date:** 2026-09-07
- **Status:** accepted

## Context

The style guide module (`src/vite/modules/styleguide.ts`) described every component of a guide with two static imports: `rsg-props:<file>`, which carries what react-docgen and the Markdown pipeline produced, and the component’s own module. Everything the browser could ever need was therefore in the first script it downloaded, whether the page showed it or not.

Measured on the performance harness at 350 components (Mac14,6, Node 26.7, Vite 8.2 / rolldown, median of three, `styleguide.config.js` with default options):

|  | production build | dev server |
| --- | --- | --- |
| entry chunk | 4,711,285 bytes (2 scripts in total) | — |
| bytes before the first render | 4,711,285 | 43.7 MB over **1130 requests** |
| time to the first render | — | 2759 ms of fetching |
| cold build | 2580–2600 ms, peak RSS 820 MB | — |

Two thirds of those bytes are documentation of components the reader is not looking at, and in `pagePerSection` — one section per page — the proportion is worse still: every page carries every other page.

The shape of the client decides what is possible. The section tree is rebuilt outside React on every render (`renderStyleguide` → `processSections`), and the sidebar, the routes and the page title are all functions of it: `processComponents` reads `component.props.displayName` for the component’s name, `ComponentsList` drops any entry without a `visibleName`, and `getRouteData` matches a route against `component.name`. So the tree cannot simply lose the documentation — it has to keep an identity for every component, and it has to keep it **without parsing the component**, because parsing is the expensive half of a build (react-docgen is 74% of the plugin’s `load` hook at this size) and doing it while the tree is generated would pay for it twice per build.

The React floor is 16.14 (ADR 0013), and `src/client/index.ts` mounts through either `createRoot` or `ReactDOM.render`.

## Options considered

1. **Do nothing.** Rejected: 4.7 MB and 1130 dev requests is the shape of a real design system, not a synthetic worst case, and the number grows linearly with the guide.
2. **Split the chunks without changing the imports** — `advancedChunks` grouping the documentation modules per section, which is what the harness’s `styleguide.config.chunked.js` measured. It moves the bytes out of the entry (4708 kB → 1079 kB) but changes nothing for the reader: the imports are still static, so the browser is still told to fetch all of them, and the dev server still serves 1130 modules. Rejected as a solution, kept as a recipe (see Consequences).
3. **`React.lazy` + `Suspense` per component.** Works on 16.14, but a suspended component renders a fallback instead of its container, and the containers are what the sidebar links, the scroll spy, the deep links and the e2e specs address. It would also make the loading state a render-time concern of every parent. Rejected.
4. **Parse every component while the tree is generated**, so the tree can carry the real `displayName`, and keep the documentation behind a loader. Rejected: `generatePropsModule` does not read the parse cache, so a build would run react-docgen twice per component — the one thing that must not get slower.
5. **A loader per component, resolved by the display mode and by the viewport** (chosen), with the tree carrying the name the component’s file path gives it until the documentation says otherwise.

## Decision

Add a `lazyDocs` config option, `true` by default. With it on, the serializer emits each component’s documentation behind a loader and the client resolves it when the component needs it.

1. **What leaves the tree**, per component: `props` (the `rsg-props:` module) and `module` (the component itself). Both are behind one `loadDocs` function — `() => Promise.all([import(…), import(…)]).then(…)` — which a `LazyMarker` (`src/typings/RsgImportMarker.ts`) turns into literal `import()` calls, the only form a bundler can follow.
2. **What stays**: `filepath`, `slug`, `pathLine`, `hasExamples`, `metadata` — a plain `.json` file next to the component, small, usually absent and read by the component toolbar on the first paint — and `nameFromPath`, the name `getNameFromFilePath()` derives from the file, which is also react-docgen’s own fallback for a component it cannot name. The sidebar, the routes, the headings and the anchors are drawn from those alone.
3. **The name is provisional.** `processComponents` uses `displayName` when the documentation is there and `nameFromPath` before that, and `filterComponentsByExactName` matches **either**, so a link minted before a load still resolves after it. When a loaded `displayName` or `visibleName` turns out to differ from the file-path name, the whole guide is re-rendered so that the sidebar, the hrefs and the routes agree with it; when it does not — the overwhelmingly common case — nothing but the component itself re-renders.
4. **When a component loads its documentation.** At once when the page _is_ that component: any display mode but the all-in-one one (the isolated `#!/Name` view, a single section, a single example), and the element a deep link points at. Otherwise when its heading comes near the viewport, watched with an `IntersectionObserver` at `rootMargin: '0px 0px 1200px 0px'` — generous downwards, nothing upwards, because filling a container above the viewport would move the page under the reader and would move a deep link’s target away from where the browser has just scrolled. `pagePerSection` needs no rule of its own: only the current section is rendered, so only its components can be near the viewport.
5. **Nothing is ever left unloadable.** A component whose anchor cannot be found — a replaced `ReactComponent` that renders none — and a browser without `IntersectionObserver` load right away. A route that matches nothing loads whatever documentation is still on demand and routes again before rendering “page not found”, which is the safety net behind the provisional names.
6. **No Suspense, no context.** The answers live in a module-level store (`src/client/utils/componentDocs.ts`) that the plain functions rebuilding the tree can read as well as the components can. A component subscribes to its own file and re-renders itself; whole-guide re-renders are asked for only by 3 and by 4’s first sentence, and are coalesced into one per animation frame.
7. **A component whose documentation has not arrived** renders its container, its heading, its path line and an empty placeholder documentation object — no description, no props, no methods, no examples, and `docsLoaded: false`. The default renderer shows no examples and, unlike a component that really has none, no “add examples to this component” hint.
8. **`styleguideComponents` overrides keep their props.** `Sections`, `Components` and `ReactComponent` are called exactly as before, with a `component` of the same shape; 7 is what a replacement sees until the load, and `docsLoaded` is how it can tell. Documented in the Cookbook.
9. **`lazyDocs: false` restores the previous module byte for byte**, and the unit specs assert both shapes.
10. **Hot module replacement is unchanged.** The dynamic import is still an edge in Vite’s module graph, so an edited component or Readme still propagates from `rsg-props:` through the style guide module to the client’s `import.meta.hot.accept` (asserted by `src/vite/__integration__/devServer.spec.ts`). The client re-imports through the new module’s loaders the documentation that is already on the page, and keeps rendering the old answer until the new one arrives.

## Consequences

- **Measured at 350 components**, same harness and method as the Context table:

  |  | `lazyDocs: false` | `lazyDocs` (default) |
  | --- | --- | --- |
  | entry chunk | 4,711,285 bytes | 1,198,154 bytes (−75%) |
  | bytes before the first render (build) | 4,711,285 | 1,198,154 |
  | scripts emitted | 2 | 702 |
  | all scripts together | 5,187,263 bytes | 5,326,553 bytes (+2.7%) |
  | dev requests before the first render | 1130 | **67** |
  | dev bytes / time before the first render | 43.7 MB / 2759 ms | 14.0 MB / 344 ms |
  | dev, plus the first ten components | — | 99 requests / 15.0 MB / 482 ms |
  | cold build | 2580–2600 ms | 2710–2730 ms (**+5%**) |
  | peak RSS | 820 MB | 763 MB (−7%) |

- **The cold build is about 140 ms slower at 350 components**, which is the bundler emitting 702 chunks instead of 2, not extra parsing: the plugin does exactly the same work. The cost is proportional to the number of chunks — grouping them per section brings the build back to 2590 ms — and is invisible on a small guide (the ten example builds are unchanged).
- **Chunk count is the price of the smallest possible first paint.** Grouping is all-or-nothing: with one chunk per section, a single component the first page needs pulls its whole section in, and the measured first paint went from 1.20 MB (702 files) to 1.21 MB (353 files, one chunk per component) to 1.92 MB (13 files, one per section). The default is therefore no grouping at all, and the Cookbook carries the `advancedChunks` recipe for guides that would rather have fewer files.
- **A component’s own stylesheet now loads with its documentation**, so it is appended to the document _after_ the style guide’s own runtime styles instead of before them. A rule of yours that ties with one of ours on specificity now wins where it used to lose. Seen in `examples/basic`: the `.checks` class the `{ "props": { "className": "checks" } }` fence documents draws its transparency checkerboard now and did not before. Everything else in the before/after screenshots of the `basic` and `sections` examples is identical, pixel for pixel (masking `RandomButton`, which picks its label at random on every render).
- **A style guide where a component’s `displayName` is not the name of its file** — `Foo/Foo.js` exporting a component react-docgen resolves as `Bar` — shows the file-path name in the sidebar until that component’s documentation is loaded, and its own name afterwards. Both resolve as a route the whole time. `docs.json` and `llms.txt` are unaffected: they are built on the Node side from the same section tree, before it is made lazy.
- **`@visibleName` still works** and reaches the sidebar as soon as the component is loaded; on the all-in-one page that is on the first render for everything near the viewport (verified end to end on `examples/basic`, whose `PushButton` is documented as “Push Button 🎉”).
- **Section content pages stay eager.** There are as many of them as there are sections, not as there are components, and the tree needs their prose to render a section. Making them lazy is additive and needs nothing here to change.
- **`component.module` is loaded with the documentation**, which is a second dynamic import per component and half of the 702 chunks. Nothing in the client reads it; it is kept because it is part of the public `Rsg.Component` shape a replaced renderer may use, and because it is the only thing that puts a component with no examples file into the bundle at all.
- **The store is keyed by file**, so a component listed in two sections is fetched once and both entries show it.
- **A failed import is reported to the console and retried** the next time something asks for that component (scrolling past it again, a hot update). It is not rendered as an error in the page: the component keeps its container and its heading, exactly as it has while loading.
- **The e2e suite gained five cases** (`test/e2e/lazy-docs.spec.ts`): containers before any documentation, a body appearing on scroll, a deep link to the last component, the isolated view, and — with request interception on the built `sections` example — a `pagePerSection` page fetching its own section’s documentation and no other’s. The scroll case narrows the observer’s look-ahead to zero for that one page, because the six components of the `basic` example fit inside 1200 px of empty containers and there would otherwise be nothing left below the fold.
