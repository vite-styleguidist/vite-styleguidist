# 0010: Code editor

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The live editor under every example was [react-simple-code-editor](https://github.com/react-simple-code-editor/react-simple-code-editor) 0.14 (a text area with a Prism-highlighted `<pre>` behind it). It was small, about 13 kB gzipped for the editor and Prism together, but it was also the weakest part of the UI: an unlabelled text area, Tab captured with no way out for keyboard users (a WCAG 2.1.2 keyboard trap), no bracket matching, autocompletion, search or multi-cursor, and highlighting limited to Prism’s `jsx` grammar although examples may be TypeScript. The package is a low-activity 0.x CommonJS module that needed an ESM interop workaround in the build. `styleguideComponents.Editor` already replaced the editor through a Vite alias, but that was undocumented and its props were an accident of how the slot passes them on.

The whole editor stack was imported statically, so it shipped in the initial bundle although a page mounts no editor until someone clicks “View Code” (`exampleMode` defaults to `collapse`). Any richer editor costs an order of magnitude more, so how it is loaded matters as much as which one it is.

## Options considered

1. **Keep react-simple-code-editor and polish it**: label the text area, add an Escape hatch for Tab, keep the bundle as is. Fixes the accessibility defects, leaves the editor basic and the dependency unmaintained.
2. **CodeMirror 6 as the default editor**, loaded on demand: a modular, actively maintained editor with a JavaScript/JSX/TypeScript grammar, accessibility built in (a labelled `role="textbox"`, a “tab focus mode” that lets Tab through after Escape), and a state model that fits a controlled `code` prop. Costs about 154 kB gzipped, hence the lazy loading. Needs the Prism colour theme mapped so `theme.color.code*` keeps working, and layout stubs to run under jsdom.
3. **Monaco**: the richest editing experience, but 595 kB gzipped for the core plus a 1.45 MB TypeScript worker, worker plumbing that leaks into users’ Vite configuration, and a per-instance cost that a page with 10–20 editors and `exampleMode: 'expand'` cannot afford.
4. **Lightweight default, CodeMirror as an opt-in entry point** (`vite-styleguidist/lib/client/editors/codemirror.js` with optional peer dependencies): the smallest default, but two editors to theme, test and document, and the good editor is the one nobody gets unless they read the docs.

## Decision

**CodeMirror 6 is the default editor in 1.0**, built from `@codemirror/state`, `view`, `language`, `commands`, `autocomplete`, `search` and `lang-javascript` (`{ jsx: true, typescript: true }`) with `@lezer/highlight`, and **loaded on demand**: the `exampleTabs` slot registers `Editor/EditorLoader.tsx`, which `React.lazy`-imports `rsg-components/Editor` inside a `Suspense` whose fallback is the code in a `<pre>` styled to the editor’s exact metrics. The editor’s chunk is fetched the first time “View Code” is clicked. `react-simple-code-editor` is removed; `prismjs` stays, it still highlights static code blocks at build time.

Feature set: history, `defaultKeymap`, bracket matching and closing, basic autocompletion, the search keymap, `indentWithTab`, line wrapping, no line numbers, no active-line highlight. Keyboard users leave the editor with Escape then Tab (CodeMirror’s built-in tab focus mode, armed for two seconds by Escape); the content element carries `aria-label="Code editor"` and an `aria-description` saying so.

Theming keeps the Prism contract instead of re-implementing it: the highlighting is a `HighlightStyle` whose rules map Lezer tags to Prism’s token class names (`token keyword`, `token string`, `token tag`, …) and carry no colours, so the existing `prismTheme()` JSS rules driven by `theme.color.code*` colour the editor exactly as they colour static code blocks (`Editor/prismHighlightStyle.ts`). The editor’s frame (font, background, border, focus ring) is JSS too, on the Editor’s `root` rule, rather than an `EditorView.theme`: JSS already merges the user’s `theme`, applies the `styles` option and hot-reloads, and a CodeMirror theme extension would have to duplicate all three. `EditorView.theme` is only worth it for values JSS cannot reach, and there are none.

The `code` prop is controlled while CodeMirror owns the document: every change is reported through `onChange` at once and Playground debounces it by `previewDelay`. A `code` prop equal to the document is a no-op (cursor untouched); one that matches a value the editor reported a moment ago is a stale echo and is ignored so the keystrokes typed after the debounce fired are not lost; anything else (hot reload, reset) replaces the text keeping the selection offsets. The props a replacement receives (`code`, `onChange`, `evalInContext`, `name`, `active`, `onClick`) are now the public `EditorProps` type (`src/typings/RsgEditor.ts`), documented under `styleguideComponents.Editor` with a Cookbook recipe.

## Consequences

- Measured on `examples/basic` (minified, gzip via `gzip -c | wc -c`): the initial bundle goes from 1,113,703 B / 302,966 B gzip to 1,076,051 B / 292,822 B gzip (−10 kB gzip, the editor and Prism’s browser copy leave it), and a separate `Editor.[hash].js` chunk of 474,676 B / 153,907 B gzip is fetched on the first “View Code” click. The main bundle contains no `@codemirror` code. A user who replaces the editor never downloads the chunk, and it is left out of their build entirely.
- Eight new runtime dependencies (`@codemirror/*` ×7, `@lezer/highlight`) on their own release trains; `react-simple-code-editor` and its ESM interop workaround are gone. Prism stays a dependency for static highlighting.
- The rule keys of the `Editor` component are unchanged (`root`); user themes and `styles.Editor` overrides keep working, including `styles.Editor.root['& .token.keyword']`-style tweaks. The look changes in details: native selection and caret, CodeMirror’s autocompletion and search panels, and a focus ring instead of the text area’s outline. Font size stays `fontSize.small` to match static code blocks.
- Tests stay on jsdom: CodeMirror only needs `Range.prototype.getClientRects()`/`getBoundingClientRect()` stubs returning empty rectangles (`test/setup.ts`), `ResizeObserver` and `IntersectionObserver` are feature-detected. Specs drive the editor through `EditorView.findFromDOM()` or by mutating the contenteditable, not through a text area.
- The Cypress spec that typed into a `textarea` is obsolete; its Playwright replacement must type into `.cm-content` (the Playground unit spec already covers keystroke → preview).
- With `exampleMode: 'expand'` on a page with many examples every editor mounts at load; CodeMirror instances are heavier than text areas, and this is the configuration to watch in the beta. A virtualised mount is the fallback if it turns out to be a problem.
- The editor’s accessible name is a fixed “Code editor”; naming it after the example needs Playground to pass the example name into the slot props, a small additive change to the contract that can land later without breaking anything.
