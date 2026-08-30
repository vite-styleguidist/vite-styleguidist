# React Styleguidist Preact example style guide

> **Note:** This example uses the local build of Styleguidist (`file:../../`). Before installing, run `npm ci && npm run compile` in the repository root.

![](https://d3vv6lp55qjaqc.cloudfront.net/items/0U313M3L0p120g2Y1y3J/Image%202016-04-12%20at%207.25.03%20PM.png)

The components and the style guide itself run on [Preact](https://preactjs.com/) through `preact/compat`: the `viteConfig` option in `styleguide.config.js` aliases `react`, `react-dom` and the JSX runtime to Preact.

How to start locally:

```
git clone https://github.com/styleguidist/react-styleguidist.git
cd react-styleguidist/examples/preact
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
