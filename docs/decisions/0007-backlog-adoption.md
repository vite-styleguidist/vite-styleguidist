# 0007: Upstream backlog adoption

- **Date:** 2026-09-06
- **Status:** accepted

## Context

As of 2026-09-06 the upstream repository has 102 open issues and 143 open pull requests, 128 of them opened by Dependabot. Many of the issues are about webpack loaders, Babel, Internet Explorer or Create React App, none of which exist in this fork; some are genuine bugs in code that was carried over; a few are feature requests the fork intends to build. Issues can’t be transferred between repositories without write access on both, so anything the fork wants to track has to be re-created here, and every re-created issue that links back to the original creates a cross-reference notification on the upstream tracker.

## Options considered

1. **Mirror nothing.** Ask people to re-file against a 1.0 prerelease with a fresh reproduction. Cleanest tracker, but loses real bugs whose reporters have moved on, and looks dismissive of years of triage work.
2. **Mirror selectively:** the roughly 29 bugs that plausibly still apply after the rewrite, plus the roughly 6 feature requests the fork intends to implement, each with a provenance header and an `imported-from-upstream` label.
3. **Mirror everything.** Faithful, but imports dozens of webpack-era issues that can only be closed as obsolete, and generates over a hundred notifications upstream.

## Decision

**Mirror selectively.** About 29 bugs and about 6 feature requests are re-created on the fork’s tracker, one issue each, with the provenance header described in the [maintainer guide](../Maintenance.md#mirroring-upstream-issues) (“Imported from styleguidist/react-styleguidist#N, opened by `<handle>` on `<date>`”), the original description quoted, and a “Status on this fork” section that says whether the problem was reproduced on the Vite build. Everything else is not imported; the upstream tracker remains the historical record. Dependabot pull requests are not mirrored: the fork runs its own dependency updates.

## Consequences

- The `imported-from-upstream`, `upstream-blocked` and `needs-repro` labels exist before the import starts, and no auto-stale workflow runs until the imported issues have been triaged once.
- Original reporters are named by handle in the header but not @-mentioned, so the import doesn’t page people who reported a bug in 2019.
- Pull requests from human authors upstream that still apply (about 15) are re-implemented or cherry-picked with credit to their author in the commit body, rather than re-opened; the docs-only ones (JSDoc link fixes, the testing section) are ported the same way.
- One comment on upstream issue #2164 announces the fork; the mirrored issues link back to their origin but the fork doesn’t comment on each upstream issue it mirrors.
