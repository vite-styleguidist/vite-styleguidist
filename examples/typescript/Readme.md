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

[react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript) runs the TypeScript compiler over your whole program, so it resolves types across packages — the one thing road 1 cannot do. It is not a dependency of Vite Styleguidist. Install it, plus `react-docgen` for the files that are not TypeScript:

```bash
npm install --save-dev react-docgen-typescript react-docgen
```

Then copy the [cookbook recipe](../../docs/Cookbook.md#components-re-exported-from-another-package) into `styleguide.config.js`. Copy that one rather than the parser’s own minimal example, because it carries three things this example proves you need:

- it hands the parser **one** TypeScript program for the whole style guide. `parse()` builds a fresh `ts.Program` on every call, and each one re-reads and re-binds `lib.dom.d.ts`, React’s typings and your whole project — a program per component is what makes this parser slow;
- it drops only the ~290 DOM attributes `@types/react` contributes, not every prop declared under `node_modules`. The widely copied `!prop.parent.fileName.includes('node_modules')` filter would strip every prop of the third-party components you installed the parser for;
- it documents the entry named after the file. `Badge.tsx` exports `BadgeTone` before `Badge`, and without that step the page comes out as an empty “BadgeTone”.

The trade, measured on these four components: 0.6 s and 433 MB of peak memory with the default parser, 1.2 s and 675 MB with the recipe. Types are printed as `T | undefined` rather than `T`, a `tsconfig.json` is required, and the package’s last release is `2.4.0` from June 2025.

You do not have to choose once for the whole style guide: `propsParser` receives the file path, so you can call the TypeScript parser for the directory that re-exports a component library and let everything else fall through to the default.
