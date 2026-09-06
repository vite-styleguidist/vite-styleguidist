<!--
  Thanks for the pull request! Please read .github/CONTRIBUTING.md if you haven’t yet.
  Keep the headings, replace the comments with your text, and tick what applies.
-->

## What and why

<!--
  What does this change do, and why is it needed? Describe the behaviour before and after.
  For a bug fix, explain the root cause; for a feature, link the discussion where the design was agreed.
-->

## Linked issue

<!-- For example: Closes #123. Leave empty if there is none. -->

## Checklist

- [ ] The pull request title follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (`type(scope): summary`, lowercase). It becomes the squash-merge commit and the changelog entry, so it must describe the change on its own.
- [ ] Tests added or updated.
- [ ] Documentation updated (`docs/*.md`, and the site under `site/` if it is affected).
- [ ] `package-lock.json` updated if dependencies changed (run `npm install`, commit both files).
- [ ] Breaking change: explained above, marked with a `!` in the title (`feat!: …`) and described in a `BREAKING CHANGE:` footer of the commit message, including how to migrate.

<!-- Not a breaking change? Leave that last box unticked, it is fine. -->
