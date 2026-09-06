# 0001: Package name

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The fork can’t publish to the `react-styleguidist` npm package: its owners are the original maintainers and the project has been inactive since 2025-01-07. The first fork release is also a rewrite (webpack to Vite, ESM, Node.js 22.12+, React 18+), so even with publish rights a new name would help users tell the two lines apart. The bare `styleguidist` name is taken by a third-party dependency-confusion placeholder (`styleguidist@1.0.0`, published 2025-07-23 by an unrelated account), and the `@styleguidist` npm scope can’t be assumed to be available without the original maintainers’ cooperation.

## Options considered

1. **`vite-styleguidist`.** Free on npm (verified 2026-09-06). Says what changed. A GitHub repository with the same name exists under a personal account (a 2023 experiment), which is prior art but not a conflict on npm.
2. **`react-styleguidist-vite`.** Free on npm. Keeps the old name as a prefix, which helps search but reads as a plugin for the old package rather than as its successor, and implies a dependency on `react-styleguidist`.
3. **`styleguidist-vite`.** Free on npm. Shortest, but sits next to the squatted bare `styleguidist` name and doesn’t say React.
4. **A personal scope, e.g. `@<user>/styleguidist`.** Free and unambiguous, but ties the package identity to one person’s account, which is the bus-factor problem the fork wants to avoid.
5. **Keep `react-styleguidist`** by asking for npm ownership. Depends entirely on people who haven’t responded to anything in twenty months; blocks every other decision while waiting.

## Decision

Publish as **`vite-styleguidist`**, with the display name **Vite Styleguidist**. The CLI binary keeps its name, `styleguidist`, so existing `package.json` scripts (`"styleguide": "styleguidist server"`) keep working. The bin name isn’t affected by the squatted `styleguidist` npm package; the two never meet unless someone installs both.

## Consequences

- Every import and install snippet in the docs changes from `react-styleguidist` to `vite-styleguidist`, and the migration guide has to say so explicitly.
- Downstream packages with a peer dependency on `react-styleguidist` (notably `@percy/styleguidist`, range `>=11 <14`) don’t recognize the new package; they are informed, see the outreach record in [About this fork](../Fork.md#outreach-record).
- The runner-up names (`react-styleguidist-vite`, `styleguidist-vite`) should be reserved with placeholder publishes before the announcement so that nobody can typosquat it. This is a maintainer task, not something the repository can do.
- If the original maintainers ever offer the `react-styleguidist` name, that would be a new decision; this one doesn’t preclude it.
