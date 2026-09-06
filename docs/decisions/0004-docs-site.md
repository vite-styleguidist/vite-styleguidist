# 0004: Documentation site

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The original documentation lives at `react-styleguidist.js.org`, a js.org subdomain granted to the upstream repository and deployed through the upstream maintainers’ Netlify account, with Algolia search, analytics and ad accounts that the fork doesn’t control. The `site/` folder in the repository is a Docusaurus 2 alpha on webpack 4 and React 16 that hasn’t been built in years. Every absolute `react-styleguidist.js.org/docs/...` link in the docs and in the CLI’s error messages either shows the webpack-era docs or, for the pages added by the migration (`/docs/vite`, `/docs/migration`), returns 404 today.

## Options considered

1. **Docusaurus 3 on GitHub Pages**, at `https://vite-styleguidist.github.io/vite-styleguidist/`. Keeps the existing docs-to-site sync tooling (after an upgrade), free hosting under the organization, no external accounts.
2. **VitePress.** Fits the Vite theme and is lighter, but throws away the sync script, the sidebar configuration and the remark link-rewriting plugin, and adds a second documentation toolchain to learn.
3. **In-repo Markdown only**, no site. Zero maintenance, GitHub renders everything, but no search, no versioned docs, and the URLs are long.
4. **Reclaim `react-styleguidist.js.org`.** The js.org registry assigns the name to the upstream repository; the fork can’t claim it, and doing so would be misleading anyway.

## Decision

Two phases. **Now:** every link in the README, the docs and the CLI points at the Markdown files in this repository (`https://github.com/vite-styleguidist/vite-styleguidist/blob/main/docs/<Page>.md`, or relative links inside `docs/`), which GitHub renders with working anchors. **Next:** upgrade `site/` to Docusaurus 3 and deploy it to GitHub Pages at `https://vite-styleguidist.github.io/vite-styleguidist/` (base URL `/vite-styleguidist/`); once it is live, repoint the links and ask js.org for a new subdomain if the project still wants one. The old js.org domain isn’t reused.

## Consequences

- The docs are readable and correct from day one, including the pages the live upstream site 404s on. Search is missing until phase two.
- All Algolia, analytics, ad and Netlify configuration inherited in `site/` is removed rather than pointed at new accounts; the fork starts without third-party trackers on its site.
- Docs pages keep their `<!-- Title #id -->` headers so that the site’s page ids (and old deep links, once redirected) keep working. New pages pick ids the same way: `fork`, `compatibility`.
- The `HOMEPAGE`, `BUGS` and `DOCS_*` constants that the CLI prints must change together with this decision; that is a code change outside the docs.
