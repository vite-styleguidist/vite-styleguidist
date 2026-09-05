# 0005: Funding

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The inherited repository routes money to the original project and its author: `.github/FUNDING.yml` (Open Collective, GitHub Sponsors, Ko-fi and Buy Me a Coffee entries), the `funding` field in `package.json` (which `npm fund` prints to every installer), sixty Open Collective sponsor and backer avatars in the README, and a coffee button. None of those accounts belong to the fork, and none of the money would reach whoever fixes bugs here. Leaving them in place would mislead users; replacing them with the fork maintainer’s own accounts before the fork has shipped anything invites the criticism that it is monetizing someone else’s audience.

## Options considered

1. **Remove all funding surfaces for 1.0.** No `FUNDING.yml`, no `funding` field, no avatars, no buttons. Credit the original project and its sponsors in a thanks section instead.
2. **Replace them with the fork maintainer’s accounts.** Honest about where money goes, but premature, and it changes the tone of the announcement from “continuing a tool” to “please pay me”.
3. **Leave them as they are.** The path of least resistance, and the one that quietly sends fork users’ sponsorships to people who aren’t maintaining what those users installed.

## Decision

**Remove funding entirely for the 1.0 line.** The original project and its authors are credited in the README’s Thanks section and in [About this fork](../Fork.md). Whether the fork asks for money at all is a decision to revisit after the first stable release, in a new record.

## Consequences

- `.github/FUNDING.yml` is deleted, the `funding` field is removed from `package.json`, and the sponsor and backer blocks and the coffee button are removed from the README and from the issue templates.
- GitHub shows no Sponsor button on the repository and `npm fund` doesn’t list the package. Nobody is accidentally sent to the wrong collective.
- The fork has no income and says so in [MAINTAINERS.md](../../MAINTAINERS.md); that is consistent with the best-effort support policy.
- The upstream project keeps its Open Collective; nothing here asks its sponsors to move.
