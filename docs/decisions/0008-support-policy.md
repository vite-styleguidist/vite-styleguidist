# 0008: Support policy

- **Date:** 2026-09-06
- **Status:** accepted

## Context

Taking over a tool with tens of thousands of weekly installs creates an implicit support promise. The fork is maintained by one person in their spare time, and the first release changes the supported Node.js and React versions. Three independent reviews of the docs found the Node.js version stated differently in three places, none matching `package.json`; the underlying problem was that no single document owned the answer. Enterprise adopters of a build-time dependency ask for exactly that document plus a statement of what receives security fixes.

## Options considered

1. **Latest major only.** Fixes, including security fixes, go to the current major version; older majors are unsupported the day a new major ships.
2. **Latest major plus the previous one for a fixed window** (for example six months of security fixes). Friendlier, but doubles the release and testing surface for a one-person project.
3. **No stated policy.** The upstream default, and the reason users of 13.1.4 didn’t know they were unsupported until the fork said so.

## Decision

**Only the latest major version receives fixes**, security fixes included. `react-styleguidist` 13.x and earlier receive nothing from this fork, which has no publish rights on that package anyway. Prereleases on the `next` dist-tag accept bug reports but aren’t meant for production. Dropping a Node.js or React version is a breaking change and happens only in a major release. The supported versions table in [Compatibility](../Compatibility.md) is the source of truth: `package.json`, the CI matrix, `.nvmrc` and all other docs must match it, and a mismatch is a bug in the other file.

## Consequences

- [Compatibility](../Compatibility.md) is the one page that states versions; other docs say “Node.js 22.12 or newer (Node 23 is not supported; 24 and later are)” and link to it rather than restating a range.
- A CI check that compares the table with `package.json` is desirable and is listed as a follow-up; until it exists, the maintainer checks the table on every release that touches `engines` or `peerDependencies`.
- Users who need longer support windows are told to pin a tested version or to keep a fork they control, see [MAINTAINERS.md](../../MAINTAINERS.md).
- The policy can be widened later (option 2) if a second maintainer joins; that would be a new record.
