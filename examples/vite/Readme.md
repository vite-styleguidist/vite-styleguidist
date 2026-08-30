# React Styleguidist in a Vite app

> **Note:** This example uses the local build of Styleguidist (`file:../../`). Before installing, run `npm ci && npm run compile` in the repository root.

A minimal [Vite](https://vite.dev/) React app (`index.html`, `src/main.jsx`, `vite.config.js` with `@vitejs/plugin-react`) with a style guide for its components.

`styleguide.config.js` only lists the components: Styleguidist finds the app’s `vite.config.js` on its own and reuses its plugins, aliases and other settings for the style guide, so the bundler is configured in one place. Both config files are ES modules (`"type": "module"` in `package.json`).

How to start locally:

```
git clone https://github.com/styleguidist/react-styleguidist.git
cd react-styleguidist/examples/vite
npm install
npx styleguidist server
```

Then open [http://localhost:6060](http://localhost:6060) in your browser. `npm run dev` starts the app itself.
