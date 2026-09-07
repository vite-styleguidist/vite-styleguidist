# Decision records

This folder holds the architecture decision records (ADRs) of Vite Styleguidist: short documents that capture a decision that is hard to reverse or that affects users, together with the context in which it was made and the options that were rejected. They exist so that the next contributor doesn’t have to re-litigate the choices behind the fork, and so that anyone (including the original React Styleguidist maintainers) can see that those choices were deliberate.

## Records

| Number | Title | Status |
| --- | --- | --- |
| [0001](0001-package-name.md) | Package name | accepted |
| [0002](0002-repo-home.md) | Repository home | accepted |
| [0003](0003-versioning-and-release-channels.md) | Versioning and release channels | accepted |
| [0004](0004-docs-site.md) | Documentation site | accepted |
| [0005](0005-funding.md) | Funding | accepted |
| [0006](0006-brand-and-logo.md) | Brand and logo | accepted |
| [0007](0007-backlog-adoption.md) | Upstream backlog adoption | accepted |
| [0008](0008-support-policy.md) | Support policy | accepted |
| [0009](0009-end-to-end-testing.md) | End-to-end testing | accepted |
| [0010](0010-code-editor.md) | Code editor | accepted |
| [0011](0011-facelift-and-dark-mode-contract.md) | Facelift and dark-mode contract | accepted |
| [0012](0012-ai-integration.md) | AI integration | accepted |
| [0013](0013-react-16-support.md) | React 16.14 and 17 support | accepted |
| [0014](0014-mdx-examples.md) | MDX examples and section pages | accepted |
| [0015](0015-scroll-synced-selection.md) | Scroll-synced selection and hash | accepted |
| [0016](0016-table-of-contents.md) | “On this page” navigation (`pageNav`) | accepted |
| [0017](0017-typescript-props.md) | Props parser for TypeScript components | accepted |

## Convention

- One file per decision, named `NNNN-short-title.md` with a zero-padded sequential number. Numbers are never reused.
- Each record has the same sections: **Date**, **Status**, **Context**, **Options considered**, **Decision**, **Consequences**. Keep them short; a record is a summary, not a design document.
- **Status** is one of `proposed`, `accepted`, `deprecated` or `superseded by NNNN`. A record is never edited to say something different once accepted: to change a decision, write a new record and mark the old one superseded.
- Anyone can propose a decision by opening a pull request that adds a record with status `proposed`. It becomes `accepted` when the pull request is merged; the discussion lives in the pull request.
- Dates are ISO 8601 (`YYYY-MM-DD`).

The format follows the widely used [ADR](https://adr.github.io/) pattern; see [MAINTAINERS.md](../../MAINTAINERS.md) for when a decision needs a record at all.
