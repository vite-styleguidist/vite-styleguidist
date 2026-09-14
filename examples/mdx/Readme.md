# Vite Styleguidist MDX example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

MDX support is optional: install `@mdx-js/mdx` and `remark-gfm` alongside Styleguidist and any `Readme.mdx`, `ComponentName.mdx` or `.mdx` section page is picked up. A style guide without an `.mdx` file needs neither package and behaves exactly as before.

What this example shows:

- `src/components/Button/Readme.mdx` — playgrounds with and without modifiers (`padded`, `noeditor`, `static`, a JSON settings object), a `tsx` fence, a non-playground `html` fence, a GFM table and a task list;
- `src/components/Card/Readme.mdx` — a component imported by the page (`src/docs/Callout.js`) and used as a JSX element in the prose;
- `src/components/Badge/Readme.md` — a component still documented in plain Markdown, in the same style guide;
- `docs/Intro.mdx` — a section page pointed at by `sections[].content`.

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/mdx
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
