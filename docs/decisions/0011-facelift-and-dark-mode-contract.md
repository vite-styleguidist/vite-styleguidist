# 0011: Facelift and dark-mode contract

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The default style guide has not changed visually since 2016, ships no dark mode, and its default palette fails WCAG AA contrast on seven foreground/background pairs (for example `linkHover` `#e90` on white at 2.28:1, which is every link hover, tab focus outline and active tab underline). A survey of the client styling stack found that the surface is small and already tokenised: 45 components wrapped in `Styled()`, 100 JSS rule keys, 26 colour tokens in `src/client/styles/theme.ts`, and exactly two hard-coded colours outside the token set (a tooltip box-shadow and the ribbon text-shadow). It also found that `jss-plugin-isolate` resets no custom properties (`css-initials` contains no `--*` entries), so CSS variables inherit straight through the isolation reset.

Three things constrain how a facelift can land. First, the public customisation contract is three config options that must keep working unchanged: `theme` (a deep-merged token object, also passed to `styles` functions), `styles` (JSS objects merged into any of the 100 rule keys, addressed by component name and rule key) and `styleguideComponents` (replacement renderers). Twenty-seven of the 78 client spec files and both Cypress specs assert on generated `rsg--<ruleKey>-…` class names. Second, numeric tokens (`space`, `fontSize`, `borderRadius`, `maxWidth`, `sidebarWidth`) cannot become CSS variables: `jss-plugin-default-unit` appends `px` to numbers and components do arithmetic on them (`marginLeft: -space[1]`). Third, timing: [0003](0003-versioning-and-release-channels.md) closes the `next` channel once 1.0.0 is promoted, so a visible change to the default appearance is free during the beta and a surprise in any later minor.

Two latent bugs were found in the same pass and are fixed under this record because the fixes are only free while `next` is open: `PlaygroundRenderer` renders `classes.tabs` without declaring a `tabs` rule (so `styles.Playground.tabs` silently does nothing), and the props `TableRenderer` and the Markdown `TableRenderer` share the component name `Table`, so the style sheet cache in `createStyleSheet.ts` handed one of them the other one's classes.

## Options considered

1. **Token-level refresh inside JSS, with CSS custom properties for colours.** New palette and type scale applied through the existing tokens; colour tokens become `var(--rsg-color-<name>, <light value>)` strings; a global variable sheet defines the light and dark values; rule keys are only ever added. Not breaking: every `theme` key and every `styles` rule key survives. Bundle delta about zero (JSS stays, the variable sheet is runtime-injected CSS, the toggle is under 1 KB).
2. **Styling-system migration** to CSS modules or vanilla-extract, dropping JSS. Removes an unmaintained 2019 dependency and 41 KB minified, but breaks `styles` outright (it is a JSS object merge), loses the `jss-plugin-isolate` guarantee that style-guide CSS never leaks into rendered user components, and needs a 2.0 beta on a project that has not shipped 1.0.0. Deferred to a future record.
3. **Contrast fixes only**, no facelift, no dark mode. Pays the same “default appearance changed” communication cost as option 1 for a fraction of the benefit, and dark mode is table stakes for a documentation tool.

For dark mode specifically:

- **CSS custom properties switched by a root attribute and a media query** (chosen). Works inside the existing JSS system without touching the isolation plugin, needs no re-render to switch, and lets a plain stylesheet override any colour.
- **A second JS theme object (`theme.colorDark`) swapped at runtime.** Doubles the token surface, forces a full re-render and re-creation of every style sheet on toggle, and makes user `styles` functions scheme-aware.
- **Dark mode opt-in via config.** Safe for users who override colours, but hides the feature from everyone else; rejected in favour of an explicit override rule (below) plus a config option to force one scheme.

## Decision

Option 1, landed before 1.0.0 is promoted from `next`, in two stages: this record and the plumbing first (visually a no-op in light mode), then the designed palette once mockups are approved. The contract:

1. **Colour tokens are CSS custom properties.** Every `theme.color.*` value is the string `var(--rsg-color-<name>, <light value>)`, where `<name>` is the token name in kebab-case (`baseBackground` is `--rsg-color-base-background`). The light value doubles as the fallback, so a token still works where the variable sheet is not attached (tests, components rendered outside the style guide).
2. **Numeric tokens stay numbers.** `space`, `fontSize`, `borderRadius`, `maxWidth`, `sidebarWidth` and `spaceFactor` keep their types; they are not part of dark mode.
3. **Rule keys and token names are append-only.** A rule key or token is never renamed or removed in a minor or patch release. New keys are added next to the old ones (`Playground.tabs` next to `Playground.tab`).
4. **Overriding a colour token opts that token out of dark mode.** A user who sets `theme.color.baseBackground = '#fdfdfc'` gets a literal value that no longer switches; they own both schemes for that token. To keep dark mode, users override the CSS variable instead (`--rsg-color-base-background` on `:root` and on `[data-rsg-theme="dark"]`), or set `colorScheme` to force one scheme.
5. **The global variable sheet** (`src/client/styles/cssVariables.ts`) defines `:root` (light values), `[data-rsg-theme="dark"]` (dark values) and `@media (prefers-color-scheme: dark) { :root:not([data-rsg-theme="light"]) }` (dark values for the system setting). The `data-rsg-theme` attribute on `<html>` holds the applied scheme: absent means “follow the system”.
6. **A `colorScheme` config option** (`'system'`, the default, `'light'` or `'dark'`) sets the scheme the page starts in. `'light'` and `'dark'` force that scheme and hide the toggle; `'system'` follows `prefers-color-scheme` and shows a system/light/dark toggle in the sidebar header whose choice is stored in `localStorage` under `rsg-color-scheme`. The generated HTML applies the stored or configured choice in an inline script before the first paint, so there is no flash of the wrong scheme.
7. **Generated class names are deterministic.** The `rsg--<ruleKey>-<n>` suffix is derived from the component name and its rule keys instead of a global counter, so adding a rule to one component no longer renumbers every other component’s classes.
8. **The dark palette shipped with the plumbing is provisional**: the light greys have their lightness inverted and brand hues are kept, so the toggle demonstrably works. The designed palette (light and dark, every pair at 4.5:1 or better) replaces those values in a later commit without changing any name.

## Consequences

- `examples/themed` and `examples/customised` keep working unchanged; they are the regression test for the `theme`/`styles` contract. `examples/customised` pins `baseBackground`, so under a dark system setting it shows dark text tokens on its light background: that is the documented consequence of rule 4 and the reason `colorScheme: 'light'` exists.
- Anything a user does with `theme.color.*` in JavaScript beyond passing it to CSS (string manipulation, colour math) breaks, because the value is now a `var()` expression. No in-repo example does this; it is called out in the 1.0 release notes.
- New tokens (`lineHeight`, `fontWeight`, `transition`, `shadow`, `mq.medium`) are added so components stop hard-coding those values; existing components are migrated to them only where the output is byte-identical.
- The `Table` name collision is fixed the compatible way: the style-sheet cache is keyed by component identity, and `styles.Table` keeps applying to both the props table and Markdown tables. Renaming the Markdown renderer would have been a breaking change to `styles`.
- Snapshot files that encoded the global counter (`Markdown.spec.tsx.snap`, `Table.spec.tsx.snap`) are regenerated once; from then on they only change when the component they show changes.
- The default appearance changes visibly for everyone who does not override the theme once the designed palette lands. Users who copied a renderer wholesale via `styleguideComponents` keep the old layout next to the new tokens; the release notes say so.
- Option 2 (leaving JSS) remains open for 2.0 and needs its own record, including a plan to replace the isolation guarantee.
