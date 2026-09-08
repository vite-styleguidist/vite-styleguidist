# 0017: Props parser for TypeScript components

- **Date:** 2026-09-07
- **Status:** accepted

## Context

Styleguidist reads props with [react-docgen](https://github.com/reactjs/react-docgen) (`react-docgen` 8.0.3, the default value behind the [`propsParser`](../Configuration.md#propsparser) option), and the docs have recommended [react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript) as a `propsParser` replacement for TypeScript users since long before the fork. That recommendation was never measured here, and it points at a package under the `styleguidist` GitHub organisation, the same dormant organisation this project forked away from: `react-docgen-typescript`’s last release is `2.4.0` from 2025-06-10, its last non-Dependabot commit is from the same day, and it has 24 open issues. `react-docgen`, in the `reactjs` organisation, released `8.0.3` on 2026-03-13 and is committed to weekly.

So the question for 1.0 is which of the two the docs should send a TypeScript team to, and whether the default should change. It was answered by measurement, not by preference: four `.tsx` components covering the shapes a design system actually contains were written (they ship as `examples/typescript`, so the measurements can be reproduced) and parsed with both parsers, and both were then run through a real `styleguidist build`.

## Options considered

The measurements. “Default” is `react-docgen` 8.0.3 as Styleguidist calls it (the config’s `resolver` and `handlers`, no `propsParser`); “TS parser” is `react-docgen-typescript` 2.4.0 through `withCustomConfig('./tsconfig.json', { savePropValueAsString: true })`.

| Case | Default (react-docgen) | TS parser (react-docgen-typescript) |
| --- | --- | --- |
| `Button.tsx` — `interface` extending `React.ButtonHTMLAttributes`, exported union alias, inline literal union, defaults in the destructuring pattern | The 4 declared props. Types as written (`'primary' \| 'secondary' \| 'danger'`), all 4 defaults, all 4 descriptions | **291 props**: every DOM attribute the interface inherits. A `propFilter` is mandatory. With one, the same 4 props, but types printed `ButtonVariant \| undefined` and defaults unquoted (`primary`) |
| `Badge.tsx` — `React.FC`, exported `enum` as a prop type, non-exported props `interface` | The 3 props, `tone` typed `BadgeTone`, both defaults (`BadgeTone.Neutral`, `99`) | **Documents the file as `BadgeTone`, with 0 props.** It returns an entry per exported symbol it takes for a component, the `enum` sorts first, and Styleguidist documents the first entry. Fixable only in the `propsParser` wrapper |
| `Field.tsx` — `React.forwardRef`, props in a separate module (`Field.types.ts`) | The 3 props, with the descriptions read out of the other file: relative type-only imports are followed | 312 props unfiltered; with a `propFilter`, the same 3 |
| `Select.tsx` — generic component, `Option` inferred from `options` | The 4 props, function signatures intact. `Option[]` correct; **`readonly Option[]` comes out as `unknown`** | The 4 props; `readonly Option[]` correct |
| A component **re-exported from another package** (`export { Alert } from 'some-ui'`) | **Fails**: `ERR_REACTDOCGEN_MISSING_DEFINITION`, logged as “doesn’t export a component”, no props table | The 2 props with descriptions — **but only if the `propFilter` is not the popular one.** `!prop.parent.fileName.includes('node_modules')`, the filter every blog post copies, removes every prop of exactly the components this parser was installed for |
| Setup | None. No `tsconfig.json`, no dependency, no `propsParser` | A dependency, a `tsconfig.json`, a `propFilter` and an entry-picking wrapper |
| Build time, these four components | 0.61 s | 3.6 s (best of three each; the delta is the TypeScript program `withCustomConfig` builds) |

Two conclusions the table does not spell out. First, the default parser has no _documentation_ gap on components you write yourself: on all four it produced a correct and in two places a **better** table than the TS parser (`Button` without the ~290 inherited DOM attributes, types printed as authored rather than widened with `| undefined`). Second, the TS parser’s one real advantage — resolving types across module and package boundaries — is exactly what the widely copied recipe in our own [Thirdparties](../Thirdparties.md) page destroys, and the recipe as published also mis-documents any file that exports an `enum` before its component.

The options for what to do about it:

1. **Change the default to react-docgen-typescript.** Rejected outright: it would change every existing style guide’s props table (`Button` from 4 rows to 291), require a `tsconfig.json` that JavaScript projects do not have, multiply build time, and take the default of a maintained package into an unmaintained one. It also contradicts the compatibility promise of this release.
2. **Keep the default, recommend the TS parser to TypeScript teams** (the status quo of the docs). Rejected: the measurements do not support it. It sends a team that writes its own components to a slower, unmaintained parser that needs configuration to produce a _worse_ table than the one they get for free.
3. **Keep the default and recommend it, and scope the TS parser to the case it actually wins** (chosen).
4. **Vendor or fork react-docgen-typescript.** A whole TypeScript-program parser is far more than this project can maintain on the side, and nothing yet justifies it. Revisit only if `react-docgen` stops handling TypeScript.

## Decision

Option 3.

1. **The default parser does not change in 1.0**, and this is not deferred timidity: on the evidence above `react-docgen` is the better default for TypeScript, not merely the compatible one. Changing it would also be a breaking change to the rendered output of every existing style guide, which this release does not do.
2. **The docs recommend the default parser for components you own**, TypeScript included, and say plainly that it needs no configuration. [Configuration](../Configuration.md#propsparser), the [cookbook](../Cookbook.md#how-to-document-typescript-components) and `examples/typescript` all say the same thing.
3. **`react-docgen-typescript` stays documented, scoped to one case**: components resolved through the type system rather than written in the file being parsed — above all a component re-exported from another package. It is described as a third-party package with the maintenance status stated, not as “the TypeScript option”.
4. **The recipe that ships is the corrected one**, verified by a `styleguidist build` and not by reading the README of the parser. It differs from the recipe published until now in two ways, each fixing a defect reproduced above: the `propFilter` excludes only `node_modules/@types/react/` rather than all of `node_modules`, and the `propsParser` picks the returned entry whose `displayName` matches the file name before handing it over.
5. **The known gap in the default parser is documented rather than papered over**: `readonly T[]` is reported as `unknown` by `react-docgen` 8.0.3, with the workaround (write `T[]`) named where it is relevant.
6. **`examples/typescript` is the executable form of this record.** It is built in CI on every supported React version and published with the docs site, so “no configuration needed” stays true rather than becoming a claim in a document.

## Consequences

- A TypeScript user following the docs installs nothing and configures nothing. That is the fastest path and, per the table, also the best-looking props table.
- Users who follow the old recipe are not broken: `propsParser` is unchanged, and both the old and the corrected recipes keep working. The corrected one merely produces right answers in two more cases.
- This project now carries a documented opinion about a package it does not control. If `react-docgen-typescript` is archived, only the scoping in [Thirdparties](../Thirdparties.md) and the cookbook recipe change; nothing in the code depends on it, and it is not a dependency of this package.
- If `react-docgen` ever regresses on TypeScript, this record is the thing to revisit — option 4 above is the escape hatch, and the four components in `examples/typescript` are the regression suite for that conversation.
- The `readonly T[]` gap is worth reporting upstream to `react-docgen`; until it is fixed, the docs carry the workaround.
- **Amended 2026-09-07, after the plugin performance pass.** The shipped recipe gained a third correction, and the decision above is unchanged by it. `withCustomConfig('./tsconfig.json').parse` — the call the “TS parser” column was measured through — builds a fresh `ts.Program` on every file it is handed, so the 3.6 s in the build-time row is four TypeScript programs rather than one. The [cookbook recipe](../Cookbook.md#components-re-exported-from-another-package) now builds a single program for the whole style guide over a caching compiler host and sends files that are not TypeScript to `react-docgen`: on a 50-component design system half of which is plain JavaScript that is 1.3 s against 7.3 s, with the 25 JavaScript components documented instead of empty.
