# 0002: Repository home

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The Vite migration was developed on a GitHub fork of `styleguidist/react-styleguidist` under the maintainer’s employer-branded personal handle (`mihail-alexe-nutanix`). A GitHub fork has properties that hurt a project meant to be found and contributed to: repository and code search exclude forks by default, stars and watchers start from zero and can’t be transferred, and pull requests opened from clones default to the upstream repository as their base, so contributors accidentally file work where nobody merges it. A repository owned by a personal account also encodes that person (and, here, their employer) into every URL in `package.json`, the docs and the CI badges.

## Options considered

1. **A new GitHub organization (`vite-styleguidist`) with a standalone, non-fork repository** (`vite-styleguidist/vite-styleguidist`), history pushed into it.
2. **Stay on the existing fork** under `mihail-alexe-nutanix/react-styleguidist`. Zero setup, but keeps the fork network membership, the upstream PR base default and the employer-branded URLs; renaming or losing the handle breaks every link.
3. **A repository under a personal (non-employer) account.** Fixes the branding but keeps the single-owner problem, and still needs a detach or a fresh repository to leave the fork network.

Options 1 and 3 both need the fork detached (a GitHub Support request) or the history pushed into a fresh repository; only option 1 also solves ownership.

## Decision

The canonical home is **<https://github.com/vite-styleguidist/vite-styleguidist>**, a standalone repository (not a GitHub fork) in a dedicated organization, with `main` as the default branch and `next` as the prerelease branch. The organization can hold more than one owner, which is what [MAINTAINERS.md](../../MAINTAINERS.md) relies on for succession.

## Consequences

- `package.json` `repository`, `homepage` and `bugs` point at the new repository; npm provenance requires `repository.url` to match the repository the release workflow runs in.
- All documentation links use the new repository, or relative links so they follow whichever branch the reader is on. Links to the original project are kept only where they refer to it deliberately (credits, migration, provenance comments).
- The employer-branded handle remains in `CODEOWNERS` and in this file for now; the maintainer may move to a personal handle without changing the repository’s address.
- The default-branch rename from `master` to `main` has to be reflected in the CI and release workflows.
