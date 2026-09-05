# Vite Styleguidist customized example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

![](https://d3vv6lp55qjaqc.cloudfront.net/items/0h0d3k2f172v3t3a2d1U/customised.png)

This example overrides some of Styleguidist’s own components (`styleguideComponents` option) and uses CSS Modules (`*.module.css`), which Vite supports out of the box: no bundler or Babel configuration needed.

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/customised
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
