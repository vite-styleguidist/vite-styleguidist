<!-- Maintainer guide #maintenance -->

# Maintainer guide

_See also the [developer guide](Development.md), [MAINTAINERS.md](../MAINTAINERS.md) (who maintains the project and what to expect) and the [decision records](decisions/README.md) (why things are the way they are)._

## We need you!

Help develop and maintain Vite Styleguidist:

- Answer questions in [GitHub issues](https://github.com/vite-styleguidist/vite-styleguidist/issues) and [Discussions](https://github.com/vite-styleguidist/vite-styleguidist/discussions).
- Review [pull requests](https://github.com/vite-styleguidist/vite-styleguidist/pulls).
- Fix bugs and add new features. Issues labeled `help wanted` and `good first issue` are a good place to start.
- Write articles and talk about Styleguidist at conferences and meetups (we’re always happy to review your texts and slides).

## Commit message conventions

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). This is what lets [semantic-release](https://semantic-release.gitbook.io/semantic-release/) decide whether a commit is a patch, a minor or a major release and generate the changelog, so the structure isn’t optional: [commitlint](https://commitlint.js.org/) checks every commit message in a Git hook and in CI, and rejects messages that don’t follow it. Pull request titles are checked too, because they become the commit message on squash-merge (see [Pull requests](#pull-requests)).

Commit messages are written for humans first: the type tells the tooling what happened, the rest of the message tells the next maintainer why.

**The commit message** consists of a `header`, a `body`, and a `footer`:

```
<header>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The `header` is mandatory and must conform to the format described below. The `body` is optional but highly recommended for most commits, except very simple ones. The `footer` is optional.

**The commit message header** looks like this:

```
<type>(<optional scope>)<optional !>: <subject>
  │         │              │            │
  │         │              │            └─⫸ Summary in present tense. Lowercase. No period at the end.
  │         │              └─⫸ `!` marks a breaking change (also add a BREAKING CHANGE footer)
  │         └─⫸ Optional area of the code: cli, vite, docs, deps, …
  └─⫸ Commit type: build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test
```

The `<type>` and `<subject>` fields are mandatory and both are lowercase. (The original project capitalized subjects; this fork switched to lowercase because that is what commitlint’s conventional config enforces, and consistency with the tooling beats house style.)

### Type

Must be one of the following:

- `build` — changes to the build system or to dependencies (`package.json`, `tsconfig`, the `compile` script).
- `chore` — maintenance that doesn’t fit anywhere else: repository housekeeping, tooling config, maintainer files.
- `ci` — changes to the CI or release workflows.
- `docs` — changes to documentation only.
- `feat` — a new feature. Triggers a **minor** release.
- `fix` — a bug fix. Triggers a **patch** release.
- `perf` — a performance improvement. Triggers a **patch** release.
- `refactor` — a code change that neither fixes a bug nor adds a feature.
- `revert` — reverts a previous commit; the subject names the reverted commit.
- `style` — formatting only, no code change.
- `test` — adding missing tests or correcting existing tests.

Only `feat`, `fix`, `perf` and breaking changes produce a release and appear in the changelog. Everything else is still in the Git history, so pick the type that describes the change, don’t pick `fix` to force a release.

### Subject

Use the subject to provide a short description of the change:

- use the imperative, present tense: “change” not “changed” nor “changes”;
- start with a lowercase letter;
- no dot (.) at the end;
- keep the whole header under 100 characters.

### Commit message body

As in the subject, use the imperative, present tense: “fix” not “fixed” nor “fixes”, but put a dot (.) at the end of each sentence.

Explain the motivation for the change: why you are making it. You could include a comparison of the previous behavior with the new behavior to illustrate the impact of the change. If the change ports a pull request from the original project, say so and credit its author here: “Ports styleguidist/react-styleguidist#2145 by reinrl.”

### Commit message footer

The footer could contain information about breaking changes, and is also the place to reference GitHub issues and other pull requests that this commit closes or is related to.

```
BREAKING CHANGE: <breaking change summary>
<BLANK LINE>
<breaking change description + migration instructions>
<BLANK LINE>
<BLANK LINE>
Fixes #<issue number>
```

The breaking change section must start with the phrase `BREAKING CHANGE:` (with a `:` and a space at the end, in ALL CAPS, that is what the tooling matches) followed by a summary of the breaking change, a blank line, and a detailed description that includes migration instructions. Also add `!` after the type or scope in the header, so the break is visible in `git log --oneline`. Update the [migration guide](Migration.md) in the same pull request.

If the commit doesn’t completely fix the issue, then use `Refs #1234` instead of `Fixes #1234`.

### Commit message example

````
fix: show flow enum values in prop descriptions

In ef4c109b, `PropsRenderer.js` was replaced with `renderExtra.tsx`
and the condition guarding the extra type information changed from:

```js
if (!type) {
  return null;
}
```

to:

```typescript
if (!prop.type || !type) {
  return null;
}
```

Unfortunately, this extra condition made the method always return
`null` for a Flow typed prop, because `prop.type` is never set for
those. This commit reverts the condition to what it was before the
migration to TypeScript.

Fixes #1234
````

## Pull requests

Maintainers merge pull requests by **squashing** all commits, so the pull request title becomes the commit header and must follow the [commit message conventions](#commit-message-conventions); commitlint checks pull request titles in CI for that reason. Edit the message in the GitHub merge dialog to add a body and footer when the pull request description doesn’t already provide them.

Use an appropriate commit type. Be especially careful with breaking changes: a missing `!` or `BREAKING CHANGE:` footer ships a breaking change as a patch release.

Keep the contributor as the author of the squashed commit (GitHub does this by default). When you port a change written by someone else, for example a pull request from the original project, credit them in the commit body and, if you kept their patch, add a `Co-authored-by:` trailer.

## Releases

Releases are automated with [semantic-release](https://semantic-release.gitbook.io/semantic-release/) using the `conventionalcommits` preset. On every push to a release branch, CI runs the tests, computes the next version from the commits since the last release, publishes to npm and creates a GitHub release with the generated notes. Nothing is committed back to the branch: the `main` ruleset only accepts pull requests and GitHub can’t exempt the Actions app from it, so the version lives in git tags and on npm (package.json keeps a `0.0.0-development` placeholder) and the release notes live on the [Releases page](https://github.com/vite-styleguidist/vite-styleguidist/releases). There is no manual version bump and no release day: a merged fix is published within minutes.

The `main` ruleset also requires ten CI checks, matched by job name: “Lint and typecheck”, “PR title is a Conventional Commit”, “Unit tests (Node 22)”, “Unit tests (Node 24)”, “Examples and end-to-end tests”, “React compatibility (React 16.14.0)”, “React compatibility (React 17.0.2)”, “React compatibility (React 18.3.1)”, “Install from the packed tarball” and “Docs site build”. Renaming a job in `ci.yml` must be mirrored in the ruleset (Settings › Rules › main), otherwise pull requests into `main` wait forever for a check that no longer reports; adding a job (the three React compatibility checks were added with [decision 0013](decisions/0013-react-16-support.md) and must be added to the ruleset by hand) is only enforced once the ruleset lists it.

That ruleset gates pull requests into `main`, not pushes to `next`: `next` accepts direct pushes, and the release workflow runs on its own (`npm ci`, `npm run compile`, `npm test` — lint, typecheck and the unit tests on React 19) without waiting for `ci.yml`. So nothing stops a push to `next` from publishing a prerelease before the integration, React compatibility, tarball and docs-site jobs have said anything. When a change needs the full matrix first, push it with releases paused (`gh variable set RELEASES_ENABLED --body false`), wait for CI to go green on `next`, then re-enable the variable and start the release workflow from the Actions tab (`workflow_dispatch`).

| Branch | npm dist-tag | Versions | Used for |
| --- | --- | --- | --- |
| `main` | `latest` | `1.x.y` stable releases | Everything after 1.0.0 that isn’t part of the next major. |
| `next` | `next` | `1.0.0-next.N` prerelease | The 1.0 beta, and later the beta of each following major version. |

The flow around a major version:

1. Breaking and non-breaking work lands on `next` through pull requests. Every release-worthy commit publishes a new `-next.N` prerelease to the `next` dist-tag; `npm install vite-styleguidist@next` gets it, plain `npm install vite-styleguidist` doesn’t.
2. When the beta exit criteria are met (known blockers fixed, a handful of external projects have run a prerelease, the [migration guide](Migration.md) is complete), a maintainer **fast-forwards `main` to `next`** (see [Promoting next to main](#promoting-next-to-main)) and semantic-release publishes the stable version to `latest`. Never merge `next` into `main` through a pull request: the repository only allows squash merges, which replaces the whole beta history with one commit that none of the `-next.N` tags point at, and deletes the `next` branch. semantic-release then can’t see the prereleases from `main`, and `next` can’t be re-created with its tags.
3. Until the next major, fixes and features go to `main` directly and are released as patch and minor versions. `next` is only re-opened when a breaking change needs a beta.

npm authentication is meant to go through [trusted publishing](https://docs.npmjs.com/trusted-publishers): the release workflow authenticates through GitHub Actions OIDC and publishes with provenance, so no long-lived npm token lives in the repository secrets. One exception is unavoidable: a trusted publisher can only be registered for a package that already exists on npm, so the very first publish (`1.0.0-next.1`) uses a granular automation token stored as the `NPM_TOKEN` repository secret. Right after that release lands, the maintainer registers the trusted publisher on npmjs.com (GitHub Actions, organization `vite-styleguidist`, repository `vite-styleguidist`, workflow `release.yml`, no environment, **and “allow `npm publish`” ticked**: trusted publishers created after September 2026 only allow `npm stage publish` by default, and semantic-release runs a plain `npm publish`, which npm then refuses with `403 OIDC permission denied for this action`) and deletes the secret; from then on OIDC is the only credential. The npm account that owns the package has two-factor authentication enabled and publishing from anywhere but CI is the exception, not the rule. See [Versioning and release channels](decisions/0003-versioning-and-release-channels.md) for why it is set up this way.

### Patch releases

Any commit of a `fix` or `perf` type merged into a release branch is published as a _patch_ release as soon as CI passes.

### Minor releases

Any commit of a `feat` type merged into a release branch is published as a _minor_ release as soon as CI passes.

### Major releases

Any commit with a `BREAKING CHANGE:` footer (and a `!` in the header) merged into a release branch is published as a _major_ release as soon as CI passes. On `next` it produces the first prerelease of the next major (`2.0.0-next.1`); on `main` it publishes the major directly, which is why breaking changes should go through `next` first.

### Release checklist

Before the very first release only:

- Push the baseline tag so the release notes start at the fork rather than at the first upstream commit: `git tag v0.0.0 c223f9a2 && git push origin v0.0.0` (see the comments in `release.config.js` for why this is not an import of upstream's tags).
- Create a granular npm automation token with publish rights for `vite-styleguidist` and store it as the `NPM_TOKEN` repository secret.
- Tag the published commit (`git tag -a v1.0.0-next.1 -m 1.0.0-next.1 && git push origin v1.0.0-next.1`) and give it the channel note semantic-release writes for its own tags, otherwise the next run doesn’t recognise the tag as a release on `next` and fails on the existing tag: `git notes --ref semantic-release-v1.0.0-next.1 add -f -m '{"channels":["next"]}' v1.0.0-next.1^{commit} && git push origin refs/notes/semantic-release-v1.0.0-next.1`.
- After `1.0.0-next.1` is on npm: register the trusted publisher on npmjs.com, delete the `NPM_TOKEN` secret, and set the repository variable `RELEASES_ENABLED` to `true` (`gh variable set RELEASES_ENABLED --body true`). Until then the release job is skipped rather than failed. The same variable pauses releases at any time: set it to `false`.

For every release:

1. Make sure CI is green on the pull request.
2. Squash-merge with a conforming title; add a body and footer in the merge dialog if needed.
3. Wait for the release workflow to finish. Check the [Releases page](https://github.com/vite-styleguidist/vite-styleguidist/releases) and `npm view vite-styleguidist dist-tags`.
4. Edit the release notes on GitHub if the generated notes need context: a screenshot or GIF for visual changes, a code example for a new option, a link to the relevant docs page (see [Changelogs](#changelogs)).
5. For breaking changes, verify that the migration guide was updated in the same pull request and that the release notes link to it.
6. While 1.0 is in beta only: semantic-release tags prereleases with `next`, while npm’s `latest` stays on the first version ever published, so a plain `npm install` would get a stale beta. Move it by hand after each prerelease: `npm dist-tag add vite-styleguidist@1.0.0-next.N latest` (asks for a 2FA code). The first stable release takes over `latest` automatically.

### Promoting next to main

The stable release must be built from the same commits the prereleases were tagged on, so `main` is moved with a fast-forward push, not with a pull request. The `main` ruleset requires pull requests, and repository admins are on its bypass list for exactly this case:

```bash
git fetch origin
git merge-base --is-ancestor origin/main origin/next && echo "fast-forward possible"
git push origin origin/next:main
```

If the check prints nothing, `main` has commits `next` doesn’t have (a hotfix released from `main`): rebase or merge them into `next` first, let the resulting prerelease go out, then promote. The release workflow refuses to release a version from `main` whose `-next.N` tags aren’t in `main`’s history, so a squash merge fails before anything is tagged or published. Open a pull request from `next` to `main` only to review the diff, and close it without merging.

### When a release fails after the tag was pushed

semantic-release pushes the version tag before it publishes to npm and creates the GitHub release. If a later step fails (npm refused the publish, GitHub was down), the tag and its channel note exist but nothing was published, and a re-run reports that there is nothing to release. Recover by removing the half-made release and re-running:

```bash
git push origin :refs/tags/v1.2.3
git push origin :refs/notes/semantic-release-v1.2.3
gh release delete v1.2.3 --yes   # only if the GitHub release was created
```

Then fix the cause and start the release workflow again from the Actions tab (`workflow_dispatch`). Check `npm view vite-styleguidist versions` first: if the npm publish did go through, keep the tag and create the GitHub release by hand instead.

Pause releases while you clean up: `gh variable set RELEASES_ENABLED --body false` before touching branches or tags, `--body true` when the state is right again. Every push to `main` or `next` runs the release workflow, a reset of `main` included, and semantic-release tags whatever version it computes from the tags it finds at that moment; a stray stable tag on a commit that `next` contains makes the next prerelease jump a major version.

## Triage

New issues and pull requests are looked at roughly once a week, see the capacity statement in [MAINTAINERS.md](../MAINTAINERS.md#capacity). A first pass gives every new issue:

- a type label (`bug`, `enhancement`, `documentation` or `question`);
- `needs-repro` when a bug has no minimal reproduction, with a comment asking for one; issues that stay in `needs-repro` without an answer for a month are closed with a note that they can be reopened;
- an answer, a question, or a short plan.

Questions are converted to Discussions. Pull requests get a review or a note about when a review can be expected.

### Labels

| Label | Meaning |
| --- | --- |
| `bug` | Something doesn’t work as documented. |
| `enhancement` | A new feature or an improvement of an existing one. |
| `documentation` | Docs, examples, comments. |
| `question` | A usage question; usually converted to a Discussion. |
| `help wanted` | The maintainers would welcome a pull request; the approach is agreed. |
| `good first issue` | Small, self-contained, a good start for a new contributor. |
| `needs-repro` | Waiting for a minimal reproduction from the reporter. |
| `breaking-change` | Fixing it changes documented behavior; needs a major release and a migration note. |
| `vite` | Concerns the Vite plugin, the Vite config merging or the dev server. |
| `imported-from-upstream` | Re-created from the original project’s tracker, see [Mirroring upstream issues](#mirroring-upstream-issues). |
| `upstream-blocked` | Blocked on a dependency (Vite, react-docgen, React) or on the original project; nothing to do here yet. |
| `security` | A security issue; handled with priority, see [SECURITY.md](../SECURITY.md). |
| `dependencies` | Dependency updates, including automated ones. |
| `technical debt` | Internal cleanup with no user-visible change. |
| `request for comments` | A proposal (often a decision record) that needs feedback before work starts. |

## Mirroring upstream issues

Some issues from the original project’s tracker still apply to this fork and are re-created here so they can be worked on; the selection is described in [Upstream backlog adoption](decisions/0007-backlog-adoption.md). Issues can’t be transferred between unrelated repositories, so a mirrored issue is a new issue that:

1. Carries the label `imported-from-upstream`.
2. Starts with a provenance header: `Imported from styleguidist/react-styleguidist#N, opened by <handle> on <date>` — the handle without a leading `@`, so the original reporter isn’t notified about a tracker they never posted to.
3. Quotes the original description in a blockquote, unchanged apart from trimming template boilerplate.
4. Ends with a **Status on this fork** section that says whether the problem was reproduced on the Vite-based build, what changed since the original report, and what the next step is.

Mirror one issue per original issue and don’t comment on the original issues one by one; the fork announces itself once on the upstream tracker (issue #2164) and leaves it at that.

## Changelogs

### What is a good changelog

- Changelogs are written for users, not developers.
- A changelog should show new features with code examples or GIFs.
- A changelog should make all breaking changes clear.
- A changelog should explain how to migrate to a new version if there are breaking changes.
- The commit log **is not** a changelog but can be a base for it: semantic-release generates the first draft from the commit subjects, the maintainer edits the GitHub release notes to add what the commits can’t say.

Check out [Keep a Changelog](https://keepachangelog.com/) for more details on good changelogs.

### What should be in a changelog

- Breaking changes first, each with a short migration note or a link to the [migration guide](Migration.md).
- New features with a one-line explanation of why you’d want them and a code example or screenshot.
- Bug fixes, grouped, in user terms (“the sidebar no longer jumps when…”, not “fix useEffect deps”).
- Credit for pull request authors: `(#1040 by @rafaesc)`. semantic-release adds the pull request number and author to each line on GitHub; keep them when you edit.
- A link to the docs page for every new or changed option.

A release note that follows this looks like:

```markdown
## 1.1.0

### New features

- **Sections can be collapsed by default.** Set `expand: false` on a section to start it collapsed; useful for long style guides. See [Sections](https://github.com/vite-styleguidist/vite-styleguidist/blob/main/docs/Components.md#sections). (#12 by @contributor)

### Bug fixes

- The dev server no longer crashes when a Markdown example is deleted while it is open in the browser. (#15 by @contributor)
```
