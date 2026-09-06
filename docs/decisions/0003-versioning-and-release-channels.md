# 0003: Versioning and release channels

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The repository has no git tags: the original project’s tags were never pushed to the fork. semantic-release, which the project uses, computes the next version from the last tag reachable from the release branch and falls back to `1.0.0` when there is none, whatever the commit types say. The first release is simultaneously a rename, an ESM-only switch, a Node.js and React version bump and a bundler rewrite, so the first real-world bug reports are guaranteed; publishing straight to the `latest` dist-tag would put them in front of everyone at once.

## Options considered

1. **Fresh `1.0.0` line under the new name, with `1.0.0-next.N` prereleases first.** Clean semantics for a new package; the migration story is `react-styleguidist@13.1.4` to `vite-styleguidist@1.0.0`.
2. **Continue the old line at `14.0.0`** by importing the upstream tags so the `feat!` commit computes a major bump. Communicates continuity, but a new package that starts at 14 is confusing (`vite-styleguidist@14` with no 1 to 13), and importing another project’s tags into a differently named package overstates the relationship.
3. **Let semantic-release emit `1.0.0` by accident** on the first push to the release branch, with no prerelease channel. Same number as option 1, without the beta window and with the risk of publishing before the identity work is finished.

## Decision

Start a **fresh `1.0.0` line**. The `next` branch publishes **`1.0.0-next.N`** prereleases to the npm **`next`** dist-tag; `main` publishes stable versions to `latest`. Versions follow semantic versioning as computed by semantic-release from Conventional Commits: `fix` is a patch, `feat` a minor, `!`/`BREAKING CHANGE` a major. The first stable release is promoted from `next` after a beta window, when the known blockers are fixed and at least a handful of external projects have run a prerelease.

## Consequences

- The migration guide and the README name the versions explicitly: upgrading from `react-styleguidist` 13.x (last release 13.1.4) to `vite-styleguidist` 1.0.
- Installing the beta is `npm install --save-dev vite-styleguidist@next`. npm assigns `latest` to the first version a package ever publishes, so during the beta a plain `npm install vite-styleguidist` also resolves to the newest `1.0.0-next.N`; `latest` moves to 1.0.0 when it is released from `main`.
- The release configuration needs two branches (`main`, and `next` with `prerelease: true`) and the conventionalcommits preset. Nothing is committed back to the repository: the `main` ruleset only accepts pull requests and GitHub can’t exempt the Actions app from it, so there is no changelog or git plugin, the version lives in git tags and on npm (`package.json` keeps `0.0.0-development`), and the release notes live on the GitHub Releases page; see the [maintainer guide](../Maintenance.md#releases).
- Before the first release a baseline tag `v0.0.0` is pushed on the last upstream commit, so the generated notes cover the fork’s commits only instead of the whole inherited history. It is a marker, not an import of upstream’s version tags: the first version is still computed as 1.0.0.
- npm authentication: trusted publishing (OIDC) with provenance, except for the very first publish, which uses a short-lived `NPM_TOKEN` secret because a trusted publisher can only be registered on an existing package.
- A `1.x` version number reads as “young” next to `13.1.4`. The README’s fork notice and the release notes explain the lineage so that the number isn’t mistaken for immaturity of the codebase.
- Dropping a supported Node.js or React version is a major release under this scheme, see [Support policy](0008-support-policy.md).
