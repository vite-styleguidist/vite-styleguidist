# Vite Styleguidist custom dev server endpoint example

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

![](https://d3vv6lp55qjaqc.cloudfront.net/items/353m2x0d1a1A3I1K3J2P/Image%202016-04-12%20at%208.10.14%20PM.png)

The `configureServer` option in `styleguide.config.js` adds a `/custom` endpoint to the style guide dev server. Styleguidist runs on Vite, so `configureServer` receives Vite’s [connect](https://github.com/senchalabs/connect) middleware stack instead of an Express app: use `app.use(path, handler)` and Node’s plain `http` response API.

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/express
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser and press the “Invoke server” button.
