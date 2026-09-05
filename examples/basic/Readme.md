# Vite Styleguidist basic example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

![](https://d3vv6lp55qjaqc.cloudfront.net/items/0U313M3L0p120g2Y1y3J/Image%202016-04-12%20at%207.25.03%20PM.png)

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
