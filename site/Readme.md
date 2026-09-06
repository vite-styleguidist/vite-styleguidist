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
