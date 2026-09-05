# Vite Styleguidist themed example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

This example customizes the look of the style guide with the `theme` and `styles` options pointing to files (`styleguide.theme.js` and `styleguide.styles.js`).

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/themed
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
