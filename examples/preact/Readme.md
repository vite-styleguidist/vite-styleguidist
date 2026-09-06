# Vite Styleguidist Preact example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

The components and the style guide itself run on [Preact](https://preactjs.com/) through `preact/compat`: the `viteConfig` option in `styleguide.config.js` aliases `react`, `react-dom` and the JSX runtime to Preact.

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/preact
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
