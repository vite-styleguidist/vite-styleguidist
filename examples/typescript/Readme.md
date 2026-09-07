# TypeScript example

Four `.tsx` components documented with **no parser configuration at all**: the default parser reads their type annotations, and Vite compiles the TypeScript and the `.css` import. `styleguide.config.js` is four lines long.

```bash
npm run build:typescript   # from the repository root
npm run start:typescript
```

## What each component is here to show

| Component | Shows |
| --- | --- |
| `Button.tsx` | An `interface` that extends `React.ButtonHTMLAttributes`, an exported union type alias, an inline literal union, and defaults in the destructuring pattern |
| `Badge.tsx` | `React.FC`, an exported `enum` used as a prop type, props declared in a non-exported `interface` |
| `Field.tsx` | `React.forwardRef`, with its props in a separate module (`Field.types.ts`) |
| `Select.tsx` | A generic component whose `Option` type parameter is inferred from `options` |

## The two roads

### 1. The default parser (what this example uses)

[react-docgen](https://github.com/reactjs/react-docgen) parses the file you point it at and reads the types as written. It needs no `tsconfig.json`, no extra dependency and no `propsParser`, it is fast, and it documents the props a component _declares_ — `Button` gets a table of its own four props rather than the ~290 attributes that `React.ButtonHTMLAttributes` drags in.

Known limits, all of them measured in [decision 0017](../../docs/decisions/0017-typescript-props.md):

- It reads one file plus the type-only modules that file imports relatively. It cannot document a component **re-exported from another package** (`export { Button } from 'antd'`) — that is road 2 below.
- `readonly T[]` comes out as `unknown` (react-docgen 8.0.3). Write `T[]` if the props table matters more than the modifier; that is why `SelectProps.options` is `Option[]`.

### 2. react-docgen-typescript, for components you re-export

[react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript) runs the TypeScript compiler over your whole program, so it resolves types across packages. Install it (it is not a dependency of Vite Styleguidist) and add a `propsParser`:

```bash
npm install --save-dev react-docgen-typescript
```

```javascript
// styleguide.config.js
const path = require('path')
const { withCustomConfig } = require('react-docgen-typescript')

const parser = withCustomConfig('./tsconfig.json', {
  savePropValueAsString: true,
  // This parser follows the resolved types, so a component whose props extend
  // React.ButtonHTMLAttributes gets ~290 DOM attributes. Drop what @types/react
  // contributes and nothing else: the widely copied
  // `!prop.parent.fileName.includes('node_modules')` filter ALSO drops the props of
  // the third-party components you installed this parser to document.
  propFilter: prop =>
    !prop.parent ||
    !/node_modules[\\/]@types[\\/]react[\\/]/.test(
      prop.parent.fileName
    )
})

module.exports = {
  components: 'src/components/**/[A-Z]*.tsx',
  propsParser(filePath) {
    const docs = parser.parse(filePath)
    // It returns an entry for every exported symbol it takes for a component, including
    // exported enums, and Styleguidist documents the first one. Badge.tsx exports
    // `BadgeTone` before `Badge`, so without this the page would be an empty
    // “BadgeTone”. Put the entry named after the file first.
    const name = path.basename(filePath, path.extname(filePath))
    const match = docs.find(doc => doc.displayName === name)
    return match ? [match] : docs
  }
}
```

The trade: a `tsconfig.json` is required, the whole program is type-checked on every parse (slower on a large project), types are printed as `T | undefined` rather than `T`, and the package’s last release is `2.4.0` from June 2025.

You do not have to choose once for the whole style guide: `propsParser` receives the file path, so you can call the TypeScript parser for the directory that re-exports a component library and let everything else fall through to the default.
