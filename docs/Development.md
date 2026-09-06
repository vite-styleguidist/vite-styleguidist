<!-- Developer guide #development -->

# Developer guide

_For basics see [How to contribute](../.github/CONTRIBUTING.md)._

Styleguidist isn’t an ordinary single-page app and some design decisions may look confusing to an outsider. In this guide, we’ll explain these decisions to un-confuse potential contributors.

The main thing is that we’re running two apps at the same time: user’s components and Styleguidist UI. They share a Vite configuration and have styles in the same scope (there’s only one scope in CSS). And we can control only one of these two apps: Styleguidist UI. That puts us under some restrictions:

- Our styles should not affect user component styles.
- User styles (especially global like Bootstrap) should not affect Styleguidist UI.
- `body` styles (like `font-family`) should affect user components as the user expects but not Styleguidist UI.

## How it works

Styleguidist uses [react-docgen](https://github.com/reactjs/react-docgen) to parse _source_ files (not transpiled). react-docgen finds exported React components and generates documentation based on PropTypes, Flow or TypeScript annotations.

Styleguidist uses Markdown for documentation: each JavaScript code block is rendered as an interactive playground with [react-simple-code-editor](https://github.com/satya164/react-simple-code-editor). To do that we extract all these code blocks using [Remark](http://remark.js.org/).

A Vite plugin (see below) generates JavaScript modules with all user components, their documentation and examples and passes them to a React app which renders a style guide.

## The Vite plugin and virtual modules

Styleguidist is a [Vite](https://vite.dev/) plugin plus a browser app. The plugin lives in [src/vite](../src/vite):

- `plugin.ts` — the plugin itself. It resolves and loads the virtual modules, serves the style guide page in development (`configureServer`), emits `index.html` in builds (`generateBundle`), copies `assetsDir` into the output (`closeBundle`) and drives hot module replacement (`hotUpdate`).
- `ids.ts` — the ids of the virtual modules and helpers to build and parse them. Following the Vite convention, `resolveId` prefixes an id with `\0` and `load` generates its source.
- `modules/styleguide.ts` — generates `virtual:rsg-styleguide`: the sections with their components, plus the part of the config the client needs (`CLIENT_CONFIG_OPTIONS`). It replaces the old `styleguide-loader`.
- `modules/props.ts` — generates `rsg-props:<file>`: the react-docgen documentation of one component (props, methods, description, JSDoc tags) and a reference to its examples module. It replaces `props-loader`.
- `modules/examples.ts` — generates `rsg-examples:<file>?…`: the examples parsed from one Markdown file, each with an `evalInContext()` function that can run it in the browser with access to the modules it imports. It replaces `examples-loader`.
- `serialize.ts` — `ModuleSerializer` turns the generated data into ES module source code. File references are _import markers_ (`importIt()` / `importDefault()` from `src/loaders/utils/importIt.ts`) that become `import` statements at the top of the module. Functions are serialized with `Function.prototype.toString()`, so anything that reaches the browser this way (like a `styles: theme => ({…})` config function) must be self-contained.
- `html.ts` — renders the HTML page for both the dev server and builds, implementing the [template](Configuration.md#template) config option.
- `jsxInJs.ts` — compiles JSX in `.js` files, which Vite doesn’t do by default.
- `absolutePaths.ts` — makes sure absolute file paths imported from our virtual modules resolve to the real files.
- `mergeViteConfig.ts` — merges the user’s Vite config into ours, dropping the options Styleguidist has to control (`IGNORED_OPTIONS`).

The entry module (`virtual:rsg-entry`) imports the [require](Configuration.md#require) config items and then the client (`src/client/index.ts`), which imports `virtual:rsg-styleguide` and renders the app.

The Vite config is assembled in [src/scripts/make-vite-config.ts](../src/scripts/make-vite-config.ts): it loads the user’s `vite.config.js` (unless the `viteConfig` option is set), adds `@vitejs/plugin-react` when the user doesn’t have it, builds the `resolve.alias` list (`moduleAliases`, `styleguideComponents` and the `rsg-components` alias) and registers our plugins. We’re trying to keep this config minimal to reduce clashes with the user’s configuration.

The Node-side helpers the plugin uses to find components, run react-docgen and split Markdown files live in [src/loaders/utils](../src/loaders/utils) (the folder keeps its historical name).

### Hot module replacement

The client accepts updates of `virtual:rsg-styleguide` (`import.meta.hot.accept` in `src/client/index.ts`) and re-renders the whole style guide with the new data. Everything else is about invalidating the right virtual module:

- Markdown examples and `theme`/`styles` files are registered with `this.addWatchFile()` when their modules load, so Vite invalidates the modules that depend on them on change.
- When a component file changes, `hotUpdate` invalidates its `rsg-props:` module to re-run react-docgen; React Fast Refresh takes care of the component itself.
- When a file is added or removed inside the components directories (the common parent of all components, or `contextDependencies`), `hotUpdate` invalidates `virtual:rsg-styleguide` to re-run the globs. Added or removed Markdown files invalidate the docs module of their component.

## React components

Most of StyleGuidist UI components consist of two parts: `Foo/Foo.tsx` that contains all logic and `Foo/FooRenderer.tsx` that contains all markup and styles. This allows users to customize rendering by overriding `*Renderer` component using the [styleguideComponents](Configuration.md#styleguidecomponents) config option:

```js
// styleguide.config.js
const path = require('path')
module.exports = {
  styleguideComponents: {
    SectionsRenderer: path.join(
      __dirname,
      'lib/styleguide/SectionsRenderer'
    )
  }
}
```

Under the hood these are Vite `resolve.alias` entries: `rsg-components/Sections/SectionsRenderer` is aliased to the user’s file, and the catch-all `rsg-components` alias (added last) points to our own components. All Styleguidist components should be imported like this: `import Foo from 'rsg-components/Foo'` to make aliases work.

Each component folder usually has several files:

- `Foo/Foo.tsx` (optional for basic components);
- `Foo/FooRenderer.tsx`;
- `Foo/Foo.spec.tsx` — tests;
- `Foo/index.ts` — reexport of `Foo.tsx` or `FooRenderer.tsx`.

## Styles

For styles we use [JSS](http://cssinjs.org/), it allows users to customize their style guide and allows us to ensure style isolation (thanks to [jss-isolate](http://cssinjs.org/jss-isolate/)). No user styles should affect Styleguidist UI and no Styleguidist styles should affect user components.

Use [clsx](https://github.com/lukeed/clsx) to merge several class names or for conditional class names, import it as `cx` (`import cx from 'clsx'`).

We use `Styled` higher-order component to allow theming (see [theme](Configuration.md#theme) and [styles](Configuration.md#styles) style guide config options). Use it like this:

```jsx
import React from 'react'
import Styled from 'rsg-components/Styled'

export const styles = ({ fontFamily, fontSize, color }) => ({
  button: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.base,
    color: color.light,
    '&:hover, &:active': {
      isolate: false,
      color: color.lightest
    }
  }
})

function ExamplePlaceholderRenderer({ classes }) {
  return (
    <button className={classes.button}>I am a styled button</button>
  )
}

export default Styled(styles)(ExamplePlaceholderRenderer)
```

Check available theme variables in [src/client/styles/theme.ts](../src/client/styles/theme.ts).

Because of isolation and theming you need to explicitly declare `fontFamily`, `fontSize` and `color`. Add `isolate: false` to your hover styles, otherwise you’ll have to repeat base non-hover styles.

## Testing

We’re using [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (in a jsdom environment) for testing. Put your component tests into `Component.spec.tsx` file in the same folder and all other tests into `__tests__/filename.spec.ts`.

Test globals (`describe`, `test`, `expect`, `vi`) are enabled, and the global setup in `test/setup.ts` adds the [jest-dom](https://github.com/testing-library/jest-dom) matchers. To test particular class names use `classes` function (available in the global namespace in tests), it returns a class name map whose values equal the rule keys:

```tsx
import React from 'react'
import { render } from '@testing-library/react'
import { TabButtonRenderer, styles } from './TabButtonRenderer'

const props = {
  classes: classes(styles)
}

test('should render active styles', () => {
  const { container } = render(
    <TabButtonRenderer {...props} active>
      pizza
    </TabButtonRenderer>
  )
  expect(container.firstChild).toHaveClass('isActive')
})
```

Run `npm test` to run linters, the type checker and all tests, `npm run test:watch` to run tests in watch mode, and `npx vitest -u` to update snapshots.
