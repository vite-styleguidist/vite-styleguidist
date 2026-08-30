<!-- Migrating to Vite #migration -->

# Migrating to Vite

Styleguidist no longer uses webpack: it compiles and serves your components with [Vite](https://vite.dev/), which ships with Styleguidist. Most of the configuration users had to write for webpack (loaders, Babel presets, `webpackConfig`) is simply gone. This guide covers everything you may need to change to upgrade a style guide from the webpack-based versions.

## Requirements

- **Node.js** 22.12 and newer.
- **React** 18 or newer (`react` and `react-dom` are peer dependencies).
- The package is now an ES module. `import styleguidist from 'react-styleguidist'` and `require('react-styleguidist')` both work on the supported Node.js versions, see [Node.js API](API.md).

The style guide config file may be CommonJS (`module.exports`) or an ES module (`export default`): `styleguide.config.js`, `styleguide.config.mjs` or `styleguide.config.cjs`. Config files are loaded synchronously, so top-level `await` isn’t supported in them.

## Dependencies

Upgrade Styleguidist:

```bash
npm install --save-dev react-styleguidist@latest
```

Then remove the packages that were only there for Styleguidist: `webpack`, `babel-loader`, `style-loader`, `css-loader`, `file-loader`, `url-loader`, `react-docgen-displayname-handler`, etc. Keep your Babel setup only if your app itself uses it: Styleguidist doesn’t read `babel.config.js` anymore.

## Config options

### `webpackConfig` and `updateWebpackConfig`

Removed, Styleguidist throws an error when it finds them. The loaders you had to add for JavaScript, JSX, TypeScript, CSS, CSS modules, images or fonts aren’t needed: Vite handles all of them out of the box. In most cases you can delete the whole option.

Before:

```javascript
module.exports = {
  webpackConfig: {
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: 'babel-loader'
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  }
}
```

After (only the alias is still needed):

```javascript
module.exports = {
  viteConfig: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  }
}
```

The new [viteConfig](Configuration.md#viteconfig) option accepts a Vite config object or a function of the environment (`'development'` or `'production'`), exactly like `webpackConfig` did. Without it, Styleguidist picks up the `vite.config.js` next to your style guide config, the way it used to pick up `webpack.config.js`. See [Configuring Vite](Vite.md).

Things that don’t translate one-to-one:

- webpack plugins: look for the equivalent Vite plugin or Vite option (`define` replaces `DefinePlugin`, `resolve.alias` replaces `NormalModuleReplacementPlugin` for most uses, etc.).
- `resolve.extensions` isn’t needed for `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs` and `.json`.
- `devServer` options: use Vite’s [server](https://vite.dev/config/server-options) options (`server.proxy`, `server.watch`, etc.); `host`, `port` and `strictPort` are controlled by the `serverHost` and `serverPort` Styleguidist options.
- `resolve.modules` / `NODE_PATH`: use aliases instead.

### `dangerouslyUpdateWebpackConfig`

Renamed to [dangerouslyUpdateViteConfig](Configuration.md#dangerouslyupdateviteconfig) and receives the final Vite config:

```javascript
module.exports = {
  dangerouslyUpdateViteConfig(viteConfig, env) {
    viteConfig.build.chunkSizeWarningLimit = 5000
    return viteConfig
  }
}
```

### `configureServer`

The dev server is Vite’s, not Express. The function receives Vite’s [Connect](https://github.com/senchalabs/connect) middleware stack instead of an Express app, plus the environment and the `ViteDevServer` instance: `configureServer(app, env, server)`. Connect has `app.use()` but no `app.get()`, and plain Node.js responses have no `res.status()` or `res.send()`.

Before:

```javascript
module.exports = {
  configureServer(app) {
    app.get('/custom-endpoint', (req, res) => {
      res.status(200).send({ response: 'Server invoked' })
    })
  }
}
```

After:

```javascript
module.exports = {
  configureServer(app, env, server) {
    app.use('/custom-endpoint', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ response: 'Server invoked' }))
    })
  }
}
```

### `compilerConfig`

Examples are now compiled in the browser by [Sucrase](https://github.com/alangpierce/sucrase) instead of Bublé, and the option holds Sucrase `transform()` options. Delete the option if you only had it to enable Bublé features (like `dangerousTaggedTemplateString` for styled-components or `asyncAwait: false`), they all work by default now. If you keep it, start from the [default value](Configuration.md#compilerconfig): the option replaces the defaults, it isn’t merged with them.

### `propsParser`, `resolver` and `handlers`

Styleguidist now uses [react-docgen](https://github.com/reactjs/react-docgen) 8, which changed its API since version 5:

- `parse()` takes an options object and returns an array of documentation objects: `parse(source, { resolver, handlers, filename })`.
- Resolvers are class instances (or plain functions) from `builtinResolvers`, not the old `resolver.findAllComponentDefinitions` functions.
- `react-docgen-displayname-handler` isn’t needed: react-docgen’s default handlers include `displayNameHandler`, and Styleguidist falls back to the file name when a component has no display name.

Before:

```javascript
module.exports = {
  resolver:
    require('react-docgen').resolver.findAllComponentDefinitions,
  handlers: componentPath =>
    require('react-docgen').defaultHandlers.concat(
      require('react-docgen-displayname-handler').createDisplayNameHandler(
        componentPath
      )
    ),
  propsParser(filePath, source, resolver, handlers) {
    return require('react-docgen').parse(source, resolver, handlers)
  }
}
```

After:

```javascript
const {
  parse,
  defaultHandlers,
  builtinResolvers
} = require('react-docgen')
module.exports = {
  resolver: new builtinResolvers.FindAllDefinitionsResolver(),
  handlers: componentPath => defaultHandlers,
  propsParser(filePath, source, resolver, handlers) {
    return parse(source, { resolver, handlers, filename: filePath })
  }
}
```

See [resolver](Configuration.md#resolver), [handlers](Configuration.md#handlers) and [propsParser](Configuration.md#propsparser) for details and the new defaults. Custom parsers like [react-docgen-typescript](Thirdparties.md#how-styleguidist-works) work as before.

### `template`

The object form (`favicon`, `head`, `body`, `attrs`, `lang`, `trimWhitespace`) is unchanged.

If you use the function form, the context object is the same (`publicPath`, `lang`, `title`, `container`, `js`, `css`) but the scripts must be loaded as ES modules: render `js` entries as `<script type="module" src="…">`, see [template](Configuration.md#template).

### `printServerInstructions`

The second argument now also carries the URLs of the dev server: `printServerInstructions(config, { isHttps, urls: { local, network } })`.

### `require`

Works as before, the modules are imported at the top of the style guide bundle. CSS files no longer need loaders, and `babel-polyfill` is deprecated: use `core-js/stable` (or nothing, modern browsers rarely need polyfills).

### Unchanged options

`assetsDir`, `moduleAliases`, `styleguideComponents`, `theme`, `styles`, `context` and every other option keep their meaning. `moduleAliases` are now Vite `resolve.alias` entries.

## Behavior changes

### Components patterns are case-sensitive

`components: 'src/components/**/[A-Z]*.js'` no longer matches `index.js` on macOS and Windows, which the previous glob library used to match case-insensitively there. If you relied on that (by accident), adjust your pattern.

### JSX in `.js` files, no Babel

JSX in `.js` files is compiled by Styleguidist, no configuration needed. Everything else Babel used to do for your components (proposals, macros, `babel-plugin-styled-components`, etc.) doesn’t happen anymore, unless you add [@rolldown/plugin-babel](https://www.npmjs.com/package/@rolldown/plugin-babel) to `viteConfig.plugins`. Vite doesn’t support CommonJS `require()` in your source files either: use `import`.

### CSS modules

Only files named `*.module.css` (or `.module.scss`, etc.) are treated as CSS modules; plain `.css` imports are global. If your webpack config enabled `modules: true` for every CSS file, rename those files to `*.module.css` (Vite has no option to treat all CSS files as modules).

### `require.context`

Doesn’t exist in Vite, use [import.meta.glob](https://vite.dev/guide/features#glob-import), see the [cookbook](Cookbook.md#how-to-dynamically-load-other-components-in-an-example).

### Environment variables

Only `process.env.NODE_ENV` (and `process.env.STYLEGUIDIST_ENV`) are replaced in your components’ code. Other `process.env.*` values need a [define](https://vite.dev/config/shared-options#define) entry in `viteConfig`, or use `import.meta.env`.

### Theme and styles files

Files passed to the [theme](Configuration.md#theme) and [styles](Configuration.md#styles) options are bundled for the browser and must be ES modules:

```diff
- module.exports = {
+ export default {
    color: {
      link: 'firebrick'
    }
  }
```

### Examples

- Examples are compiled by Sucrase, so TypeScript syntax works in `js`/`jsx` examples, and `ts`, `tsx` and `typescript` code blocks render playgrounds too.
- Modern syntax is left as is (no transpiling down to ES5), which is what all supported browsers expect.
- `import` and `require()` in examples work as before: modules must be listed in the Markdown file, they can’t be added in the browser editor.
- Relative imports are resolved from the Markdown file, bare imports (`import map from 'lodash/map'`) from your project.

### Output

`styleguidist build` writes `index.html` into `styleguideDir` and the bundle into `styleguideDir/build/`, like before. The page loads the bundle as an ES module with relative URLs, so it can be served from any sub-path, but it can’t be opened from a `file://` URL: serve the folder over HTTP to check it locally (for example `npx serve styleguide`). Only `styleguideDir/build` is cleaned before a build, other files in the folder (`CNAME`, `.nojekyll`) are kept.

### Dev server

The dev server is Vite’s, with hot module replacement for components, Markdown examples, theme and styles files, and added or removed components. `serverPort` is strict: Styleguidist fails when the port is taken instead of silently picking another one.

## Node.js API

The methods return promises now, callbacks are still supported:

```javascript
import styleguidist from 'react-styleguidist'

const styleguide = styleguidist(config)

// Before: styleguide.build((err, config, stats) => { … })
const output = await styleguide.build()

// Before: styleguide.server((err, config) => { … })
const server = await styleguide.server()
await server.close()
```

- `build()` resolves to Vite’s build output instead of webpack stats.
- `server()` resolves to the `ViteDevServer` instance (already listening) instead of an object with a webpack compiler and an Express app.
- `makeWebpackConfig()` is replaced with `makeViteConfig(env)`, which returns a promise.

See [Node.js API](API.md).

## Testing your migration

1. Run `npx styleguidist server --verbose`: the log shows which Vite config file was loaded and the resolved Vite config.
2. Check the browser console: modules Vite can’t resolve (aliases, CommonJS-only code) show up there.
3. Run `npx styleguidist build` and serve the `styleguide` folder over HTTP to check the static version.
