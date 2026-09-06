# Maintainers

This file says who maintains Vite Styleguidist, what you can expect from them, and how the project is run. It is deliberately explicit about capacity: the original project went quiet without anyone announcing it, and this fork would rather state its limits up front.

## Current maintainer

| Name | GitHub | Contact | Role |
| --- | --- | --- | --- |
| Mihail-Gabriel Alexe | [mihail-alexe-nutanix](https://github.com/mihail-alexe-nutanix) | mihail.alexe@outlook.com | Maintainer, npm owner, release manager |

The GitHub handle above is tied to the maintainer’s employer and may move to a personal handle; the repository and the npm package are owned by the `vite-styleguidist` GitHub organization and by the maintainer’s npm account, so a handle change doesn’t affect either.

## Capacity

- **One person, best effort, no SLA.** Vite Styleguidist is maintained by one person in their spare time. There is no company behind it and no service level agreement: bug reports, pull requests and security reports are handled as time allows.
- **Typical triage cadence: weekly.** New issues and pull requests are looked at roughly once a week. A first response usually means a label and a question or a plan, not a fix.
- **Security reports get priority** over everything else and are acknowledged as soon as they are seen, see [SECURITY.md](SECURITY.md).
- **Releases are automated**, so a merged fix ships without waiting for a release day, see [Maintainer guide](docs/Maintenance.md#releases).

If you need guaranteed response times, pin a version you have tested, keep a fork you control, or get in touch about co-maintaining (see below).

## Scope

In scope:

- The `vite-styleguidist` npm package: the CLI, the Node.js API, the Vite plugin and the style guide UI.
- The documentation in `docs/` and the example projects in `examples/`.
- Compatibility with the Node.js and React versions listed in [Compatibility](docs/Compatibility.md), and with the current Vite major.
- Security fixes for the latest major version.

Out of scope:

- Fixes for `react-styleguidist` 13.x or earlier. This fork has no publish rights on that package and doesn’t backport to it.
- The original project’s website, chat rooms, Open Collective and social accounts. They belong to the original maintainers.
- Third-party integrations (snapguidist, react-styleguidist-visual, Percy, etc.). Bugs in them belong in their own trackers; the fork is happy to document workarounds.
- Support for bundlers other than the bundled Vite. Your app may use anything; the style guide is always built with Vite.
- Framework ports (Vue, Svelte, …).

## How decisions are made

- Small decisions (a bug fix, a dependency bump, a doc edit) are made in the pull request that implements them.
- Decisions that are hard to reverse or that affect users (package name, versioning, support policy, breaking changes, new dependencies with a large footprint) are written down as short architecture decision records in [docs/decisions](docs/decisions/README.md) before they are acted on. Anyone can propose one by opening a pull request that adds a record with the status `proposed`; it is accepted or rejected in that pull request.
- Breaking changes need a migration path in [docs/Migration.md](docs/Migration.md) or in the release notes, and a `BREAKING CHANGE` footer in the commit so they show up in the changelog.
- When the maintainers disagree and can’t reach consensus, the maintainer who has been on the project longest decides. With one maintainer this is trivially true; it is written down so that it doesn’t need to be invented later.

## Becoming a maintainer

There is no formal process, but there is a path:

1. Contribute: fix bugs, review pull requests, answer questions in issues and discussions, improve the docs. Reviewing other people’s changes is at least as valuable as writing your own.
2. After a few months of regular contributions, either side can suggest co-maintainership. The current maintainer adds you to this file, gives you write access to the repository and adds you as an owner of the npm package.
3. New maintainers are expected to follow the [maintainer guide](docs/Maintenance.md), to keep two-factor authentication enabled on GitHub and npm, and to be reachable at an email address listed in this file.

## Succession

- **A second npm owner is added as soon as a co-maintainer exists**, so that the package never depends on a single account. Until then, the npm account has two-factor authentication enabled and publishing goes through npm trusted publishing from CI rather than through long-lived tokens (the one exception is the very first publish, which needs a short-lived automation token because a trusted publisher can only be registered on an existing package; see the [maintainer guide](docs/Maintenance.md#releases)).
- **If the maintainer goes silent for six months** (no commits, no issue or pull request activity, no answer to an email at the address above) the project should be considered unmaintained. In that case, anyone is welcome to fork it under the MIT license; the maintainer asks that a fork picks a new name, keeps the credits to the original project and to this fork, and opens an issue here pointing to it so users can find it. If a co-maintainer exists at that point, they take over the repository and the npm package without further formality.
- **Handing over deliberately** is preferred over disappearing: a maintainer who wants to stop announces it in an issue, adds the successor to this file and to the npm package, and updates the `CODEOWNERS` file.

## Changes to this file

Edit it through a pull request like any other file. Adding or removing a maintainer is a `chore:` commit and is mentioned in the release notes of the next release.
