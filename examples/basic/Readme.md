# Vite Styleguidist basic example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

Styleguidist bundles the style guide with [Vite](https://vite.dev/): JSX (also in `.js` files), CSS imports and static assets work out of the box, so this example needs no bundler or Babel configuration.

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/basic
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
