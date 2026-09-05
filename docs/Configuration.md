# Configuration

By default, Styleguidist will look for `styleguide.config.js` file in your project’s root folder. You can change the location of the config file using `--config` [CLI](CLI.md) option.

The config file may be a CommonJS module (`module.exports = {…}`) or an ES module (`export default {…}`), named `styleguide.config.js`, `styleguide.config.mjs` or `styleguide.config.cjs`.

> **Caution:** Config files are loaded synchronously, top-level `await` isn’t supported in them.

## `assetsDir`

Type: `String` or `Array`, optional

Your application static assets folder will be accessible as `/` in the style guide dev server, and its files are copied into the [styleguideDir](#styleguidedir) folder by `styleguidist build`.

## `compilerConfig`

Type: `Object`, default:

```javascript
{
  transforms: ['jsx', 'typescript'],
  // Examples get `React` injected, so the classic runtime just works
  jsxRuntime: 'classic',
  // Skip development-only __source/__self props (React 19 warns about them)
  production: true,
  // Leave modern syntax alone, all supported browsers understand it
  disableESTransforms: true,
  // Never strip imports: side-effect imports are common in examples and
  // import statements are rewritten to require() calls by Styleguidist
  keepUnusedImports: true
}
```

Styleguidist uses [Sucrase](https://github.com/alangpierce/sucrase) to compile examples (JSX and TypeScript) in the browser. This config object will be passed as the second argument for `sucrase.transform()`.

> **Caution:** The option replaces the default value, it isn’t merged with it. Start from the defaults, which you can import from `vite-styleguidist/lib/client/utils/compileCode.js` as `DEFAULT_COMPILER_CONFIG`.

## `components`

Type: `String`, `Function` or `Array`, default: `src/components/**/*.{js,jsx,ts,tsx}`

- when `String`: a [glob pattern](https://github.com/isaacs/node-glob#glob-primer) that matches all your component modules.
- when `Function`: a function that returns an array of module paths.
- when `Array`: an array of module paths.

All paths are relative to config folder.

> **Note:** Patterns are case-sensitive on every platform: `[A-Z]*.js` won’t match `index.js`.

See examples in the [Components section](Components.md).

## `context`

Type: `Object`, optional

Modules that will be available for examples. You can use it for utility functions like Lodash or for data fixtures.

```javascript
module.exports = {
  context: {
    map: 'lodash/map',
    users: path.resolve(__dirname, 'fixtures/users')
  }
}
```

Then you can use them in any example:

```jsx
<Message>{map(users, 'name').join(', ')}</Message>
```

## `contextDependencies`

Type: `String[]`, optional

Array of absolute paths that allow you to specify absolute paths of directories to watch for additions or removals of components.

By default Styleguidist uses common parent directory of your components.

```javascript
module.exports = {
  contextDependencies: [path.resolve(__dirname, 'lib/components')]
}
```

## `configureServer`

Type: `Function`, optional

Function that allows you to add endpoints to the underlying Vite dev server:

```javascript
module.exports = {
  configureServer(app, env, server) {
    // `app` is the Connect middleware stack of the Vite dev server
    // running Styleguidist, `server` is the ViteDevServer instance
    app.use('/custom-endpoint', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ response: 'Server invoked' }))
    })
  }
}
```

Your components will be able to invoke the URL `http://localhost:6060/custom-endpoint` from their examples.

The middleware stack is a [Connect](https://github.com/senchalabs/connect) instance (`app.use()`), not an Express app: `req` and `res` are plain Node.js request and response objects. Middlewares added here run before Vite’s own.

## `dangerouslyUpdateViteConfig`

Type: `Function`, optional

> **Danger:** You may break Styleguidist by using this option, try to use [viteConfig](#viteconfig) option instead.

Allows you to modify the final Vite config without any restrictions:

```javascript
module.exports = {
  dangerouslyUpdateViteConfig(viteConfig, env) {
    // WARNING: inspect Styleguidist Vite config before modifying it, otherwise you may break Styleguidist
    console.log(viteConfig)
    viteConfig.build.chunkSizeWarningLimit = 5000
    return viteConfig
  }
}
```

## `defaultExample`

Type: `Boolean` or `String`, default: `false`

For components that do not have an example, a default one can be used. When set to `true`, the [DefaultExample.md](../templates/DefaultExample.md) is used, or you can provide the path to your own example Markdown file.

When writing your own default example file, `__COMPONENT__` will be replaced by the actual component name at compile time.

## `exampleMode`

Type: `String`, default: `collapse`

Defines the initial state of the example code tab:

- `collapse`: collapses the tab by default.
- `hide`: hide the tab and it can´t be toggled in the UI.
- `expand`: expand the tab by default.

## `getComponentPathLine`

Type: `Function`, default: component filename

Function that returns a component path line (displayed under the component name).

For example, instead of `components/Button/Button.js` you can print `import Button from 'components/Button';`:

```javascript
const path = require('path')
module.exports = {
  getComponentPathLine(componentPath) {
    const name = path.basename(componentPath, '.js')
    const dir = path.dirname(componentPath)
    return `import ${name} from '${dir}';`
  }
}
```

## `getExampleFilename`

Type: `Function`, default: finds `Readme.md` or `ComponentName.md` in the component folder

Function that returns examples file path for a given component path.

For example, instead of `Readme.md` you can use `ComponentName.examples.md`:

```javascript
module.exports = {
  getExampleFilename(componentPath) {
    return componentPath.replace(/\.jsx?$/, '.examples.md')
  }
}
```

## `handlers`

Type: `Function`, optional, default: react-docgen’s [defaultHandlers](https://github.com/reactjs/react-docgen#handlers)

Function that returns an array of [react-docgen](https://github.com/reactjs/react-docgen) handlers used to process the discovered components and generate documentation objects. Default behaviors include discovering component documentation blocks, prop types, defaults, methods and display names. If setting this property, it is best to build from the default handler list, such as in the example below.

A handler is a function `(documentation, componentDefinition) => void`, see the [react-docgen handler documentation](https://github.com/reactjs/react-docgen#handlers).

```javascript
const { defaultHandlers } = require('react-docgen')
module.exports = {
  handlers: componentPath => [
    ...defaultHandlers,
    // Record the source file of every component
    (documentation, componentDefinition) => {
      documentation.set('sourceFile', componentPath)
    }
  ]
}
```

> **Note:** When react-docgen can’t infer a display name, Styleguidist uses the file name (or the folder name for `index.js` files), so `react-docgen-displayname-handler` isn’t needed.

## `ignore`

Type: `String[]`, default: `['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}', '**/*.d.ts']`

Array of [glob pattern](https://github.com/isaacs/node-glob#glob-primer) that should not be included in the style guide.

> **Caution:** You should pass glob patterns, for example, use `**/components/Button.js` instead of `components/Button.js`.

## `logger`

Type: `Object`, by default will use `console.*` in CLI or nothing in Node.js API

Custom logger functions:

```javascript
module.exports = {
  logger: {
    // One of: info, debug, warn
    // Suppress messages
    info: () => {},
    // Override display function
    warn: message => console.warn(`NOOOOOO: ${message}`)
  }
}
```

## `minimize`

Type: `Boolean`, default: `true`

If `false`, the production build will not be minimized.

## `moduleAliases`

Type: `object`, optional

Define aliases for modules, that you can import in your examples, to make example code more realistic and copypastable:

```javascript
const path = require('path')
module.exports = {
  moduleAliases: {
    'rsg-example': path.resolve(__dirname, 'src')
  }
}
```

````jsx
// ```jsx inside Markdown
import React from 'react'
import Button from 'rsg-example/components/Button'
import Placeholder from 'rsg-example/components/Placeholder'
````

Aliases are passed to Vite as [resolve.alias](https://vite.dev/config/shared-options#resolve-alias) entries: an alias matches the module name itself (`rsg-example`) and any path under it (`rsg-example/components/Button`).

## `mountPointId`

Type: `string`, default: `rsg-root`

The ID of a DOM element where Styleguidist mounts.

## `pagePerSection`

Type: `Boolean`, default: `false`

Render one section or component per page.

If `true`, each section will be a single page.

The value may depend on a current environment:

```javascript
module.exports = {
  pagePerSection: process.env.NODE_ENV !== 'production'
}
```

To isolate section’s children as single pages (subroutes), add `sectionDepth` into each section with the number of subroutes (depth) to render as single pages.

For example:

```javascript
module.exports = {
  pagePerSection: true,
  sections: [
    {
      name: 'Documentation',
      sections: [
        {
          name: 'Files',
          sections: [
            {
              name: 'First File'
            },
            {
              name: 'Second File'
            }
          ]
        }
      ],
      // Will show "Documentation" and "Files" as single pages, filtering its children
      sectionDepth: 2
    },
    {
      name: 'Components',
      sections: [
        {
          name: 'Buttons',
          sections: [
            {
              name: 'WrapperButton'
            }
          ]
        }
      ],
      // Will show "Components" as single page, filtering its children
      sectionDepth: 1
    },
    {
      name: 'Examples',
      sections: [
        {
          name: 'Case 1',
          sections: [
            {
              name: 'Buttons'
            }
          ]
        }
      ],
      // There is no subroutes, "Examples" will show all its children on a page
      sectionDepth: 0
    }
  ]
}
```

## `printBuildInstructions`

Type: `Function`, optional

Function that allows you to override the printing of build messages to console.log.

```javascript
module.exports = {
  printBuildInstructions(config) {
    console.log(
      `Style guide published to ${config.styleguideDir}. Something else interesting.`
    )
  }
}
```

## `printServerInstructions`

Type: `Function`, optional

Function that allows you to override the printing of local dev server messages to console.log. The second argument tells whether the server uses HTTPS and lists its URLs.

```javascript
module.exports = {
  printServerInstructions(config, { isHttps, urls }) {
    // urls.local and urls.network are arrays of URLs
    console.log(`Local style guide: ${urls.local[0]}`)
  }
}
```

## `previewDelay`

Type: `Number`, default: 500

Debounce time in milliseconds used before rendering the changes from the editor. While typing code the preview will not be updated.

## `propsParser`

Type: `Function`, optional

Function that allows you to override the mechanism used to parse props from a source file. The default mechanism is using [react-docgen](https://github.com/reactjs/react-docgen) to parse props. The function receives the file path, its source code, and the [resolver](#resolver) and [handlers](#handlers) from the config, and returns a react-docgen documentation object or an array of them (only the first one is used).

```javascript
const { parse } = require('react-docgen')
module.exports = {
  propsParser(filePath, source, resolver, handlers) {
    return parse(source, { resolver, handlers, filename: filePath })
  }
}
```

## `require`

Type: `String[]`, optional

Modules that are required for your style guide. Useful for third-party styles or polyfills.

```javascript
module.exports = {
  require: [
    'core-js/stable',
    path.join(__dirname, 'styleguide/styles.css')
  ]
}
```

> **Note:** These modules are imported at the top of the style guide bundle, before Styleguidist’s own code. Installed packages and absolute paths work; CSS, Sass, images and other file types Vite understands don’t need any extra configuration.

See [Configuring Vite](Vite.md) for more details.

## `resolver`

Type: `Object` (resolver instance) or `Function`, optional

A [react-docgen resolver](https://github.com/reactjs/react-docgen#resolver) that identifies the components to document in a file. Default behavior is to find all exported components in each file, plus anything exported with a `@component` JSDoc annotation (which makes [styled-components](Thirdparties.md#styled-components) and other non-standard components work). You can configure it to find all components or use a custom detection method.

```javascript
const { builtinResolvers } = require('react-docgen')
module.exports = {
  // Document all components found in a file, not only the exported ones
  resolver: new builtinResolvers.FindAllDefinitionsResolver()
}
```

The default is a `ChainResolver` of Styleguidist’s own `FindAnnotatedExportsResolver` (available as `vite-styleguidist/lib/loaders/utils/FindAnnotatedExportsResolver.js`) and react-docgen’s `FindAnnotatedDefinitionsResolver` and `FindExportedDefinitionsResolver`.

## `ribbon`

Type: `Object`, optional

Show “Fork Me” ribbon in the top right corner.

```javascript
module.exports = {
  ribbon: {
    // Link to open on the ribbon click (required)
    url: 'http://example.com/',
    // Text to show on the ribbon (optional)
    text: 'Fork me on GitHub'
  }
}
```

Use the [theme](#theme) config option to change ribbon style.

## `sections`

Type: `Array`, optional

Allows components to be grouped into sections with a title and overview content. Sections can also be content only, with no associated components (for example, a textual introduction). Sections can be nested.

See examples of [sections configuration](Components.md#sections).

## `serverHost`

Type: `String`, default: `0.0.0.0`

Dev server hostname.

## `serverPort`

Type: `Number`, default: `process.env.NODE_PORT` or `6060`

Dev server port. Can also be set via command line `--port=6060`.

> **Note:** Styleguidist fails to start when the port is already in use instead of picking another one.

## `showSidebar`

Type: `Boolean`, default: `true`

Toggle sidebar visibility. The sidebar will be hidden when opening components or examples in isolation mode even if this value is set to `true`. When set to `false`, the sidebar will always be hidden.

## `skipComponentsWithoutExample`

Type: `Boolean`, default: `false`

Ignore components that don’t have an example file (as determined by [getExampleFilename](#getexamplefilename)). These components won’t be accessible from other examples unless you [manually `require` them](Cookbook.md#how-to-hide-some-components-in-style-guide-but-make-them-available-in-examples).

## `sortProps`

Type: `Function`, optional

Function that sorts component props. By default props are sorted such that required props come first, optional props come second. Props in both groups are sorted by their property names.

To disable sorting, use the identity function:

```javascript
module.exports = {
  sortProps: props => props
}
```

## `styleguideComponents`

Type: `Object`, optional

Override React components used to render the style guide:

```javascript
module.exports = {
  styleguideComponents: {
    Wrapper: path.join(__dirname, 'styleguide/components/Wrapper'),
    StyleGuideRenderer: path.join(
      __dirname,
      'styleguide/components/StyleGuide'
    )
  }
}
```

Paths may omit the extension (`.js`, `.jsx`, `.ts`, `.tsx`, etc.), Vite resolves them like any import. Keys are component names (`Wrapper`, `StyleGuideRenderer`, `SectionsRenderer`), [check the source](../src/client/rsg-components) to see what components are available.

See an example of [customized style guide](../examples/customised).

To wrap, rather than replace a component, make sure to import the default implementation using the full path to `vite-styleguidist`, with the `.js` extension, for example `vite-styleguidist/lib/client/rsg-components/Sections/SectionsRenderer.js`. (The package’s `exports` map doesn’t add extensions for you, so the extensionless form only works when a bundler happens to resolve it.) See an example of [wrapping a Styleguidist component](../examples/customised/styleguide/components/SectionsRenderer.js).

**Note**: these components are not guaranteed to be safe from breaking changes in Styleguidist updates.

## `styleguideDir`

Type: `String`, default: `styleguide`

Folder for static HTML style guide generated with `styleguidist build` command. The page is written to `index.html` and the bundle to the `build` subfolder, which is the only thing cleaned before a build.

## `styles`

Type: `Object`, `String` or `Function`, optional

Customize styles of any Styleguidist’s component using an object, a function returning said object or a file path to a file exporting said styles.

See examples in the [cookbook](Cookbook.md#how-to-change-styles-of-a-style-guide).

> **Tip:** Using a function allows access to theme variables like in the example below. See available [theme variables](../src/client/styles/theme.ts). The returned object folows the same format as when configured as a litteral.

```javascript
module.exports = {
  styles: function (theme) {
    return {
      Logo: {
        logo: {
          // we can now change the color used in the logo item to use the theme's `link` color
          color: theme.color.link
        }
      }
    }
  }
}
```

**Note:** If using a file path, it has to be absolute or relative to the config file. The file is bundled for the browser and must be an ES module (`export default {…}` or `export default theme => ({…})`).

## `template`

Type: `Object` or `Function`, optional.

Change HTML for the style guide app.

An object with options to add a favicon, meta tags, inline JavaScript or CSS, etc.:

```javascript
module.exports = {
  template: {
    lang: 'en',
    favicon: 'https://assets-cdn.github.com/favicon.ico',
    head: {
      meta: [{ name: 'description', content: 'My style guide' }],
      links: [
        { rel: 'stylesheet', href: 'https://example.com/fonts.css' }
      ],
      scripts: [
        { src: 'https://example.com/analytics.js', async: true }
      ],
      raw: '<style>body { margin: 0 }</style>'
    },
    body: {
      raw: '<div id="modal"></div>',
      scripts: [{ src: 'https://example.com/app.js' }]
    },
    // Extra attributes for the bundle’s <script> and <link> tags
    attrs: {
      js: { defer: true },
      css: { media: 'all' }
    },
    trimWhitespace: true
  }
}
```

All fields are optional. `head.meta`, `head.links`, `head.scripts` and `body.scripts` are arrays of attribute objects; `head.raw` and `body.raw` accept a string or an array of strings of raw HTML.

A function that returns an HTML string. It receives `publicPath` (an empty string on the dev server, whose asset URLs are root-absolute, and `'./'` in static builds), `lang`, `title`, `container` (the [mountPointId](#mountpointid)), `js` and `css` (arrays of asset URLs):

```javascript
module.exports = {
  template({ publicPath, lang, title, container, js, css }) {
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
${css
  .map(file => `<link rel="stylesheet" href="${publicPath}${file}">`)
  .join('\n')}
</head>
<body>
<div id="${container}"></div>
${js
  .map(
    file =>
      `<script type="module" src="${publicPath}${file}"></script>`
  )
  .join('\n')}
</body>
</html>`
  }
}
```

> **Caution:** Scripts must be loaded with `type="module"`: the bundle is an ES module.

## `theme`

Type: `Object` or `String`, optional

Customize style guide UI fonts, colors, etc. using a theme object or the path to a file exporting such object.

The path is relative to the config file or absolute. The file is bundled for the browser and must be an ES module (`export default {…}`).

See examples in the [cookbook](Cookbook.md#how-to-change-styles-of-a-style-guide).

> **Info:** See available [theme variables](../src/client/styles/theme.ts).

> **Info:** Styles use [JSS](https://github.com/cssinjs/jss/blob/master/docs/jss-syntax.md) with these plugins: [jss-plugin-isolate](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-isolate), [jss-plugin-nested](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-nested), [jss-plugin-camel-case](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-camel-case), [jss-plugin-default-unit](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-default-unit), [jss-plugin-compose](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-compose) and [jss-plugin-global](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-global).

> **Tip:** Use [React Developer Tools](https://github.com/facebook/react) to find component and style names. For example a component `<LogoRenderer><h1 className="rsg--logo-53">` corresponds to an example above.

## `title`

Type: `String`, default: `<app name from package.json> Style Guide`

Style guide title.

## `tocMode`

Type: `String` default: `expand`

Defines if the table of contents sections will behave like an accordion:

- `collapse`: All sections are collapsed by default
- `expand`: Sections cannot be collapsed in the Table Of Contents

Collapse the sections created in the sidebar to reduce the height of the sidebar. This can be useful in large codebases with lots of components to avoid having to scroll too far.

## `updateDocs`

Type: `Function`, optional

Function that modifies props, methods, and metadata after parsing a source file. For example, load a component version from a JSON file:

```javascript
module.exports = {
  updateDocs(docs, file) {
    if (docs.doclets.version) {
      const versionFilePath = path.resolve(
        path.dirname(file),
        docs.doclets.version
      )
      const version = require(versionFilePath).version

      docs.doclets.version = version
      docs.tags.version[0].description = version
    }

    return docs
  }
}
```

With this component JSDoc comment block:

```javascript
/**
 * Component is described here.
 *
 * @version ./package.json
 */
export default class Button extends React.Component {
  // ...
}
export default
```

## `updateExample`

Type: `Function`, optional

Function that modifies code example (Markdown fenced code block). For example, you can use it to load examples from files:

```javascript
module.exports = {
  updateExample(props, exampleFilePath) {
    const { settings, lang } = props
    if (typeof settings.file === 'string') {
      const filepath = path.resolve(
        path.dirname(exampleFilePath),
        settings.file
      )
      const { file, ...restSettings } = settings
      return {
        content: fs.readFileSync(filepath, 'utf8'),
        settings: restSettings,
        lang
      }
    }
    return props
  }
}
```

Use it like this in your Markdown files:

    ```js { "file": "./some/file.js" }
    ```

You can also use this function to dynamically update some of your fenced code blocks that you do not want to be interpreted as React components by using the [static modifier](Documenting.md#usage-examples-and-readme-files).

```javascript
module.exports = {
  updateExample(props) {
    const { settings, lang } = props
    if (lang === 'javascript' || lang === 'js' || lang === 'jsx') {
      settings.static = true
    }
    return props
  }
}
```

## `usageMode`

Type: `String`, default: `collapse`

Defines the initial state of the props and methods tab:

- `collapse`: collapses the tab by default.
- `hide`: hide the tab and it can´t be toggled in the UI.
- `expand`: expand the tab by default.

## `verbose`

Type: `Boolean`, default: `false`

Print debug information. Same as `--verbose` command line switch.

## `version`

Type: `String`, optional

Style guide version, displayed under the title in the sidebar.

## `viteConfig`

Type: `Object` or `Function`, optional

Custom [Vite config](https://vite.dev/config/) options: plugins, aliases, CSS preprocessor options, `define`s, etc. required for your project. Vite compiles JSX, TypeScript, CSS, CSS modules, JSON and static assets out of the box, so most projects don’t need this option at all.

Can be an object:

```javascript
module.exports = {
  viteConfig: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables" as *;'
        }
      }
    }
  }
}
```

Or a function:

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

> **Caution:** This option disables config load from `vite.config.js`, load your config [manually](Vite.md#reusing-your-projects-vite-config).

> **Danger:** These options will be ignored because Styleguidist controls them: `root`, `base`, `appType`, `configFile`, `build.outDir`, `build.emptyOutDir`, `build.lib`, `build.ssr`, `build.manifest`, `build.ssrManifest`, `server.host`, `server.port`, `server.strictPort`, `server.middlewareMode`, and — under both `build.rolldownOptions` and `build.rollupOptions` — `input`, `external`, `output` and `preserveEntrySignatures`. Styleguidist owns the entry, the output location and the dev server address, and your library-build settings (like `external: ['react']`) would make the style guide bundle unloadable. Run with `--verbose` to see which options were dropped. (The list is `IGNORED_OPTIONS` in [src/vite/mergeViteConfig.ts](../src/vite/mergeViteConfig.ts).)

> **Note:** Styleguidist adds [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) unless your `plugins` already include it.

> **Tip:** Run style guide in verbose mode to see the actual Vite config used by Styleguidist: `npx styleguidist server --verbose`.

See [Configuring Vite](Vite.md) for examples.

## Removed options

`webpackConfig`, `dangerouslyUpdateWebpackConfig` and `updateWebpackConfig` were removed together with webpack, Styleguidist throws an error when it finds them in a config. See the [migration guide](Migration.md).
