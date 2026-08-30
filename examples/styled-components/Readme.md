# Example of React Styleguidist using styled-components (and Emotion) with TypeScript

> **Note:** This example uses the local build of Styleguidist (`file:../../`). Before installing, run `npm ci && npm run compile` in the repository root.

Styleguidist bundles the style guide with [Vite](https://vite.dev/), which compiles TypeScript and TSX natively, so this example needs no Babel presets or loaders. A custom `Wrapper` (`src/StyleGuideWrapper.tsx`) provides the styled-components theme and global styles to every example.

How to start locally:

```
git clone https://github.com/styleguidist/react-styleguidist.git
cd react-styleguidist/examples/styled-components
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser.
