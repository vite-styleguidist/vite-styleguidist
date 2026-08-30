<!-- Getting started #getting-started -->

# Getting started with React Styleguidist

## 1. Install Styleguidist

```bash
npm install --save-dev react-styleguidist
```

Styleguidist needs React 18 or newer and Node.js 20.19 or 22.12 and newer. It comes with [Vite](https://vite.dev/) to compile your components, you don’t need a bundler in your project.

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
- [Upgrading from a webpack-based version](Migration.md)
