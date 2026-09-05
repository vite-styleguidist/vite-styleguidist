# Example of Vite Styleguidist using styled-components (and Emotion) with TypeScript

> **Note:** This example uses the local build of Vite Styleguidist (`"vite-styleguidist": "file:../../"` in `package.json`), so the repository root has to be installed and compiled before the example itself; the steps below include that.

Styleguidist bundles the style guide with [Vite](https://vite.dev/), which compiles TypeScript and TSX natively, so this example needs no Babel presets or loaders. A custom `Wrapper` (`src/StyleGuideWrapper.tsx`) provides the styled-components theme and global styles to every example.

How to start locally:

```
git clone https://github.com/vite-styleguidist/vite-styleguidist.git
cd vite-styleguidist
npm ci && npm run compile
cd examples/styled-components
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
