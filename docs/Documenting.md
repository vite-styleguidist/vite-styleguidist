<!-- Documenting components #documenting -->

# Documenting components

Styleguidist generates documentation for your components based on the comments in your source code, propTypes declarations, and Readme files.

> **Tip:** [See examples](../examples/basic/src/components) of documented components in the basic example style guide.

## Code comments and propTypes

Styleguidist will display your components’ JSDoc comment blocks. Also, it will pick up props from propTypes declarations and display them in a table.

```javascript
import React from 'react'
import PropTypes from 'prop-types'

/**
 * General component description in JSDoc format. Markdown is *supported*.
 */
export default class Button extends React.Component {
  static propTypes = {
    /** Description of prop "foo". */
    foo: PropTypes.number,
    /** Description of prop "baz". */
    baz: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }
  static defaultProps = {
    foo: 42
  }

  render() {
    /* ... */
  }
}
```

> **Info:** [Flow](https://flowtype.org/) and [TypeScript](https://www.typescriptlang.org) type annotations are supported.

> **Tip:** You can change its behavior using [propsParser](Configuration.md#propsparser) and [resolver](Configuration.md#resolver) options.

> **Info:** Component’s `PropTypes` and documentation comments are parsed by the [react-docgen](https://github.com/reactjs/react-docgen) library. They can be modified using the [updateDocs](Configuration.md#updatedocs) function.

## Usage examples and Readme files

Styleguidist will look for any `Readme.md` or `ComponentName.md` files in the component’s folder and display them. Any code block with a language tag of `js`, `jsx`, `javascript`, `ts`, `tsx` or `typescript` will be rendered as a React component with an interactive playground. For backwards compatibility, code blocks without a language tag are also rendered in this way. It is recommended to always use the proper language tag for new documentation.

    React component example:

    ```js
    <Button size="large">Push Me</Button>
    ```

    You can add a custom props to an example wrapper:

    ```js { "props": { "className": "checks" } }
    <Button>I’m transparent!</Button>
    ```

    Or add padding between examples in a block by passing the `padded` modifier:

    ```jsx padded
    <Button>Push Me</Button>
    <Button>Click Me</Button>
    <Button>Tap Me</Button>
    ```

    Or disable an editor by passing a `noeditor` modifier:

    ```jsx noeditor
    <Button>Push Me</Button>
    ```

    To render an example as highlighted source code add a `static` modifier:

    ```jsx static
    import React from 'react';
    ```

    Examples with all other languages are rendered only as highlighted source code, not an actual component:

    ```html
    <Button size="large">Push Me</Button>
    ```

    Any [Markdown](http://daringfireball.net/projects/markdown/) is **allowed** _here_.

> **Tip:** You can configure examples file name with the [getExampleFilename](Configuration.md#getexamplefilename) option.

> **Tip:** If you need to display some JavaScript code in your documentation that you don’t want to be rendered as an interactive playground you can use the `static` modifier with a language tag (e.g. `js static`).

## MDX

A Markdown page can only put a component inside a playground, where it is editable source code. An [MDX](https://mdxjs.com/) page can also use components as page furniture — a callout, a props matrix, a tabbed comparison — because its prose is compiled to a React tree. Everything else stays the same: fences, modifiers, the current component being in scope inside those fences, the isolated-example links, `docs.json`.

MDX is optional and needs two dev dependencies:

```bash
npm install --save-dev @mdx-js/mdx remark-gfm
```

An `.mdx` file is found the same way a `.md` file is, and its extension is what selects the pipeline:

- `Readme.mdx`, `ComponentName.mdx` or `FolderName.mdx` in the component’s folder. The candidates are interleaved by base name — `Readme.md`, `Readme.mdx`, `ComponentName.md`, `ComponentName.mdx`, `FolderName.md`, `FolderName.mdx` — so `Readme` still beats `ComponentName`, and `.md` still wins over `.mdx` for the same base name;
- `sections[].content: 'docs/Intro.mdx'` for a section page;
- `@example ./extra.mdx` in a doclet;
- whatever a custom [getExampleFilename](Configuration.md#getexamplefilename) returns: return a `.md` path and you get Markdown, return an `.mdx` path and you get MDX.

A page imports the components it wants to use in its prose, and writes fences exactly as it would in Markdown:

````md
import Callout from '../../docs/Callout'

The `Button` component, documented in MDX.

<Callout kind="info">
  This callout is a component, not Markdown.
</Callout>

```jsx padded
<Button size="small">Small</Button>
<Button size="large">Large</Button>
```
````

> **Info:** [See the MDX example style guide](../examples/mdx) for a working version of all of this, including a component that is still documented in `Readme.md`.

The imports at the top of an `.mdx` file are in scope for the page, not for the playgrounds: a playground still imports what it needs inside its own fence, exactly as in Markdown. Custom element renderers can be added with the [mdxComponents](Configuration.md#mdxcomponents) option, and remark, rehype and recma plugins with [mdx](Configuration.md#mdx).

### MDX is not Markdown

MDX is not a superset of Markdown. Six constructs that a `.md` file accepts behave differently, and the first one is a trap rather than a compile error:

| In an `.mdx` file | What happens | Write this instead |
| --- | --- | --- |
| A block indented by four spaces | **Not a code block.** MDX has no indented code, so the block is read as prose, and an indented JSX element is evaluated as a component instead of shown as a playground: `<Callout />` renders _live_ if the page imported it or [mdxComponents](Configuration.md#mdxcomponents) provides it, and otherwise the whole page is replaced by an “Expected component `Callout` to be defined” panel. Either way the build succeeds | A fenced block |
| An HTML comment (`<!-- … -->`) | Compile error | A JSX expression comment, `{/* … */}` |
| A void element without a trailing slash (`br`, `img`, `hr`) | Compile error | `<br />`, `<img />`, `<hr />` |
| An autolink written with angle brackets | Compile error: MDX reads the `<` as the start of a JSX tag | A normal link, `[https://example.com](https://example.com)` |
| Raw HTML, e.g. a `div` with a `class` attribute | It is JSX, so `class` reaches React verbatim and React warns | `className` |
| A curly brace in prose | It starts a JavaScript expression | Escape it, `\{`, or wrap it in backticks |

> **Warning:** The indented-block difference is the one to check first when an MDX page renders something unexpected, and the component the page documents is the worst case: `Button` is in scope inside a fence, but not in the page’s prose, so an indented `<Button />` is neither a playground nor source code — MDX evaluates it, finds nothing, and the page’s prose is replaced by an “Expected component `Button` to be defined” panel. A component the page did import fails the other way round: it renders live, where a playground was meant to be. Neither case fails the build — it exits 0 and warns about nothing — so the page itself is the only place you will see it. The indented examples earlier on this page are Markdown, and stay Markdown, for exactly that reason.

GitHub-flavoured Markdown — tables, task lists, strikethrough, literal URLs — works out of the box, because [remark-gfm](https://github.com/remarkjs/remark-gfm) is enabled by default. If you replace the plugin list with the [mdx](Configuration.md#mdx) option, add it back yourself.

### Differences from a `.md` page

- **Isolated-example links count differently.** In a Markdown page the index in `#!/Button/2` counts every chunk of the page, prose included; an MDX page has no prose chunks — the prose is one React tree — so its index counts playgrounds only, and `#!/Button/1` is the second playground. Both agree with `docs.json`.
- **`docs.json` and `llms-full.txt` get the prose, not the source.** The Markdown parts of the page are written back as Markdown, JSX elements are kept as their MDX source, and `import`/`export` lines are dropped.
- **Not supported yet:** playground code reading the page’s own imports, named exports being visible outside the page, a custom MDX layout, and YAML frontmatter (which `mdx.remarkPlugins` can add).

> **Note:** Nothing changes for a style guide without an `.mdx` file: `.md` pages, their URLs and their `docs.json` output are exactly what they were, and neither `@mdx-js/mdx` nor `remark-gfm` is installed. An `.mdx` file found by discovery when `@mdx-js/mdx` is missing is skipped with a warning; one you named yourself in `sections[].content`, an `@example` doclet or `getExampleFilename` is an error, because you asked for that file by name.

## External examples using doclet tags

Additional example files can be associated with components using `@example` doclet syntax.

The following component will also have an example loaded from the `extra.examples.md` file:

```javascript
/**
 * Component is described here.
 *
 * @example ./extra.examples.md
 */
export default class Button extends React.Component {
  // ...
}
```

> **Note:** You’ll need a regular example file (like `Readme.md`) too when [skipComponentsWithoutExample](Configuration.md#skipcomponentswithoutexample) is `true`.

## Public methods

By default, any methods your components have are considered to be private and are not published. Mark your public methods with JSDoc [`@public`](https://jsdoc.app/tags-public.html) tag to get them published in the docs:

```javascript
/**
 * Insert text at cursor position.
 *
 * @param {string} text
 * @public
 */
insertAtCursor(text) {
  // ...
}
```

## Ignoring props

By default, all props your components have are considered to be public and are published. In some rare cases, you might want to remove a prop from the documentation while keeping it in the code. To do so, mark the prop with JSDoc [`@ignore`](https://jsdoc.app/tags-ignore.html) tag to remove it from the docs:

```javascript
MyComponent.propTypes = {
  /**
   * A prop that should not be visible in the documentation.
   *
   * @ignore
   */
  hiddenProp: PropTypes.string
}
```

## Defining custom component names

Use `@visibleName` JSDoc tag to define component names that are used in the Styleguidist UI:

```javascript
/**
 * The only true button.
 *
 * @visibleName The Best Button Ever 🐙
 */
class Button extends React.Component {
```

The component will be displayed with a custom “The Best Button Ever 🐙” name and this will not change the name of the component used in the code of your app or Styleguidist examples.

## Using JSDoc tags

You can use the following [JSDoc](https://jsdoc.app/) tags when documenting components, props and methods:

- [@deprecated](https://jsdoc.app/tags-deprecated.html)
- [@see, @link](https://jsdoc.app/tags-see.html)
- [@author](https://jsdoc.app/tags-author.html)
- [@since](https://jsdoc.app/tags-since.html)
- [@version](https://jsdoc.app/tags-version.html)

When documenting props you can also use:

- [@param, @arg, @argument](https://jsdoc.app/tags-param.html)

All tags can render Markdown.

```javascript
/**
 * The only true button.
 *
 * @version 1.0.1
 * @author [Jane Doe](https://github.com/janedoe)
 * @author [Andy Krings-Stern](https://github.com/ankri)
 */
class Button extends React.Component {
  static propTypes = {
    /**
     * Button label.
     */
    children: PropTypes.string.isRequired,
    /**
     * The color for the button
     *
     * @see See [Wikipedia](https://en.wikipedia.org/wiki/Web_colors#HTML_color_names) for a list of color names
     * @see See [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value) for a list of color names
     */
    color: PropTypes.string,
    /**
     * The size of the Button
     *
     * @since Version 1.0.1
     */
    size: PropTypes.oneOf(['small', 'normal', 'large']),
    /**
     * The width of the button
     *
     * @deprecated Do not use! Use `size` instead!
     */
    width: PropTypes.number,
    /**
     * Gets called when the user clicks on the button
     *
     * @param {SyntheticEvent} event The react `SyntheticEvent`
     * @param {Object} allProps All props of this Button
     */
    onClick: PropTypes.func
  }
}
```

## Writing code examples

Code examples in Markdown use modern JavaScript, JSX or TypeScript syntax. You can use the current component without explicitly importing it:

````jsx
// ```jsx inside Button/Readme.md or Button.md
<Button>Push Me</Button>
````

> **Info:** Styleguidist uses [Sucrase](https://github.com/alangpierce/sucrase) to compile examples in the browser: it strips JSX and TypeScript syntax but doesn’t transpile modern JavaScript, so anything your browser supports works. Code blocks with `ts` or `tsx` language tags are rendered as playgrounds too. See the [compilerConfig](Configuration.md#compilerconfig) option.

To use other components, you need to explicitly `import` them:

````jsx
// ```jsx inside Panel/Readme.md or Panel.md
import Button from '../Button'
;<Panel>
  <p>
    Using the Button component in the example of the Panel component:
  </p>
  <Button>Push Me</Button>
</Panel>
````

You can also `import` other modules, like mock data:

````jsx
// ```jsx inside Markdown
import mockData from './mocks'
;<Message content={mockData.hello} />
````

Or you can explicitly import all your example dependencies, to make examples easier to copy into your app code:

````jsx
// ```jsx inside Markdown
import React from 'react'
import Button from 'rsg-example/components/Button'
import Placeholder from 'rsg-example/components/Placeholder'
````

> **Info:** `rsg-example` module is an alias defined by the [moduleAliases](Configuration.md#modulealiases) config option.

> **Caution:** You can only use `import` by editing your Markdown files, not by editing the example code in the browser.

Each example acts as a function component and you can use the `useState` Hook to handle its state.

````jsx
// ```jsx inside Markdown
const [isOpen, setIsOpen] = React.useState(false)
;<div>
  <button onClick={() => setIsOpen(true)}>Open</button>
  <Modal isOpen={isOpen}>
    <h1>Hallo!</h1>
    <button onClick={() => setIsOpen(false)}>Close</button>
  </Modal>
</div>
````

If a component uses React Context, you need a context provider in the example or in a custom `Wrapper` component. See [ThemeButton example](../examples/sections/src/components/ThemeButton).

> **Tip:** If you need a more complex demo it’s often a good idea to define it in a separate JavaScript file and `import` it in Markdown.

## Limitations

In some cases Styleguidist may not understand your components, [see possible solutions](Thirdparties.md).
