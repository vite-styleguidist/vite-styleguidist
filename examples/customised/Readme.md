# Vite Styleguidist customized example style guide

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

This example overrides some of Styleguidist’s own components (`styleguideComponents` option) and uses CSS Modules (`*.module.css`), which Vite supports out of the box: no bundler or Babel configuration needed.

It is also the example of a style guide with **one fixed palette**: `theme.color` pins literal colours, which opts those tokens out of dark mode, so `colorScheme` is set to `light` and the scheme toggle disappears. That is the honest pairing — a fixed palette and a fixed scheme — and it is the reason the `colorScheme` option exists. For colours that should switch with the light/dark toggle instead, see `examples/themed`.

The example components still read Styleguidist’s colour tokens (`src/components/Button/Button.module.css`), which resolve to the light values here and keep the components correct if the forced scheme is ever dropped. See the [Cookbook recipe](https://github.com/vite-styleguidist/vite-styleguidist/blob/main/docs/Cookbook.md#how-to-make-my-components-follow-the-style-guides-colour-scheme).

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
