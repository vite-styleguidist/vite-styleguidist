<!-- About this fork #fork -->

# About this fork

Vite Styleguidist is a maintained fork of [React Styleguidist](https://github.com/styleguidist/react-styleguidist). This page explains why it exists, how it relates to the original project, and what you can expect from it. It is not affiliated with or endorsed by the original React Styleguidist maintainers.

## Why the fork exists

React Styleguidist has been inactive since 2025-01-07, the date of its last commit and of its last release, `react-styleguidist@13.1.4`. As of 2026-09-06 the upstream repository has 102 open issues and 143 open pull requests (128 of them from Dependabot), and no maintainer activity for twenty months. The package still had 58,382 npm downloads in the week of 2026-08-23 to 2026-08-29, so a lot of teams depend on a tool that no longer receives fixes.

The webpack 4 toolchain the 13.x line was built on is itself end-of-life, which made the remaining backlog (Vite support, React 19, ESM, modern Node.js) impossible to address as small patches. Rewriting the build pipeline on Vite was the point of no return: the result is a new major version that shares the configuration API and the documentation format with React Styleguidist but not its bundler, and publishing it under the original name would have required maintainer rights on npm that nobody could grant.

## Timeline

| Date | Event |
| --- | --- |
| 2025-01-07 | Last upstream commit and last upstream release, `react-styleguidist@13.1.4`. |
| 2026-08-30 | The webpack to Vite migration lands on this fork (`feat!: replace webpack with Vite and modernize the toolchain`). |
| 2026-09-06 | Decision to publish as an independent fork named Vite Styleguidist, see the [decision records](decisions/README.md). |
| _pending_ | Outreach to the original maintainers (see [Outreach record](#outreach-record) below). First prerelease `vite-styleguidist@1.0.0-next.N`. |

## Relationship to the original project

- **Independent.** The fork has its own repository, npm package, issue tracker and release process. It doesn’t need anything from the upstream project to publish or to accept contributions.
- **Inform, don’t ask.** The original maintainers are informed about the fork and asked for permission where permission is required (the logo). The fork doesn’t ask for, and doesn’t wait for, an endorsement; if the maintainers ever want to merge the two lines back together, that door is open.
- **No affiliation.** Vite Styleguidist is not affiliated with or endorsed by the original React Styleguidist maintainers. The name React Styleguidist is only used to describe where the code comes from.
- **Same license.** All code is MIT licensed, as before. [License.md](../License.md) keeps the original copyright line.

## What is kept

- **The configuration API.** `styleguideComponents`, `theme`, `styles`, `sections`, `moduleAliases`, `context`, `require`, `propsParser` and every other option keep their names and meaning; only the webpack-specific options were replaced, see the [migration guide](Migration.md).
- **The documentation format.** Markdown examples, JSDoc tags, `Readme.md` next to a component, `@visibleName`, doclet tags: nothing changes in how you document components.
- **The documentation conventions.** The docs in this folder are the upstream docs, updated. Page ids and anchors are kept wherever the content still applies so that old links keep working.
- **Credits.** Artem Sapegin is the author of React Styleguidist; the [contributors](https://github.com/styleguidist/react-styleguidist/graphs/contributors) to the original project wrote most of the code in this repository. The original logo by Sara Vieira and Andrey Okonetchnikov is credited but not reused, see [Brand and logo](decisions/0006-brand-and-logo.md).

## What changed

- Vite replaces webpack. Loaders, Babel presets and `webpackConfig` are gone; `viteConfig` and `dangerouslyUpdateViteConfig` take their place. The dev server has hot module replacement for components, Markdown examples and theme files.
- The package is an ES module and ships compiled TypeScript; `require()` keeps working on the supported Node.js versions.
- Node.js 22.12 or newer and React 18 or newer are required, see [Compatibility](Compatibility.md).
- react-docgen 8 parses your components; custom resolvers and handlers follow its API.
- Examples are compiled in the browser by Sucrase instead of Bublé, so TypeScript syntax works in examples.
- Versioning restarts at 1.0.0 under the new name, see [Versioning and release channels](decisions/0003-versioning-and-release-channels.md). The migration story is `react-styleguidist@13.1.4` to `vite-styleguidist@1.0.0`.

The full list is in the [migration guide](Migration.md).

## How to report problems

- **Bugs and feature requests:** open an issue in [the issue tracker](https://github.com/vite-styleguidist/vite-styleguidist/issues). Please include the Vite Styleguidist version, your Node.js version and a minimal reproduction.
- **Questions:** use [Discussions](https://github.com/vite-styleguidist/vite-styleguidist/discussions).
- **Security issues:** report them privately through [GitHub security advisories](https://github.com/vite-styleguidist/vite-styleguidist/security/advisories/new), never in a public issue. See [SECURITY.md](../SECURITY.md).
- **Problems with `react-styleguidist` 13.x:** this fork doesn’t ship fixes for the original package, see the [support policy](Compatibility.md#support-policy). Upgrade first, then report if the problem persists.

Issues carried over from the upstream tracker are labeled `imported-from-upstream` and quote their origin, see the [maintainer guide](Maintenance.md#mirroring-upstream-issues).

## Outreach record

This section is a checklist for the maintainer. It records what was communicated to whom, so that the fork’s conduct towards the original project is transparent. Each item is ticked and dated when it has been done; a reply, if any, is summarized underneath it.

- [ ] Message to Artem Sapegin (`sapegin`) and Andrey Okonetchnikov (`okonet`): inform them about the fork, its name and its first release; ask whether they would consider an `npm deprecate` notice on `react-styleguidist@13.1.4` pointing at `vite-styleguidist`, and whether they want the fork to link back to any particular place.
- [ ] Permission request to Sara Vieira and Andrey Okonetchnikov, authors of the original logo: ask whether the fork may reuse or adapt it. Until an answer arrives the fork uses a plain text header, see [Brand and logo](decisions/0006-brand-and-logo.md).
- [ ] Heads-up to the maintainers of [`@percy/styleguidist`](https://www.npmjs.com/package/@percy/styleguidist): its peer dependency range is `react-styleguidist >=11 <14`, which doesn’t cover `vite-styleguidist`; ask whether they want to add the new package name.
- [ ] One comment on upstream issue [#2164](https://github.com/styleguidist/react-styleguidist/issues/2164) (Vite support), pointing at the fork. One comment only, no further promotion on the upstream tracker.

## Adoption baseline

A snapshot of the original project taken on 2026-09-06, so that the fork can measure whether it is reaching the people it is meant for. Sources: the public npm downloads API and the GitHub API.

| Metric | Value |
| --- | --- |
| `react-styleguidist` npm downloads, week 2026-08-23 to 2026-08-29 | 58,382 |
| `react-styleguidist` npm downloads per month, 2025-09 to 2026-08 | between 170k and 332k |
| GitHub stars, `styleguidist/react-styleguidist` | 11,068 |
| Open issues | 102 |
| Open pull requests | 143, of which 128 opened by Dependabot |

The fork tracks its own npm downloads and the number of open issues, and revisits these numbers when it promotes a release from the `next` channel to `latest`.
