# Configuration

By default, Styleguidist will look for `styleguide.config.js` file in your project’s root folder. You can change the location of the config file using `--config` [CLI](CLI.md) option.

The config file may be a CommonJS module (`module.exports = {…}`) or an ES module (`export default {…}`), named `styleguide.config.js`, `styleguide.config.mjs` or `styleguide.config.cjs`.

> **Caution:** Config files are loaded synchronously, top-level `await` isn’t supported in them.

## `assetsDir`

Type: `String` or `Array`, optional

Your application static assets folder will be accessible as `/` in the style guide dev server, and its files are copied into the [styleguideDir](#styleguidedir) folder by `styleguidist build`.

## `colorScheme`

Type: `String`, default: `system`

Colour scheme of the style guide UI (not of your components):

- `system`: follow the visitor’s operating system (`prefers-color-scheme`) and show a system / light / dark toggle in the sidebar header. The visitor’s choice is remembered in `localStorage`.
- `light` or `dark`: always use that scheme and hide the toggle.

```javascript
module.exports = {
  colorScheme: 'dark'
}
```

The scheme is applied to the `<html>` element as the `data-rsg-theme` attribute (`light`, `dark`, or absent for `system`) by an inline script in the generated page, before the first paint, so there is no flash of the wrong scheme. See [dark mode](Cookbook.md#how-to-customize-dark-mode) in the cookbook for how the colours work, and [theme](#theme) for the rule about overridden colours.

> **Note:** A custom [template](#template) function receives `colorScheme` in its context and has to include the `<meta name="color-scheme">` tag and the inline script itself; `colorSchemeScript(colorScheme)` from `vite-styleguidist/lib/vite/html.js` returns the script.

> **Note:** The inline script needs `'unsafe-inline'` in a Content-Security-Policy `script-src`, or a nonce that a custom template adds to the `<script>` tag. When the policy blocks it the page still works: it renders in the light scheme first and switches to the stored or forced scheme once the bundle runs.

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

Type: `String`, `Function` or `Array`, default: `src/@(components|Components)/**/*.{js,jsx,ts,tsx}` (see [Locating components](Components.md) for the Windows fallback)

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

Type: `Function`, default: finds `Readme.md`, `Readme.mdx`, `ComponentName.md` or `ComponentName.mdx` in the component folder

Function that returns examples file path for a given component path. The extension of the path you return selects the pipeline: `.md` is Markdown, `.mdx` is [MDX](Documenting.md#mdx).

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

## `machineReadable`

Type: `Boolean`, default: `true`

Emit a machine-readable copy of the style guide next to `index.html`, for AI assistants, editor integrations and scripts:

- `docs.json`: every section and component with its description, props (name, type, required, default value, description, JSDoc tags), public methods and usage examples, as JSON;
- `llms.txt`: an index in the [llms.txt](https://llmstxt.org/) format, one line per component with a link to it in the style guide;
- `llms-full.txt`: the whole style guide as one Markdown document.

The files are generated from the same sources as the style guide itself (react-docgen output, Markdown examples), in the order of the sidebar. `styleguidist build` writes them into [styleguideDir](#styleguidedir); the dev server serves them at `/docs.json`, `/llms.txt` and `/llms-full.txt`, regenerated on every request. Set the option to `false` to skip them. `docs.json` carries a `generatedAt` timestamp; set the `SOURCE_DATE_EPOCH` environment variable (seconds since the Unix epoch) to pin it for reproducible builds.

```javascript
module.exports = {
  machineReadable: false
}
```

> **Caution:** The files are plain, unprotected downloads: when the style guide is deployed, everything in them (descriptions, examples, file paths relative to the project) is public, exactly like the style guide page is. Turn the option off if the style guide is served from somewhere you don’t want to expose that way.

See [How do I make my style guide readable by AI tools?](Cookbook.md#how-do-i-make-my-style-guide-readable-by-ai-tools) for the details of each file.

## `mdx`

Type: `Object`, optional

Options for the [MDX](Documenting.md#mdx) pipeline, passed to `@mdx-js/mdx`’s `compile()`:

- `remarkPlugins`: remark plugins, default `[remarkGfm]`;
- `rehypePlugins`: rehype plugins, default none;
- `recmaPlugins`: recma plugins, default none.

Each is a [unified plugin list](https://github.com/unifiedjs/unified#plugin): a plugin, or a `[plugin, options]` pair, per entry. Setting `remarkPlugins` **replaces** the default, so keep [remark-gfm](https://github.com/remarkjs/remark-gfm) in the list if you still want GFM tables, task lists and strikethrough:

```javascript
// styleguide.config.mjs — remark plugins are ES modules
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'

export default {
  mdx: {
    remarkPlugins: [remarkGfm, remarkFrontmatter]
  }
}
```

The option has no effect on `.md` files, which are parsed by the Markdown pipeline and are not affected by MDX plugins.

## `mdxComponents`

Type: `Object`, optional

Extra components available to every [MDX](Documenting.md#mdx) page, as a map of name to the module that default-exports the component. They are merged over the default element map, so an entry can either add a shortcode that any `.mdx` file may use without importing it, or replace how an HTML element of the prose is rendered:

```javascript
module.exports = {
  mdxComponents: {
    // Usable as <Callout kind="info"> in any .mdx file, no import needed
    Callout: 'styleguide/components/Callout',
    // Every table of every MDX page is rendered by this component
    table: 'styleguide/components/Table'
  }
}
```

Each value is a module path and is resolved like a [styles](#styles) or [theme](#theme) path: relative to the style guide config file, so the entries above are `styleguide/components/Callout` and `styleguide/components/Table` next to the config. An absolute path (`path.join(__dirname, 'styleguide/components/Callout')`) works too, and the extension may be omitted — Vite resolves the rest like any import. The module is imported into the style guide’s browser bundle and must default-export the component.

Lowercase keys are HTML element names; capitalised keys are components an `.mdx` file can use as JSX elements. Without this option a page imports what it needs itself, which is the usual way — reach for `mdxComponents` when the same component belongs on many pages.

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

## `pageNav`

Type: `Boolean`, default: `false`

Add an “on this page” list of the current page’s own headings.

```javascript
module.exports = {
  pagePerSection: true,
  pageNav: true
}
```

The list is built from the headings the page actually renders — every `h2` and `h3` that has an id, in document order — so it works the same for Markdown and MDX documentation and for a custom `Heading` component. A page with fewer than two of them gets no list at all.

Where it appears depends on the width of the window: from 1480 px up it is a rail beside the content column, which sticks below the header as you scroll and highlights the heading you are reading; below that the same list is a collapsible block above the content, closed until you open it. The content column keeps its width and its position either way — the space the rail takes is reserved on every page of the style guide, so the text does not move sideways when you open a page that has no list. The breakpoint is the `mq.large` [theme](#theme) key, and the width of the rail is `pageNavWidth`.

**It only appears on pages that show a single component or section**: the [pagePerSection](#pagepersection) pages, the `#/Section` routes and the isolated `#!/Component` view. On the default all-in-one page, where every component of the style guide is on one page, the sidebar is the page navigation — it already follows the scroll, see [scrollSync](#scrollsync) — and a list of every heading of every component would only repeat it.

If you replace `StyleGuideRenderer` through [styleguideComponents](#styleguidecomponents), render the `pageNav` prop it receives where you want the list; without that the option does nothing for your style guide. The list itself is `PageNav` / `PageNavRenderer` and can be replaced the same way, see [the Cookbook](Cookbook.md#how-to-change-the-on-this-page-navigation).

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

Show a link to your repository: in the sidebar footer, next to the colour-scheme toggle, or as a small pill in the top-right corner when the style guide has no sidebar (`showSidebar: false`, isolated views). The default text is “GitHub”.

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

## `scrollSync`

Type: `String` or `false`, default: `selection`

Keep the sidebar (and optionally the URL) on the section the reader has scrolled to, on a style guide that shows everything on one page:

- `selection`: the highlighted sidebar entry follows the scroll; the URL is never touched.
- `hash`: the same, and the fragment of the address is rewritten to the section on screen with `history.replaceState`, so a copied link points at what the reader was looking at.
- `false`: the selection only changes when the reader clicks an entry or opens a link, which is what Styleguidist did before 1.0.

```javascript
module.exports = {
  scrollSync: 'hash'
}
```

Only the default one-page layout has anything to follow: with [pagePerSection](#pagepersection) the sidebar links are routes rather than anchors, and an isolated view has no sidebar, so the option has no effect in either. Nothing is ever pushed onto the history stack and no `hashchange` event is fired, so the back button and any code that listens for navigation behave exactly as before; code that _polls_ `location.hash` will see it change while the reader scrolls in `hash` mode.

## `sections`

Type: `Array`, optional

Allows components to be grouped into sections with a title and overview content. Sections can also be content only, with no associated components (for example, a textual introduction). Sections can be nested. A section’s `content` may be a `.md` or an `.mdx` file, see [MDX](Documenting.md#mdx).

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

**Note**: these components are not guaranteed to be safe from breaking changes in Styleguidist updates, except `Editor`, whose props are a stable contract (see below).

### `Editor`

The code editor shown under an example when you click “View Code” is [CodeMirror 6](https://codemirror.net/) with JavaScript, JSX and TypeScript highlighting, undo history, bracket matching and closing, basic autocompletion and search (Ctrl/Cmd+F inside the editor). It has no line numbers. Its chunk is loaded on demand: a style guide page fetches CodeMirror only the first time an editor opens, and shows the code as plain text meanwhile.

Keyboard: Tab indents the current line, Shift+Tab outdents. To move the focus out of the editor with the keyboard, press Escape and then Tab (or Shift+Tab): after Escape, Tab moves the focus like anywhere else on the page for two seconds. For assistive technology the editor is labelled with the component’s name and the example’s index, “Code editor for Button example 2” (a custom editor receives them as `exampleName` and `exampleIndex`, see the table below).

Colors follow the [`theme`](#theme) option: the same `theme.color.code*` keys that style static code blocks style the editor, see [How to change syntax highlighting colors?](Cookbook.md#how-to-change-syntax-highlighting-colors) in the cookbook.

You can replace the editor with your own component:

```javascript
// styleguide.config.js
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  styleguideComponents: {
    Editor: path.join(dirname, 'src/styleguide/Editor')
  }
}
```

The CommonJS form (`require`, `__dirname`, `module.exports`) works in a project without `"type": "module"`, and in a `styleguide.config.cjs` file in any project.

When you do, CodeMirror is not part of your bundle at all. The component receives these props (the `EditorProps` type exported from `vite-styleguidist/lib/typings/index.d.ts`), and this list is a public contract: keys are only ever added, never removed or renamed:

| Prop | Type | Description |
| --- | --- | --- |
| `code` | `string` | Current source of the example. Controlled: Styleguidist owns it and passes it back after `onChange` (debounced) and when the Markdown file changes on hot reload. |
| `onChange` | `(code: string) => void` | Call it with the whole source after every change. Calls are debounced by the [`previewDelay`](#previewdelay) option (500 ms by default) before the preview re-renders. |
| `evalInContext` | `(code: string) => () => any`, optional | Compiles and runs example code the way the preview does. The built-in editor doesn’t use it. |
| `name` | `string`, optional | Id of the slot fill, `rsg-code-editor` for the built-in code tab. Not the example name. |
| `active` | `boolean`, optional | Whether the tab is the active one; always `true` when the editor is rendered, since only the active tab is. |
| `onClick` | `function`, optional | Tab click handler of the slot (its id is bound already). Not needed by an editor. |
| `exampleName` | `string`, optional | Name of the component or section the example belongs to. The built-in editor uses it, with `exampleIndex`, for its accessible label. |
| `exampleIndex` | `number`, optional | Index of the example in its Markdown file, the same number the isolated example URL uses. |
| `lang` | `string`, optional | Fence language of the example (`jsx`, `tsx`, …), absent for a bare fence. The built-in editor shows it as the badge in the corner of the code area, and labels a bare fence `JSX`, since every playground example is compiled with the JSX and TypeScript transforms. |

See [How to replace the code editor?](Cookbook.md#how-to-replace-the-code-editor) in the cookbook for a minimal implementation.

## `styleguideDir`

Type: `String`, default: `styleguide`

Folder for static HTML style guide generated with `styleguidist build` command. The page is written to `index.html` and the bundle to the `build` subfolder, which is the only thing cleaned before a build.

## `styles`

Type: `Object`, `String` or `Function`, optional

Customize styles of any Styleguidist’s component using an object, a function returning said object or a file path to a file exporting said styles.

See examples in the [cookbook](Cookbook.md#how-to-change-styles-of-a-style-guide).

> **Tip:** Using a function allows access to theme variables like in the example below. See available [theme variables](../src/client/styles/theme.ts) and the [theme](#theme) option for what the colour tokens contain. The returned object follows the same format as when configured as a literal.

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

**Note:** Component names and the keys inside them (`Logo`, `logo`) are part of the public contract: keys are only ever added, never renamed, so a `styles` config keeps working across minor releases. The generated class names look like `rsg--logo-1234567890`; the number is derived from the component and its keys, it is not something to target.

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

> **Info:** See available [theme variables](../src/client/styles/theme.ts). The light and dark values of the colour tokens live in [colorSchemes.ts](../src/client/styles/colorSchemes.ts).

### Colour tokens and dark mode

Every `theme.color.*` token is a CSS custom property with the light value as fallback, `var(--rsg-color-<name>, <light value>)`, where `<name>` is the token name in kebab-case: `color.baseBackground` is `--rsg-color-base-background`. The style guide defines the light values on `:root`, the dark values on `[data-rsg-theme="dark"]` and, for the `system` [colorScheme](#colorscheme), inside `@media (prefers-color-scheme: dark)`. Its own definitions are wrapped in `:where()`, which has no specificity, so a rule of yours with the same selectors wins wherever it is loaded, even though the style guide attaches its variables last.

This has one consequence for the `theme` option: **overriding a colour token opts that token out of dark mode**. `theme: { color: { link: 'firebrick' } }` replaces the whole `var()` expression with a literal that no longer switches, so you own both schemes for that token. To change a colour in both schemes, override the custom property instead of the token, for example with [template](#template) `head.raw` or a stylesheet listed in [require](#require):

```css
:root {
  --rsg-color-link: firebrick;
}
[data-rsg-theme='dark'] {
  --rsg-color-link: salmon;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-rsg-theme='light']) {
    --rsg-color-link: salmon;
  }
}
```

Or set [colorScheme](#colorscheme) to `light` if your theme only has one scheme. Numeric tokens (`space`, `fontSize`, `borderRadius`, `maxWidth`, `sidebarWidth`) stay numbers and are the same in both schemes.

Besides the text and code colours there are two surface tokens added with the 1.0 design, both with a light and a dark value: `selectedBackground` (the selected sidebar item and the active tab; `base` and `link` sit on it) and `errorBackground` (the playground error panel; `error` is the text on it). Every text colour clears WCAG AA (4.5:1) on the surface it is used on in both schemes, and a unit test keeps it that way, so if you override one side of a pair, check the other.

Tokens that components used to hard-code and that you can now override: `lineHeight.base` (1.55), `lineHeight.heading` (1.2) and `lineHeight.code` (1.6, the editor and static code blocks); `fontWeight.normal` (400) and `fontWeight.bold` (600; numbers, but the `normal` / `bold` keywords work too); `transition.fast` (`150ms ease-in`) and `transition.slow` (`750ms ease-out`, duration and easing only); `shadow.tooltip` and `shadow.ribbon` (complete `box-shadow` / `text-shadow` values); `mq.small` (`@media (max-width: 600px)`) and `mq.medium` (`@media (max-width: 1024px)`). Token names are only ever added, never renamed.

> **Info:** Styles use [JSS](https://github.com/cssinjs/jss/blob/master/docs/jss-syntax.md) with these plugins: [jss-plugin-isolate](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-isolate), [jss-plugin-nested](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-nested), [jss-plugin-camel-case](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-camel-case), [jss-plugin-default-unit](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-default-unit), [jss-plugin-compose](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-compose) and [jss-plugin-global](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-global).

> **Tip:** Use [React Developer Tools](https://github.com/facebook/react) to find component and style names. For example a component `<LogoRenderer><h1 className="rsg--logo-1234567890">` corresponds to the `Logo` / `logo` example above; the number is derived from the component and is the same for all its classes.

## `title`

Type: `String`, default: `<app name from package.json> Style Guide`

Style guide title.

## `tocMode`

Type: `String` default: `expand`

Defines if the table of contents sections will behave like an accordion:

- `collapse`: All sections are collapsed by default
- `expand`: Sections cannot be collapsed in the Table Of Contents

Collapse the sections created in the sidebar to reduce the height of the sidebar. This can be useful in large codebases with lots of components to avoid having to scroll too far.

With `collapse`, a section whose contents are hidden is highlighted itself while you are reading something inside it, so the sidebar still says where you are — see [scrollSync](#scrollsync).

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

Function that modifies code example (a fenced code block of a `.md` or `.mdx` file — it runs for both, before the block is classified as a playground or as static code). For example, you can use it to load examples from files:

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
