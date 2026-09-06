<!-- Compatibility #compatibility -->

# Compatibility

This page is the single source of truth for what Vite Styleguidist supports. `package.json` (`engines`, `peerDependencies`), the CI matrix, `.nvmrc` and every other doc must agree with the table below; when they don’t, the table wins and the others are bugs.

## Supported versions

| What | Supported | Notes |
| --- | --- | --- |
| Node.js | `^22.12.0 \|\| >=24.0.0` | Node.js 22.12 or newer. Node 23 is not supported (it is an odd-numbered, end-of-life line); 24 and later are. This is the `engines.node` range in `package.json`; npm only warns (`EBADENGINE`) on other versions unless you set `engine-strict=true`, so the `styleguidist` command refuses to start on an unsupported Node.js and says why. CI runs the unit tests on Node 22 and 24, and the integration tests on Node 22. |
| React | `>=16.14.0` | `react` and `react-dom` are peer dependencies. React 16.14 is the floor because the style guide is compiled with the automatic JSX runtime (`react/jsx-runtime`), which first shipped in 16.14. On React 16 and 17 the style guide mounts with the legacy `ReactDOM.render` API, on 18 and later with `createRoot`; the choice is made when the style guide is built, from the `react-dom` installed in your project, so neither branch imports a module the other React lacks (see [decision 0013](decisions/0013-react-16-support.md)). CI builds the examples and runs the browser tests with React 16.14, 17, 18 and 19, and the unit tests with React 19. Preact works through `preact/compat`, see the [cookbook](Cookbook.md#how-to-use-styleguidist-with-preact). |
| Vite | `^8.2.2`, bundled | Vite is a dependency of Vite Styleguidist, not a peer dependency: you don’t install it and you don’t pick its version. Your own project may use any bundler, or a different Vite major; only the style guide is built with the bundled one, see [Configuring Vite](Vite.md). |
| MDX | `@mdx-js/mdx` ^3.1.1, `remark-gfm` ^4.0.1, both optional | Optional peer dependencies, needed only by a style guide that has `.mdx` files (see [MDX](Documenting.md#mdx)). They are resolved from your project first, so a monorepo or a strict pnpm layout works; a discovered `.mdx` is skipped with a warning when `@mdx-js/mdx` is missing, and an `.mdx` you named yourself is an error. Nothing else in the style guide depends on them, and a `.md`-only style guide never loads them. |
| TypeScript | 5.9 (type declarations) | The package ships `.d.ts` files generated with TypeScript `^5.9.3`. Consumers on any TypeScript 5.x should be fine; older versions are not tested. TypeScript in your components needs no setup: Vite compiles it and react-docgen reads the type annotations. The `.d.ts` files are generated against `@types/react` 19 and use the `React.JSX` namespace; with React 16 or 17, use the latest `@types/react` 16.14.x or 17.0.x (which backport it) or keep `skipLibCheck: true` when you import renderers from `vite-styleguidist/lib/client/...` in TypeScript. |
| Package managers | npm (tested), pnpm and yarn (should work) | CI installs with `npm ci`. pnpm and yarn aren’t exercised in CI; the package has no install scripts and no peer dependency on a package manager, so they are expected to work. Report a bug if they don’t. |
| Operating system | Linux (tested), macOS and Windows (best effort) | CI runs on `ubuntu-latest`. macOS and Windows are used by the maintainer and by contributors but aren’t part of CI; bugs on them are accepted and fixed on a best-effort basis. Note the default component glob is case-sensitive, see [Locating components](Components.md#finding-components). |
| Browsers | Current evergreen browsers | The style guide is built as ES modules with modern syntax, which is what every supported browser expects. Internet Explorer and other legacy browsers aren’t supported, for the style guide UI or for the examples. |

## Support policy

- **Only the latest major version receives fixes.** When 2.0.0 ships, 1.x stops receiving fixes, including security fixes, unless a fix is trivial to backport and someone volunteers to do it.
- **Prereleases on the `next` dist-tag are supported for bug reports**, not for production use: a `1.0.0-next.N` version may change behavior before `1.0.0` without a major version bump.
- **No fixes for `react-styleguidist` 13.x.** This fork doesn’t publish to the `react-styleguidist` npm package and can’t. If you hit a bug on 13.x, follow the [migration guide](Migration.md) first and report the problem here if it persists.
- **Security issues** are reported privately through [GitHub security advisories](https://github.com/vite-styleguidist/vite-styleguidist/security/advisories/new), see [SECURITY.md](../SECURITY.md). Fixes are published as patch releases as soon as they are ready.
- **Dropping a Node.js or React version is a breaking change** and only happens in a major release, with the new range recorded in this table and in the release notes.

What “supported” means here: the maintainer commits to accepting bug reports for these combinations and to trying to fix them, on a best-effort basis and without a service level agreement, see [MAINTAINERS.md](../MAINTAINERS.md).
