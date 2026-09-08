# Vite Styleguidist docs site

The documentation site of [Vite Styleguidist](https://github.com/vite-styleguidist/vite-styleguidist), built with [Docusaurus 3](https://docusaurus.io/) and published to GitHub Pages at <https://vite-styleguidist.github.io/vite-styleguidist/> by [`.github/workflows/site.yml`](../.github/workflows/site.yml).

Vite Styleguidist is a maintained fork of React Styleguidist. It is not affiliated with or endorsed by the original React Styleguidist maintainers.

## How it fits together

- The Markdown files in the repo-root [`docs/`](../docs) folder are the **single source of truth**. They must stay readable on GitHub, so they carry no front matter.
- `npm run sync` ([`scripts/sync.js`](scripts/sync.js)) copies them into `site/docs/` (gitignored) and derives the Docusaurus front matter from two conventions: the H1 is the page title, and an optional first-line comment `<!-- Sidebar label #page-id -->` gives the sidebar label and the page id (= URL slug `/docs/<id>`). It also converts `> **Tip:**`-style callouts to admonitions and removes what MDX 3 rejects. The conventions are documented in [`scripts/docs.js`](scripts/docs.js).
- [`remark.js`](remark.js) rewrites the relative `Foo.md#anchor` links used in the docs to `/docs/<id>#anchor`, resolving ids through the same table as `sync.js`.
- [`sidebars.js`](sidebars.js) lists the page ids per section.
- [`src/pages/`](src/pages) holds the landing page and the Learn page; [`src/components/`](src/components) a few layout primitives.
- [`scripts/deploy.sh`](scripts/deploy.sh) builds the package, builds every example style guide from [`examples/`](../examples) and copies them into `static/examples/<name>/` (gitignored) so the site can link to live demos, then syncs and builds the site.

## Local development

```bash
cd site
npm ci
npm run sync   # regenerate site/docs from ../docs; rerun after editing the docs
npm start
```

`npm start` opens a dev server with live reload for the pages and the generated docs. Search is only available in the production build.

## Production build

```bash
npm run build   # -> site/build
npm run serve   # serve site/build locally, under the /vite-styleguidist/ base URL
```

To also build and include the example style guides (what the deploy workflow does):

```bash
bash scripts/deploy.sh
```

## Adding a documentation page

1. Create `docs/Foo.md` in the repo root with a first line like `<!-- Foo #foo -->` and an H1 title.
2. Add the id (`foo`) to the right section of `sidebars.js`.
3. Link to it from other docs as `Foo.md` or `Foo.md#anchor`.

## Deployment

Every push to `main` that touches `docs/`, `site/`, `examples/` or `src/` rebuilds and deploys the site through the `Docs site` workflow. It can also be triggered by hand from the Actions tab. The repository's Pages source must be set to "GitHub Actions" (Settings -> Pages) once.

The site is served from the `/vite-styleguidist/` sub-path, which is why every internal asset URL goes through `useBaseUrl`, and CSS uses relative `url(../../static/...)` paths.

## Known dependency advisories

`npm audit` in this folder reports a chain of high-severity findings that all come from a single package: **`image-size` 2.0.2**, reached through `@docusaurus/core` -> `@docusaurus/mdx-loader` -> `image-size`. Two advisories, [GHSA-w3rx-r6r6-pgpr][icns] (ICNS parser) and [GHSA-5p2g-fcmc-qvqq][jxl] (JXL and HEIF parsers), describe infinite loops (CWE-835) that hang the Node event loop when the parser is handed a crafted image buffer. Both are availability-only (`C:N/I:N/A:H`).

**There is nothing to upgrade to.** 2.0.2 is the latest release, published in April 2025, and the upstream repository was archived in June 2026, a week before the advisories were published, so no patched version is coming. Docusaurus has an open pull request that replaces the dependency ([facebook/docusaurus#12388][pr], unmerged as of September 2026); when that ships in a 3.x release, bumping Docusaurus and deleting this section is the whole fix. A community fork (`image-size-next`) exists on npm, but it is a month old and has a single unknown maintainer, so swapping build-time code for it would trade an availability bug for a supply-chain risk. Not worth it.

Why it is not exploitable here, and what would change that:

- `image-size` runs **only during the build**, from `mdx-loader`'s `transformImage` remark plugin, which measures local images so it can emit `width`/`height` attributes. It never runs in the browser and is not part of the deployed static site.
- The only images it opens are the ones committed to this repository (`site/static/img/*`, plus whatever the example builds copy in). They are PNG, JPEG and SVG: none of the three affected formats.
- The worst case is therefore a hung `npm run build` on a CI runner, caused by someone who can already commit a file to this repository.
- The `Audit` workflow only checks the published package's runtime tree (`npm audit --omit=dev` at the repo root), so this does not fail CI.

It would become a real risk if the docs build ever started measuring images it does not control: images fetched at build time from a remote source, images supplied by a pull request from a fork that CI builds without review, or a user-content pipeline reusing this Docusaurus config. Don't add any of those while this dependency is in the tree.

[icns]: https://github.com/advisories/GHSA-w3rx-r6r6-pgpr
[jxl]: https://github.com/advisories/GHSA-5p2g-fcmc-qvqq
[pr]: https://github.com/facebook/docusaurus/pull/12388
