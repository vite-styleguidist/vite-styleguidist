# 0013: React 16.14 and 17 support

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The first prereleases required React 18 or newer, although the maintainer’s own company, like many teams with a large component library, is still on React 16. A survey of the client code (`src/client/**`, the browser part of the loaders and the Vite plugin) found only one React-version-sensitive construct: the static `import { createRoot } from 'react-dom/client'` at the two mount sites, the page root in `src/client/index.ts` and each example preview in `rsg-components/Preview`. Everything else the style guide uses (hooks, `createContext`, `Suspense` and `React.lazy`, `componentDidCatch`, refs on DOM elements) exists since React 16.6, and the style guide is compiled with the automatic JSX runtime (`react/jsx-runtime`), which first shipped in 16.14. So 16.14 is the natural floor.

`react-dom/client` does not exist before React 18, and the specifier is resolved at transform time: on React 16 and 17 the production build fails in Rolldown (“failed to resolve import”) and the dev server serves Vite’s error page for the entry module, before any runtime check could run. A spike on the packed tarball confirmed this on 16.14.0 and 17.0.2, and confirmed that with the import replaced by a version-appropriate root everything else works: both examples render, hooks examples update, View Code, editing, compile errors and the dark toggle all pass in headless Chromium with zero page errors.

Two dependencies stood in the way at install time: our own `peerDependencies` (`react >=18.0`) and `react-group`, a 30-line component declaring `react >=18` as a peer although its code has worked since 16. The test tooling is a third constraint: `@testing-library/react` 16 needs React 18 or 19, so the unit tests cannot run on 16 or 17.

## Options considered

1. **A root module selected at config time from the project’s `react-dom` (chosen).** Two files that never import each other, `reactRoot.modern.ts` (`createRoot`) and `reactRoot.legacy.ts` (`ReactDOM.render` / `unmountComponentAtNode`), both exporting `mountRoot(node): { render, unmount }`. The client imports the bare specifier `rsg-react-root`, which the Vite config aliases to one of them after resolving `react-dom/package.json` from the style guide’s config directory (Node resolution, so a copy hoisted to the root of a monorepo is found) (`getReactRootFlavor()` in `src/scripts/make-vite-config.ts`; major 18 or newer is modern, older is legacy, and an unresolvable, unparseable or `0.0.0-experimental-*` version is modern). Only one branch is ever bundled, so neither React sees an import it cannot satisfy.
2. **Dynamic `import(/* @vite-ignore */ 'react-dom/client')` guarded by a runtime check.** Leaves a bare specifier in the browser bundle, which browsers reject, and makes mounting asynchronous.
3. **Externalising `react-dom/client`** (`build.rolldownOptions.external`, `optimizeDeps.exclude`) on 16 and 17. Also leaves the bare import in the bundle, and ships dead `createRoot` code.
4. **A runtime feature check on the `react-dom` default export.** Needs `createRoot` from `react-dom` itself, which React 18 warns about and React 19 removed, so it still needs the `react-dom/client` import somewhere.
5. **Keep `react-group` and pin 3.0.2** (peer `react >=16`). Works, but keeps a dependency for 30 lines of code; inlining it as `rsg-components/Group` (MIT, same author as Styleguidist) removes the install warning entirely.

## Decision

Option 1, with `react-group` inlined (option 5 rejected), a peer range of `react` and `react-dom` `>=16.14.0`, and the modern branch as the fallback when `react-dom` is not resolvable (Preact-only projects; `preact/compat` provides both APIs). The Vite alias is typed for the repo through a `tsconfig.json` path and a Vitest alias that both point at the modern file, so type-checking and unit tests use the API of the React the repo develops against.

`Preview.handleError` now defers its `setState` to a macrotask, the way the preview unmount already was: a compile error is reported synchronously from inside the example’s `render()`, and React 16’s render-phase guard is renderer-wide, so the synchronous update logged “cannot update during an existing state transition” in development builds of React 16 (17 and later only complain about the component that is itself rendering).

## Consequences

- React 16.14, 17, 18 and 19 are supported. Dropping 16 or 17 later is a breaking change under the [support policy](../Compatibility.md#support-policy) and happens only in a major release.
- CI gains a `react-compat` matrix job (16.14.0, 17.0.2, 18.3.1) that swaps React after `npm ci`, compiles, builds the eight examples and runs the Playwright suite; the three checks must be added to the `main` ruleset by hand. The unit tests keep running on React 19 only, so the legacy root is covered by the browser tests, not by Testing Library.
- The published `.d.ts` files are generated against `@types/react` 19 and use the `React.JSX` namespace, which the latest `@types/react` 16.14.x and 17.0.x backport; older type packages need `skipLibCheck`. Documented in [Compatibility](../Compatibility.md).
- A style guide built in a project whose `react-dom` is later upgraded across the 17/18 boundary picks the other branch on the next build, with no configuration: the choice is logged in verbose mode (`Found react-dom <version>, mounting with ...`).
