<!-- Configuring Vite #vite -->

# Configuring Vite

Styleguidist uses [Vite](https://vite.dev/) under the hood to compile and serve your components. Vite ships with Styleguidist, there’s nothing to install, and most projects don’t need any configuration: JSX (in `.jsx`, `.tsx` and plain `.js` files), TypeScript, CSS, [CSS modules](https://vite.dev/guide/features#css-modules) (`*.module.css`), JSON and static assets like images or fonts work out of the box.

_Your project doesn’t have to use Vite._

> **Note:** See [cookbook](Cookbook.md) for more examples.

## Reusing your project’s Vite config

By default, Styleguidist looks for a Vite config file (`vite.config.js`, `.mjs`, `.cjs`, `.ts`, `.mts` or `.cts`) next to your style guide config and uses it, so your plugins, aliases, CSS options, etc. apply to the style guide too. Config files exporting a function work as usual: Styleguidist calls them with `command: 'serve'` and `mode: 'development'` for the dev server, and with `command: 'build'` and `mode: 'production'` for static builds.

If your Vite config is located somewhere else, load it manually with the [viteConfig](Configuration.md#viteconfig) option:

```javascript
// styleguide.config.mjs
import viteConfig from './configs/vite.config.js'

export default {
  viteConfig
}
```

Or, merge it with other options using Vite’s [mergeConfig](https://vite.dev/guide/api-javascript#mergeconfig):

```javascript
// styleguide.config.mjs
import { mergeConfig } from 'vite'
import viteConfig from './configs/vite.config.js'

export default {
  viteConfig: mergeConfig(viteConfig, {
    // Custom config options
  })
}
```

> **Caution:** Options that would break the style guide build are ignored: `root`, `base`, `appType`, `configFile`, `build.outDir`, `build.emptyOutDir`, `build.lib`, `build.ssr`, `build.manifest`, `build.ssrManifest`, `server.host`, `server.port`, `server.strictPort`, `server.middlewareMode`, and — under both `build.rolldownOptions` and `build.rollupOptions` — `input`, `external`, `output` and `preserveEntrySignatures`. Styleguidist controls the entry, the output and the dev server address; your library-build settings (like `external: ['react']`) must not leak into the style guide bundle.

> **Note:** Styleguidist adds [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) to the config unless your config already includes it, so your own plugin options are kept.

> **Tip:** If your Vite config file exports a function, call it yourself: `viteConfig: env => viteConfig({ command: env === 'production' ? 'build' : 'serve', mode: env })`.

## Custom Vite config

Add a `viteConfig` section to your `styleguide.config.js`:

```javascript
const path = require('path')
module.exports = {
  viteConfig: {
    // Vite plugins your components need
    plugins: [],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    define: {
      __APP_VERSION__: JSON.stringify(
        require('./package.json').version
      )
    }
  }
}
```

Or a function that receives the current environment:

```javascript
module.exports = {
  viteConfig(env) {
    if (env === 'development') {
      return {
        // custom options
      }
    }
    return {}
  }
}
```

> **Caution:** This option disables config load from `vite.config.js`, see above how to load your config manually.

> **Caution:** The same options as above (`root`, `build.outDir`, `build.rollupOptions.external`, `server.port`, etc.) will be ignored.

> **Tip:** Run the dev server in verbose mode to see the actual Vite config used by Styleguidist: `npx styleguidist server --verbose`.

### CSS preprocessors

Vite compiles Sass, Less and Stylus files on its own, you only need to install the preprocessor your components use:

```bash
npm install --save-dev sass
```

Preprocessor options (shared variables, include paths, etc.) go into [css.preprocessorOptions](https://vite.dev/config/shared-options#css-preprocessoroptions) of your Vite config.

### JSX in `.js` files

Vite only compiles JSX in `.jsx` and `.tsx` files. Styleguidist also compiles JSX in the `.js` files of your project (files in `node_modules` are left to Vite), so you don’t have to rename your components.

## Next.js

[Next.js](https://nextjs.org/) hides its bundler from you, and Styleguidist doesn’t use it: there’s nothing to install or configure. Vite understands the same JSX, TypeScript and CSS modules syntax that Next.js does.

Absolute imports declared in `jsconfig.json` or `tsconfig.json` (`baseUrl` and `paths`) aren’t known to Vite, add matching aliases to `viteConfig.resolve.alias`, or use the [vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths) plugin. Components depending on Next.js-only modules that don’t work outside Next.js (like `next/router`) can be aliased to mocks the same way.

## Non-Vite projects

You don’t need Vite or Babel in your project to use Styleguidist: it compiles your components with the Vite it ships with, whatever bundler your app uses.

> **Caution:** Your Babel configuration (`babel.config.js`, `.babelrc`) isn’t used: Vite compiles JSX and TypeScript with Oxc, without Babel. If your components rely on Babel plugins (`babel-plugin-styled-components`, macros, etc.), add [@rolldown/plugin-babel](https://www.npmjs.com/package/@rolldown/plugin-babel) to `viteConfig.plugins`.

Special needs, like aliases, environment variables or extra file types, are covered by the [viteConfig](Configuration.md#viteconfig) option, see above.

## When nothing else works

In very rare cases, like using legacy or third-party libraries, you may need to change Vite options that Styleguidist doesn’t allow you to change via `viteConfig`. In this case, you can use [dangerouslyUpdateViteConfig](Configuration.md#dangerouslyupdateviteconfig) option.

> **Danger:** You may break Styleguidist using this option, use it at your own risk.

## Migrating from webpack

Previous versions of Styleguidist were based on webpack. See the [migration guide](Migration.md) to update your `webpackConfig`, loaders and other webpack-era options.
