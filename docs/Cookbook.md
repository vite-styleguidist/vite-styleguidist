# Cookbook

## How to use `ref`s in examples?

Use `ref` prop as a function and assign a reference to a local variable:

```jsx
const [value, setValue] = React.useState('')
let textarea
;<div>
  <Button onClick={() => textarea.insertAtCursor('Pizza')}>
    Insert
  </Button>
  <Textarea
    value={value}
    onChange={e => setValue(e.target.value)}
    ref={ref => (textarea = ref)}
  />
</div>
```

## How to exclude some components from style guide?

Styleguidist will ignore tests (`__tests__` folder and filenames containing `.test.js` or `.spec.js`) by default.

Use [ignore](Configuration.md#ignore) option to customize this behavior:

```javascript
module.exports = {
  ignore: ['**/*.spec.js', '**/components/Button.js']
}
```

> **Caution:** You should pass glob patterns, for example, use `**/components/Button.js` instead of `components/Button.js`.

## How to hide some components in style guide but make them available in examples?

Enable [skipComponentsWithoutExample](Configuration.md#skipcomponentswithoutexample) option and do not add an example file (`Readme.md` by default) to components you want to ignore.

Import these components in your examples:

````jsx
// ```jsx inside Markdown
import Button from '../common/Button'
;<Button>Push Me Tender</Button>
````

Or, to make these components available for all examples:

```jsx
// styleguide.config.js
module.exports = {
  require: [path.resolve(__dirname, 'styleguide/setup.js')]
}

// styleguide/setup.js
import Button from './src/components/common/Button'
global.Button = Button
```

The `Button` component will be available in every example without a need to `import` it.

## How to render React components that aren’t part of the style guide?

Import these components in your examples:

````jsx
// ```jsx or ```jsx noeditor inside Markdown
import ColorPalette from './components/ColorPalette'
;<ColorPalette />
````

## How to dynamically load other components in an example?

Although examples don’t have direct access to Vite’s [import.meta.glob](https://vite.dev/guide/features#glob-import) feature, you _can_ use it in a separate helper file which you import in your example code. If you wanted to create an example to load and show all your icon components, you could do this:

```js
// load-icons.js
const modules = import.meta.glob('./icons/**/*.js', { eager: true })
const icons = Object.keys(modules).reduce((icons, file) => {
  const Icon = modules[file].default
  const label = file.slice(8, -3) // strip './icons/' and '.js'
  icons[label] = Icon
  return icons
}, {})

export default icons
```

````jsx
// ```jsx or ```jsx noeditor inside Markdown
import icons from './load-icons'
const iconElements = Object.keys(icons).map(iconName => {
  const Icon = icons[iconName]
  return (
    <span key={iconName}>
      {iconName}: {<Icon />}
    </span>
  )
})
<div>{iconElements}</div>
````

## How to display the source code of any file?

First, code examples can receive [props and settings](Documenting.md#usage-examples-and-readme-files):

    ```js { "file": "../mySourceCode.js" }
    ```

The above example adds a setting called `file` with the **relative path** to the file we want to display as value.

Second, use the [updateExample](Configuration.md#updateexample) config option, to detect the setting and change the content of a fenced code block:

```javascript
module.exports = {
  updateExample(props, exampleFilePath) {
    // props.settings are passed by any fenced code block, in this case
    const { settings, lang } = props
    // "../mySourceCode.js"
    if (typeof settings.file === 'string') {
      // "absolute path to mySourceCode.js"
      const filepath = path.resolve(
        path.dirname(exampleFilePath),
        settings.file
      )
      // displays the block as static code
      settings.static = true
      // no longer needed
      delete settings.file
      return {
        content: fs.readFileSync(filepath, 'utf8'),
        settings,
        lang
      }
    }
    return props
  }
}
```

## How to set global styles for user components?

Using the [jss-global](https://github.com/cssinjs/jss-global) API you can set global styles in your config:

```javascript
module.exports = {
  components: 'src/components/**/[A-Z]*.js',
  styles: {
    StyleGuide: {
      '@global body': {
        fontFamily: 'Helvetica'
      }
    }
  }
}
```

Above, we have set `font-family: 'Helvetica';` on the body.

> **Tip:** This does not set styles on the style guide UI, for that read [How to change styles of a style guide](#how-to-change-styles-of-a-style-guide).

## How to add custom JavaScript and CSS or polyfills?

In your style guide config:

```javascript
const path = require('path')
module.exports = {
  require: [
    'core-js/stable',
    path.join(__dirname, 'path/to/script.js'),
    path.join(__dirname, 'path/to/styles.css')
  ]
}
```

CSS, Sass and other files Vite understands don’t need any extra configuration.

## How to use Styleguidist with Preact?

You need to alias `react` and `react-dom` to `preact/compat`:

```javascript
module.exports = {
  viteConfig: {
    resolve: {
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat'
      }
    }
  }
}
```

The aliases also cover `react-dom/client` and `react/jsx-runtime`, which resolve to `preact/compat/client` and `preact/compat/jsx-runtime`. Keep the plain `react-dom` alias too: when the project’s `react-dom` is 16 or 17 (or absent), the style guide is mounted through `react-dom`’s `render`, which `preact/compat` provides as well.

See the [Preact example style guide](../examples/preact).

## How to change styles of a style guide?

There are two config options to change your style guide UI: [theme](Configuration.md#theme) and [styles](Configuration.md#styles).

Use [theme](Configuration.md#theme) to change fonts, colors, etc.

Use [styles](Configuration.md#styles) to tweak the style of any particular Styleguidist component.

As an example:

```javascript
module.exports = {
  theme: {
    color: {
      link: 'firebrick',
      linkHover: 'salmon'
    },
    fontFamily: {
      base: '"Comic Sans MS", "Comic Sans", cursive'
    }
  },
  styles: {
    Logo: {
      // We're changing the LogoRenderer component
      logo: {
        // We're changing the rsg--logo-XX class name inside the component
        animation: '$blink ease-in-out 300ms infinite'
      },
      '@keyframes blink': {
        to: { opacity: 0 }
      }
    }
  }
}
```

> **Info:** See available [theme variables](../src/client/styles/theme.ts). Colour tokens are CSS custom properties that switch with [dark mode](#how-to-customize-dark-mode); overriding one through `theme` gives you a fixed colour in both schemes.

> **Info:** Styles use [JSS](https://github.com/cssinjs/jss/blob/master/docs/jss-syntax.md) with these plugins: [jss-isolate](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-isolate), [jss-nested](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-nested), [jss-camel-case](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-camel-case), [jss-default-unit](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-default-unit), [jss-compose](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-compose) and [jss-global](https://github.com/cssinjs/jss/tree/master/packages/jss-plugin-global).

> **Tip:** Use [React Developer Tools](https://github.com/facebook/react) to find component and style names. For example a component `<LogoRenderer><h1 className="rsg--logo-1234567890">` corresponds to an example above (the number is derived from the component, all its classes share it).

> **Tip:** Use a function instead of an object for [styles](Configuration.md#styles) to access all theme variables in your custom styles.

You can store all styles in a separate file to allow hot module replacement (HMR). Same goes for theme variables.

The same example above would then translate as:

In `styleguide.config.js`, objects are replaced with file paths

```javascript
module.exports = {
  // ...
  styles: './styleguide/styles.js',
  theme: './styleguide/theme.js'
}
```

then in `./styleguide/theme.js`

```javascript
export default {
  color: {
    link: 'firebrick',
    linkHover: 'salmon'
  },
  fontFamily: {
    base: '"Comic Sans MS", "Comic Sans", cursive'
  }
}
```

and in `./styleguide/styles.js`

```javascript
export default {
  Logo: {
    // We're changing the LogoRenderer component
    logo: {
      // We're changing the rsg--logo-XX class name inside the component
      animation: '$blink ease-in-out 300ms infinite'
    },
    '@keyframes blink': {
      to: { opacity: 0 }
    }
  }
}
```

Each modification of `theme.js` or `styles.js` will trigger a hot module replacement, updating the styleguide in the browser.

> **Caution:** These files are bundled for the browser and must be ES modules (`export default`), `module.exports` won’t work.

Check out the [themed example](../examples/themed) to learn more and try it out.

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

## How to customize dark mode?

The style guide UI has a light and a dark scheme. By default ([colorScheme](Configuration.md#colorscheme) `system`) it follows the visitor’s operating system and shows a system / light / dark toggle in the sidebar header; the choice is remembered in `localStorage` and applied before the first paint. Your components are not restyled: they render with their own CSS, inside a frame that is light or dark.

To start every visitor in one scheme and remove the toggle:

```javascript
module.exports = {
  colorScheme: 'dark'
}
```

Colours are CSS custom properties named after the [theme](Configuration.md#theme) tokens (`color.sidebarBackground` is `--rsg-color-sidebar-background`), so a colour that should differ between the schemes is set on `:root` (light), on `[data-rsg-theme="dark"]` (the toggle’s dark choice) and inside the `prefers-color-scheme` media query (the system setting). The easiest place is an inline style in [template](Configuration.md#template):

```javascript
module.exports = {
  template: {
    head: {
      raw: `<style>
  :root { --rsg-color-sidebar-background: #f0f4f8; }
  [data-rsg-theme="dark"] { --rsg-color-sidebar-background: #0b1620; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-rsg-theme="light"]) { --rsg-color-sidebar-background: #0b1620; }
  }
</style>`
    }
  }
}
```

A stylesheet listed in [require](Configuration.md#require) works the same way. Do not set such colours through `theme.color.*`: that replaces the custom property with a literal, and the token stops switching. `theme.color.*` is the right tool when you want one colour in both schemes, or when you set [colorScheme](Configuration.md#colorscheme) to `light` or `dark`.

The toggle is the `ThemeToggle` component: restyle it with `styles: { ThemeToggle: { root: {…}, button: {…}, isActive: {…} } }`, or replace `ThemeToggleRenderer` through [styleguideComponents](Configuration.md#styleguidecomponents) (it receives `value`, one of `system`, `light`, `dark`, and `onChange`). A custom `StyleGuideRenderer` can import it from `vite-styleguidist/lib/client/rsg-components/ThemeToggle/index.js` and place it anywhere.

If you use a [template](Configuration.md#template) function, keep the `<meta name="color-scheme">` tag and the inline script that applies the stored choice, otherwise the page renders light first and switches once the bundle runs:

```javascript
const {
  colorSchemeScript
} = require('vite-styleguidist/lib/vite/html.js')

module.exports = {
  template({ colorScheme, title, container, publicPath, js, css }) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="${
      colorScheme === 'system' ? 'light dark' : colorScheme
    }">
<script>${colorSchemeScript(colorScheme)}</script>
<title>${title}</title>
${css
      .map(file => `<link rel="stylesheet" href="${publicPath}${file}">`)
      .join('')}
</head>
<body><div id="${container}"></div>${js
      .map(
        file => `<script type="module" src="${publicPath}${file}"></script>`
      )
      .join('')}</body>
</html>`
  }
}
```

## How to use CSS animations in your style guide?

As seen in the `@keyframes` animation examples above, the animation property in CSS rules do not directly use the name of their keyframe animations because of internal keyframe scoping.

To use a CSS animation, you have to define its keyframe at the root of the renderer object. The use of `@keyframes` in styling above are good examples of this.

## How to change the layout of a style guide?

You can replace any Styleguidist React component. But in most of the cases you’ll want to replace `*Renderer` components — all HTML is rendered by these components. For example `ReactComponentRenderer`, `ComponentsListRenderer`, `PropsRenderer`, etc. — [check the source](../src/client/rsg-components) to see what components are available.

If you replace `StyleGuideRenderer`, know that on small screens the table of contents collapses behind the menu button through `rsg-components/StyleGuide/SidebarContext` (the default renderer provides it); without the provider the navigation is simply always open, and the menu and search buttons of the small-screen header are the default renderer’s.

There’s also a special wrapper component — `Wrapper` — that wraps every example component. By default, it renders `children` as is but you can use it to provide custom logic.

For example, you can replace the `Wrapper` component to wrap any example in the [React Intl’s](https://github.com/yahoo/react-intl) provider component. You can’t wrap the whole style guide because every example is compiled separately in a browser.

```javascript
// styleguide.config.js
const path = require('path')
module.exports = {
  styleguideComponents: {
    Wrapper: path.join(__dirname, 'src/styleguide/Wrapper')
  }
}
```

```jsx
// src/styleguide/Wrapper.js
import React, { Component } from 'react'
import { IntlProvider } from 'react-intl'
export default class Wrapper extends Component {
  render() {
    return (
      <IntlProvider locale="en">{this.props.children}</IntlProvider>
    )
  }
}
```

You can replace the `StyleGuideRenderer` component like this:

```javascript
// styleguide.config.js
const path = require('path')
module.exports = {
  styleguideComponents: {
    StyleGuideRenderer: path.join(
      __dirname,
      'src/styleguide/StyleGuideRenderer'
    )
  }
}
```

```jsx
// src/styleguide/StyleGuideRenderer.js
import React from 'react'
const StyleGuideRenderer = ({
  title,
  version,
  homepageUrl,
  components,
  toc,
  hasSidebar
}) => (
  <div className="root">
    <h1>{title}</h1>
    {version && <h2>{version}</h2>}
    <main className="wrapper">
      <div className="content">
        {components}
        <footer className="footer">
          <Markdown
            text={`Created with [Vite Styleguidist](${homepageUrl})`}
          />
        </footer>
      </div>
      {hasSidebar && <div className="sidebar">{toc}</div>}
    </main>
  </div>
)
```

We have [an example style guide](../examples/customised) with custom components.

## How to change syntax highlighting colors?

Styleguidist uses [Prism](https://prismjs.com/) to highlight static code blocks (in Markdown and in the “Usage” tab) and [CodeMirror](https://codemirror.net/) in the live code editor. Both are colored by the same palette, the `theme.color.code*` keys: the editor emits Prism’s token class names, so a change to these colors applies to static blocks and to the editor alike. You can change the colors using the [theme](Configuration.md#theme) config option (these values then apply in both light and [dark mode](#how-to-customize-dark-mode); override the `--rsg-color-code-*` custom properties instead to give each scheme its own colors):

```javascript
// styleguide.config.js
module.exports = {
  theme: {
    color: {
      codeComment: '#6d6d6d',
      codePunctuation: '#999',
      codeProperty: '#905',
      codeDeleted: '#905',
      codeString: '#690',
      codeInserted: '#690',
      codeOperator: '#9a6e3a',
      codeKeyword: '#1673b1',
      codeFunction: '#DD4A68',
      codeVariable: '#e90'
    }
  }
}
```

`codeBase` is the color of plain text, `codeBackground` the background of code blocks and the editor.

## How to replace the code editor?

The live editor under each example is [CodeMirror 6](https://codemirror.net/) by default (see [`styleguideComponents.Editor`](Configuration.md#editor) for what it supports and the exact props). If you want something else — a plain text area, Monaco, an editor from your own design system — point `styleguideComponents.Editor` to your component. The default editor is loaded on demand from the `rsg-components/Editor` module, so when you replace it CodeMirror isn’t bundled at all.

The component gets the current `code` and must call `onChange` with the whole source after every change; Styleguidist debounces the calls by [`previewDelay`](Configuration.md#previewdelay) and re-renders the preview. Anything else the component receives (`evalInContext`, `name`, `active`, `onClick`, `exampleName`, `exampleIndex`, `lang`) can be ignored.

```javascript
// styleguide.config.js
const path = require('path')
module.exports = {
  styleguideComponents: {
    Editor: path.join(__dirname, 'styleguide/components/Editor')
  }
}
```

```jsx
// styleguide/components/Editor.js
import React from 'react'

// A plain text area: no highlighting, but nothing to load either
export default function Editor({ code, onChange }) {
  return (
    <textarea
      aria-label="Code editor"
      value={code}
      onChange={event => onChange(event.target.value)}
      rows={code.split('\n').length}
      spellCheck={false}
      style={{
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'Consolas, "Liberation Mono", Menlo, monospace'
      }}
    />
  )
}
```

The `code` prop changes from outside when you edit the Markdown file while the dev server runs: a controlled element like the text area above follows it for free. Editors that keep their own document (CodeMirror, Monaco) should compare the new prop with their content and replace the text only when it differs, so the cursor survives Styleguidist echoing the editor’s own value back.

There is no example project for this recipe: the [customised example](../examples/customised) shows how `styleguideComponents` overrides work in general.

## How to change style guide dev server logs output?

You can change the amount of logs the Vite dev server prints with the `logLevel` option of the Vite config (`'info'`, `'warn'`, `'error'` or `'silent'`):

```javascript
module.exports = {
  viteConfig(env) {
    if (env === 'development') {
      return {
        logLevel: 'warn'
      }
    }
    return {}
  }
}
```

Styleguidist’s own messages are controlled by the [logger](Configuration.md#logger) option.

## How to debug my components and examples?

1. Open your browser’s developer tools
2. Write `debugger;` statement wherever you want: in a component source, a Markdown example or even in an editor in a browser.

![](https://d3vv6lp55qjaqc.cloudfront.net/items/3i3E3j2h3t1315141k0o/debugging.png)

## How to debug the exceptions thrown from my components?

1. Put `debugger;` statement at the beginning of your code.
2. Press the ![Debugger](https://d3vv6lp55qjaqc.cloudfront.net/items/2h2q3N123N3G3R252o41/debugger.png) button in your browser’s developer tools.
3. Press the ![Continue](https://d3vv6lp55qjaqc.cloudfront.net/items/3b3c1P3g3O1h3q111I2l/continue.png) button and the debugger will stop execution at the next exception.

## How to use the production or development build of React?

By default, Styleguidist uses the development build of React for the dev server and the [production build](https://react.dev/learn/build-a-react-app-from-scratch#deploying-to-production) for static builds (`styleguidist build`). In some cases you might need the development build in a static style guide too, for example when your code reads another component’s `propTypes` at runtime: React strips `propTypes` from its production build, so code like this fails there with `Cannot read properties of undefined (reading 'isRequired')`:

```js
import React from 'react'
import Input from './Input'

const CustomInput = ({ value }) => <Input value={value} />

CustomInput.propTypes = {
  // Will fail in a static build: Input.propTypes is undefined in production
  value: Input.propTypes.value.isRequired
}
```

Styleguidist only sets `NODE_ENV` when it isn’t set already, so you can ask for the development build by setting the variable yourself in your npm script:

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=development styleguidist build"
  }
}
```

**Note:** The script above uses [cross-env](https://github.com/kentcdodds/cross-env) to make sure the environment variable is properly set on all platforms. Run `npm i -D cross-env` to add it.

## How to use Vagrant with Styleguidist?

File system events don’t always reach the guest machine, enable polling in your Vite config (see Vite’s [server.watch](https://vite.dev/config/server-options#server-watch) option):

```javascript
module.exports = {
  viteConfig: {
    server: {
      watch: {
        usePolling: true
      }
    }
  }
}
```

## How to add a favicon?

Two options:

1. Put a `favicon.ico` file into the root folder of your site.

2. Use [template](Configuration.md#template) option:

```javascript
module.exports = {
  template: {
    favicon: 'https://assets-cdn.github.com/favicon.ico'
  }
}
```

## How to add external JavaScript and CSS files?

Use [template](Configuration.md#template) option:

```javascript
module.exports = {
  template: {
    head: {
      scripts: [
        {
          src: 'assets/js/babelHelpers.min.js'
        }
      ],
      links: [
        {
          rel: 'stylesheet',
          href: 'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css'
        }
      ]
    }
  }
}
```

In comparison to [require](Configuration.md#require) option, these scripts and links are loaded by the browser as they are, they aren’t bundled by Vite. It can be useful for side effect-causing scripts, like analytics or polyfill services, that your components need to function properly.

## How to add fonts from Google Fonts?

Use [template](Configuration.md#template) and [theme](Configuration.md#theme) options:

```javascript
module.exports = {
  template: {
    head: {
      links: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css?family=Roboto'
        }
      ]
    }
  },
  theme: {
    fontFamily: {
      base: '"Roboto", sans-serif'
    }
  }
}
```

## How to reuse project’s Vite config?

Styleguidist uses the `vite.config.js` next to your style guide config automatically, see [configuring Vite](Vite.md#reusing-your-projects-vite-config) for other cases.

## How to use Styleguidist with Redux, Relay or Styled Components?

See [working with third-party libraries](Thirdparties.md).

## How to use React-axe to test accessibility of components?

1. Install [@axe-core/react](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/react) (formerly react-axe).

2. Load it with the style guide and run checks for each example:

```jsx
// styleguide.config.js
module.exports = {
  require: [path.resolve(__dirname, 'styleguide/setup.js')]
}

// styleguide/setup.js
import React from 'react'
import ReactDOM from 'react-dom'
const context = {
  include: [['[data-preview]']]
}
if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000, undefined, context)
  })
}
```

> **Info:** `import.meta.env.DEV` is `true` in the dev server and `false` in `styleguidist build`, so the check (and the library) never ends up in the static style guide.

3. [Start your style guide server](GettingStarted.md#3-start-your-style-guide) and open your browser’s developer tools console.

If you are using Jest for testing you can also use [jest-axe](https://github.com/nickcolley/jest-axe).

## How to change the names of components displayed in Styleguidist UI?

You might want to change your components’ names to be displayed differently, for example, for stylistic purposes or to give them more descriptive names in your style guide.

This can be done by adding [@visibleName](Documenting.md#defining-custom-component-names) tag to your component documentation.

In case you want to change components’ names in bulk, for example, based on their current name, you can use [updateDocs](Configuration.md#updatedocs) config option:

```javascript
module.exports = {
  updateDocs(docs) {
    if (docs && docs.displayName) {
      docs.visibleName = docs.displayName.toLowerCase()
    }
    return docs
  }
}
```

## How to re-use the types in Styleguidist?

From version 10, Styleguidist is written using TypeScript language.

It allows the maintainers to catch type mismatch before execution and gives them a better developer experience.

It also allows you to write customized style guide components using TypeScript TSX instead of JavaScript JSX.

**NOTE:** Since all files in `src/client/rsg-components` are aliased to `rsg-components` using a Vite alias, you will have to add this alias to your `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // remap rsg-components/anything to its version in vite-styleguidist
      "rsg-components/*": [
        "node_modules/vite-styleguidist/lib/client/rsg-components/*"
      ]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

This way when you write the following component, TypeScript will resolve typings for client components and help you type them properly.

```ts
import Styled from 'rsg-components/Styled'
import Heading from 'rsg-components/Heading'

export default function SectionsRenderer({ children }) {
  return (
    <div>
      {children.length > 0 && (
        <div>
          <Heading level={1}>Example Components</Heading>
          <p>These are the greatest components</p>
        </div>
      )}
      <DefaultSectionsRenderer>{children}</DefaultSectionsRenderer>
    </div>
  )
}
```

## How to test my components?

Styleguidist documents and renders your components; it doesn’t run tests. But the two go together well: the same isolated, well-documented components are the easiest ones to test, and the examples you write in Markdown are a good list of the cases a test suite should cover. This section shows one setup that fits a Vite-era project: [Vitest](https://vitest.dev/) as the test runner and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to render components the way a user sees them. Styleguidist itself is tested this way, see the [developer guide](Development.md#testing).

Install the tools:

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Vitest reads your `vite.config.js` (or a `vitest.config.js`), so it uses the same plugins and aliases as your app and as Styleguidist. Add a `test` section with a browser-like environment and a setup file for the `jest-dom` matchers:

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js']
  }
})
```

```js
// test/setup.js
import '@testing-library/jest-dom/vitest'
```

> **Note:** Test files are excluded from the style guide by default: the [ignore](Configuration.md#ignore) option skips `__tests__` folders and `*.test.*` / `*.spec.*` files, so a `Button.test.jsx` next to `Button.jsx` won’t show up as a component.

### Unit tests

Unit tests check that a component behaves as documented in isolation. Render it, find elements the way a user would (by text, role or label, not by class name), and assert on what they see or what happens when they interact:

```jsx
// src/components/Button/Button.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

test('renders the label', () => {
  render(<Button>Click me</Button>)
  expect(
    screen.getByRole('button', { name: 'Click me' })
  ).toBeInTheDocument()
})

test('calls onClick when clicked', async () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Click me</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).toHaveBeenCalledTimes(1)
})
```

`vi.fn()` is Vitest’s mock function (the equivalent of `jest.fn()`), available globally when `globals: true` is set; otherwise import it from `vitest`. [`@testing-library/user-event`](https://testing-library.com/docs/user-event/intro) is a separate package that simulates real user interactions more faithfully than `fireEvent`.

### Snapshot tests

Snapshot tests capture the rendered markup and fail when it changes, which catches unintended visual regressions cheaply. Use React Testing Library’s `asFragment()` rather than `react-test-renderer`, which is deprecated and doesn’t support React 19:

```jsx
import { render } from '@testing-library/react'
import Button from './Button'

test('matches the snapshot', () => {
  const { asFragment } = render(
    <Button size="large">Click me</Button>
  )
  expect(asFragment()).toMatchSnapshot()
})
```

Run `npx vitest -u` to update snapshots after an intentional change. Keep snapshots small (one component state per snapshot); a snapshot of a whole page fails on every change and gets updated without being read.

### Integration tests

Integration tests exercise several components together, or a component together with something it depends on, like an API. Mock the dependency at the boundary and wait for the asynchronous result:

```jsx
import { render, screen } from '@testing-library/react'
import UserList from './UserList'

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify([
        { id: 1, name: 'Jane Doe' },
        { id: 2, name: 'John Smith' }
      ])
    )
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('fetches and displays the users', async () => {
  render(<UserList />)
  expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
  expect(screen.getByText('John Smith')).toBeInTheDocument()
})
```

`vi.spyOn(globalThis, 'fetch')` works for code that calls `fetch` directly; for a module like `axios` use [`vi.mock()`](https://vitest.dev/api/vi.html#vi-mock) instead. `findByText` waits for the element to appear, so there’s no need for an explicit `waitFor`.

Run the tests with `npx vitest` (watch mode) or `npx vitest run` (once, for CI), and add `"test": "vitest run"` to your `package.json` scripts next to the `styleguide` scripts from [CLI commands](CLI.md#usage).

## How do I make my style guide readable by AI tools?

Every build already is. Next to `index.html`, `styleguidist build` writes three files that describe the style guide without a browser (the [machineReadable](Configuration.md#machinereadable) option, on by default):

| File | What it is | Who reads it |
| --- | --- | --- |
| `llms.txt` | An index in the [llms.txt](https://llmstxt.org/) format: the title, a one-line summary and one link per component, with its first line of description. | AI assistants that look for `/llms.txt` on a site, humans who want a table of contents. |
| `llms-full.txt` | The whole style guide as one Markdown document: every section with its content page, every component with its description, props table, public methods and usage examples as fenced code. | AI assistants and coding agents that need the details, in one request. |
| `docs.json` | The same information as structured JSON: sections, components, props (name, printed type, required, default, description, JSDoc tags), methods (parameters, return value), examples (code, language, modifiers, the prose before them) and the path of every component file relative to the project. | Scripts, editor integrations, anything that wants to query rather than read. |

The files are generated from the same functions that build the style guide: react-docgen output for the props, the Markdown files for the examples, the `sections` config for the structure, in the order of the sidebar. Whatever the style guide shows, they contain; whatever it hides (`@ignore`d props, private methods, components filtered by [skipComponentsWithoutExample](Configuration.md#skipcomponentswithoutexample)), they don’t.

Once the style guide is deployed, the files sit next to it: if the guide lives at `https://example.com/styleguide/`, the files are at

```
https://example.com/styleguide/llms.txt
https://example.com/styleguide/llms-full.txt
https://example.com/styleguide/docs.json
```

Point your assistant at `llms-full.txt` (or `docs.json` for a tool) and it can answer “which props does `Button` take?” or write a usage example from your own documentation instead of guessing. The links inside the files are relative to the style guide, so they work wherever it is hosted.

During development the dev server serves the same three paths (`http://localhost:6060/docs.json`, …), regenerated on every request, so an assistant connected to your local style guide sees your edits immediately.

A typical `llms.txt`:

```markdown
# My Style Guide

> My Style Guide (version 2.4.0): a React component style guide with 12 components in 3 sections, generated by Vite Styleguidist.

## Components

- [Button](index.html#/Components?id=button): The only true button.
- [Placeholder](index.html#/Components?id=placeholder): Image placeholders.

## Full documentation

- [llms-full.txt](llms-full.txt): every component as Markdown, with props tables and examples
- [docs.json](docs.json): the same documentation as JSON (sections, components, props, methods, examples)
```

`docs.json` carries a `schemaVersion` (currently `1`) that changes only when its shape changes incompatibly; new fields may be added without a bump.

> **Caution:** The files are public as soon as the style guide is. Set `machineReadable: false` if the guide is deployed somewhere you don’t want file paths, descriptions and examples to be downloadable as plain text.

An MCP server that exposes the same information to AI coding assistants as tools (search a component, get its props, get an example), backed by `docs.json`, is planned for version 1.1; see the [decision record](decisions/0012-ai-integration.md).

## What’s the difference between Styleguidist and Storybook?

Both tools are good and mature, they have many similarities but also some distinctions that may make you choose one or the other. For me, the biggest distinction is how you describe component variations.

With [Storybook](https://storybook.js.org/) you write _stories_ in JavaScript files:

```js
import React from 'react'
import { storiesOf } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import Button from '../components/Button'

storiesOf('Button', module)
  .add('default', () => (
    <Button onClick={action('clicked')}>Push Me</Button>
  ))
  .add('large size', () => <Button size="large">Push Me</Button>)
```

And with Styleguidist you write _examples_ in Markdown files:

    React button component example:

    ```js
    <Button onClick={() => console.log('clicked')>Push Me</Button>
    ```

    Large size:

    ```js
    <Button size="large">Push Me</Button>
    ```

![Vite Styleguidist screenshot](https://raw.githubusercontent.com/vite-styleguidist/vite-styleguidist/main/site/static/img/workbench.jpg)

Another important distinction is that Storybook shows only one variation of one component at a time but Styleguidist can show all variations of all components, all variations of a single component or one variation. It’s easier to create a style guide with Styleguidist but Storybook has more tools to develop components (though we’re working on that too).

| Feature | Storybook | Styleguidist |
| --- | --- | --- |
| Component examples | JavaScript | Markdown |
| Props docs | Yes | Yes |
| Public methods docs | No | Yes |
| Style guide¹ | No | Yes |
| Customizable design | No | Yes |
| Extra documentation² | No | Yes |
| Plugins | Many | No |
| React | Yes | Yes |
| Preact | Yes | Yes |
| React Native | Yes | No |
| Vue | Yes | No ([Vue Styleguidist](https://github.com/vue-styleguidist/vue-styleguidist), the Vue port, is archived) |

¹ All components on a single page.<br> ² Include non-component documentation.

## Are there any other projects like this?

### Active

- [Catalog](https://github.com/interactivethings/catalog), create living style guides using Markdown or React.
- [Cosmos](https://github.com/react-cosmos/react-cosmos), a tool for designing encapsulated React components.
- [Docz](https://www.docz.site/), a tool for documenting your components with zero configuration and live preview.
- [React Storybook](https://storybooks.js.org/), isolate your React UI Component development from the main app.

### Inactive

- [Atellier](https://github.com/scup/atellier), a React components emulator. Last release 2016.
- [Carte Blanche](https://github.com/carteb/carte-blanche), an isolated development space with integrated fuzz testing for your components. Last release 2016.
- [React BlueKit](http://bluekit.blueberry.io/), render React components with editable source and live preview. Last release 2017.
- [React Cards](https://github.com/steos/reactcards), devcards for React. Last release 2017.
- [React Styleguide Generator](https://github.com/pocotan001/react-styleguide-generator), a React style guide generator. Last release 2017.
- [React-demo](https://github.com/rpominov/react-demo), a component for creating demos of other components with props editor. Last release 2017.
- [SourceJS](https://github.com/sourcejs/Source), a platform to unify all your frontend documentation. It has a [Styleguidist plugin](https://github.com/sourcejs/sourcejs-react-styleguidist). On hold.
