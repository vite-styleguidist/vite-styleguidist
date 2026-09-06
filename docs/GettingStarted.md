<!-- Getting started #getting-started -->

# Getting started with Vite Styleguidist

## 1. Install Styleguidist

```bash
npm install --save-dev vite-styleguidist
```

> **Note:** While 1.0 is in beta, the command above installs the latest `1.0.0-next.N` prerelease (npm points `latest` at the first version ever published, and no stable version exists yet). To be explicit, install from the `next` dist-tag: `npm install --save-dev vite-styleguidist@next`.

Styleguidist needs React 18 or newer and Node.js 22.12 or newer (Node 23 is not supported; 24 and later are), see [Compatibility](Compatibility.md). It comes with [Vite](https://vite.dev/) to compile your components, you don’t need a bundler in your project.

> **Note:** Vite Styleguidist is a maintained fork of React Styleguidist. If you are upgrading from `react-styleguidist` 13.x, see the [migration guide](Migration.md).

## 2. Configure your style guide

**If your components live in `src/components` (or `src/Components`) you can skip this step.** Styleguidist finds them, understands JSX, TypeScript, CSS and static assets, and reuses your `vite.config.js` when you have one.

- [Point Styleguidist to your React components](Components.md)
- [Tell Styleguidist how to load your app’s code](Vite.md), if the defaults aren’t enough

## 3. Start your style guide

- Run **`npx styleguidist server`** to start a style guide dev server.
- Run **`npx styleguidist build`** to build a production HTML version.

> **Tip:** We recommend [adding these commands to your `package.json`](CLI.md#usage).

## 4. Start documenting your components

See how to [document your components](Documenting.md).

## Something isn’t working?

- [Solutions for common problems and questions](Cookbook.md)
- [Configuring Styleguidist with third-party tools](Thirdparties.md)
- [Upgrading from react-styleguidist 13.x](Migration.md)
