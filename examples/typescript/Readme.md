# TypeScript example

Two separate things, both of them TypeScript, and neither needs a loader:

- **Four `.tsx` components documented with no parser configuration at all.** The default parser reads their type annotations, and Vite compiles the TypeScript and the `.css` import.
- **A `styleguide.config.ts` instead of a `styleguide.config.js`.** This is the worked example for [config file formats](../../docs/Configuration.md#config-file-formats); the whole walkthrough is [further down](#a-typescript-config-file).

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

Then copy the [cookbook recipe](../../docs/Cookbook.md#components-re-exported-from-another-package) into your config. It is written as a JavaScript module, and it keeps working verbatim in a `.ts` config in a project like this one — the compiled config is CommonJS here, so its `require` calls resolve (see [the table below](#what-exists-inside-the-file)); in an ES module project, or just for consistency, rewrite its `require`/`module.exports` as `import`/`export default`.

Copy that recipe rather than the parser’s own minimal example, because it carries three things this example proves you need:

- it hands the parser **one** TypeScript program for the whole style guide. `parse()` builds a fresh `ts.Program` on every call, and each one re-reads and re-binds `lib.dom.d.ts`, React’s typings and your whole project — a program per component is what makes this parser slow;
- it drops only the ~290 DOM attributes `@types/react` contributes, not every prop declared under `node_modules`. The widely copied `!prop.parent.fileName.includes('node_modules')` filter would strip every prop of the third-party components you installed the parser for;
- it documents the entry named after the file. `Badge.tsx` exports `BadgeTone` before `Badge`, and without that step the page comes out as an empty “BadgeTone”.

The trade, measured on these four components: 0.6 s and 433 MB of peak memory with the default parser, 1.2 s and 675 MB with the recipe. Types are printed as `T | undefined` rather than `T`, a `tsconfig.json` is required, and the package’s last release is `2.4.0` from June 2025.

You do not have to choose once for the whole style guide: `propsParser` receives the file path, so you can call the TypeScript parser for the directory that re-exports a component library and let everything else fall through to the default.

## A TypeScript config file

### The files

Two of them. `styleguide.config.ts` is the config Styleguidist finds and loads:

```typescript
import { defineConfig } from 'vite-styleguidist'
import { version } from './package.json'
import { sections, title } from './styleguide.meta.ts'

export default defineConfig({
  title,
  version,
  sections
})
```

…and `styleguide.meta.ts` is an ordinary module next to it, holding the part that would have made the config long:

```typescript
import type { ConfigSection } from 'vite-styleguidist'

export const title = 'Vite Styleguidist TypeScript Example'

export const sections: ConfigSection[] = [
  {
    name: 'Controls',
    description:
      'Components the user types into, presses or picks from.',
    components: [
      'src/components/Button.tsx',
      'src/components/Field.tsx',
      'src/components/Select.tsx'
    ]
  },
  {
    name: 'Feedback',
    description: 'Components that only report state back.',
    components: ['src/components/Badge.tsx']
  }
]
```

The real files carry comments the listings above leave out. Read them next to this page.

### Why there is no `styleguide.config.js` any more

There used to be one, and it was deleted rather than kept alongside. Styleguidist looks for six names, in this order, in the current folder and its parents:

1. `styleguide.config.js`
2. `styleguide.config.mjs`
3. `styleguide.config.cjs`
4. `styleguide.config.ts`
5. `styleguide.config.mts`
6. `styleguide.config.cts`

The first name that exists wins, and the search stops there. `styleguide.config.js` comes before `styleguide.config.ts`, so a folder holding both loads the JavaScript one and the TypeScript one is never read — an edit that appears to do nothing, with nothing printed to explain it. The order is deliberate (a project that has always had a `.js` config keeps loading it, whatever else appears in the folder), which makes deleting the old file the migration step.

If you would rather not depend on the package’s `"type"` field, `.mts` is always an ES module and `.cts` is always CommonJS, exactly as with `.mjs` and `.cjs`.

### `defineConfig`, and what the types buy

`defineConfig` is an identity function — it returns the object it is given, untouched. Its only job is to put a type on the object literal, which is what an editor needs to be useful:

- **Completion on option names.** Typing `co` in the object offers `colorScheme`, `compilerConfig`, `components`, `configDir`, `configureServer`, `context` and `contextDependencies`, each with the JSDoc comment from the declaration in the hover card, so the option list stops being something you go and look up.
- **An error on a name that does not exist.** `titel: 'x'` is a red squiggle that says `Object literal may only specify known properties, but 'titel' does not exist in type 'StyleguidistConfig'. Did you mean to write 'title'?` A JavaScript config accepts the typo silently and starts with the default title.
- **An error on the wrong shape.** `theme` takes a partial theme object or a path; `sections` takes an array; `skipComponentsWithoutExample` is a boolean. Each one is checked where you write it.
- **Completion inside nested structures.** `sections` is `ConfigSection[]`, so the fields of a section — and of a section nested inside a section — are offered and checked too.

That last point is why `styleguide.meta.ts` annotates its export as `ConfigSection[]` rather than letting TypeScript infer an array of object literals. Inside `defineConfig({ sections: [...] })` the type flows in from the parameter; once the array moves to a module of its own, writing the type out is what keeps the checking.

Every type a config file might name is exported from the package root — `StyleguidistConfig`, `ConfigSection`, `Theme`, `RecursivePartial`, `Styles`, and the rest listed in the [Node.js API docs](../../docs/API.md#types).

**For the editor to know any of this, the package has to be installed.** This example depends on the repository root through `file:../../`, so:

```bash
cd examples/typescript
npm install
```

…gives it a `node_modules/vite-styleguidist` symlink pointing at the repository root, whose `exports` map hands TypeScript `lib/scripts/index.d.ts`. Those declarations are built, not checked in, so run `npm run compile` in the repository root first or the import resolves to nothing. In your own project, an ordinary `npm install vite-styleguidist` is all of it.

Then this type-checks the config together with the components:

```bash
npx tsc --noEmit -p examples/typescript   # from the repository root
npm run typecheck                         # the same thing, from examples/typescript
```

Two options in `tsconfig.json` exist for the config file alone, both commented there: `resolveJsonModule` (for `import { version } from './package.json'`) and `allowImportingTsExtensions` (for the `./styleguide.meta.ts` specifier — see below). The config and the shared module are named in `include`; a file that is not in `include` is not checked, which is a quiet way to have none of this.

### How the file is loaded

No `ts-node`, no `tsx`, no `--experimental-strip-types`, nothing to install. Styleguidist reads the file, strips its types with [Sucrase](https://github.com/alangpierce/sucrase) — the same compiler it already ships to compile examples in the browser — writes the result next to your config under a temporary name, `require`s it, and deletes it again.

Four things follow from that, and they are the whole surprise budget of a TypeScript config:

**It is synchronous, so there is no top-level `await`.** The public Node API (`styleguidist(config)`) is synchronous and reads the config on the way in. In an ES module project that fails with `ES modules using top-level await are not supported in Styleguidist config files`; here, where the compiled config is CommonJS, `await` outside a function is a syntax error before it gets that far. The same goes for exporting a promise or a function — the export has to be a plain object, and Styleguidist says so rather than falling through to the defaults.

**The folder holding the config has to be writable.** That is where the compiled file is written. It exists for the few milliseconds Node takes to evaluate it and is deleted afterwards, but a read-only directory fails with a message that says so.

**The types are stripped, not checked.** Sucrase deletes the annotations without ever looking at whether they are true, so `tsc` and your editor are the only things that check them — one more reason for the `npx tsc --noEmit` above. Styleguidist still validates the config it ends up with against its own schema, so a wrong type is caught either way, just later and by a different voice:

```
title config option should be string, received number.
```

**An import used only as a type is dropped, and so is the module it came from.** Sucrase has no type information, so it goes by use: a binding that never appears in a value position is erased along with its `import` statement. Write `import type` anyway (this example does) — it says what you mean, `tsc` enforces it under `verbatimModuleSyntax`, and it is the form that does not depend on a heuristic. The one import that always survives is the side-effect form, `import './something.js'`, which has no bindings to judge.

#### What exists inside the file

The compiled file is written _next to_ the original, so it belongs to the same `package.json` and the same module system your config already belonged to. There is no separate rule to learn — but there is a table, because the two halves are exact opposites:

|  | This example (no `"type"`, so CommonJS) | A project with `"type": "module"` |
| --- | --- | --- |
| `require`, `module`, `exports` | work | not defined |
| `__dirname` | works, and is your config’s folder | `ReferenceError` |
| `__filename` | works, **names the temporary file** | `ReferenceError` |
| `import.meta.dirname` | `SyntaxError: Cannot use 'import.meta' outside a module` | works, and is your config’s folder |
| `import.meta.filename` / `.url` | same `SyntaxError` | work, **name the temporary file** |

Both halves of that table were run, not reasoned about. The one line worth remembering is the third and the fifth together: **the directory is right and the file name is not.** The compiled file is a sibling of your config, so `__dirname` and `import.meta.dirname` are the folder you expect; `__filename`, `import.meta.filename` and `import.meta.url` name something like `.styleguide.config.ts.41337-0.cjs`, which existed for a moment and is already gone. Deriving a path from the file name — `path.dirname(fileURLToPath(import.meta.url))` reaches the right folder only because the sibling shares it — is fine; printing or comparing it is not.

Most configs need none of this. Styleguidist resolves the relative paths in a config against the folder the config file is in, which is why the component paths in `styleguide.meta.ts` are plain relative strings and this example never mentions `__dirname` outside a comment.

#### Importing another TypeScript module

Styleguidist compiles **the config file and nothing else**. `./styleguide.meta.ts` is left to Node.js, which strips types from **version 22.18** on — so importing a `.ts` module from your config raises this example’s floor above the `^22.12.0` the package itself supports, which is why `examples/typescript/package.json` asks for `^22.18.0 || >=24.0.0`.

Note the specifier: `'./styleguide.meta.ts'`, with the real extension. Node resolves it literally, and `./styleguide.meta.js` — the extension you would write in a project that compiles first — points at a file that does not exist at run time. That is what `allowImportingTsExtensions` in `tsconfig.json` is for, and it is only allowed because nothing here emits (`noEmit`).

On an older Node, two ways out, both fine:

- keep the shared module in **JavaScript** (`styleguide.meta.js`, imported as `'./styleguide.meta.js'`) and let the config stay TypeScript — you lose the annotation on `sections`, but a `/** @type {import('vite-styleguidist').ConfigSection[]} */` comment above the export buys it back;
- or **inline it**, back into `defineConfig({ sections: [...] })`, where the type comes from the parameter and nothing has to be imported at all.

There is no such cost to importing types: `import type { ConfigSection } from 'vite-styleguidist'` is erased before Node ever sees it.

### Restarting on a change

`npm run start:typescript` watches the config file and restarts when you save it:

```
[vite] examples/typescript/styleguide.config.ts changed, restarting the style guide...
[vite] server restarted.
```

Save a broken config and the running style guide is left alone — the error is printed and the previous config keeps serving, so a half-finished edit cannot take the dev server down. `title: 42` prints the schema message quoted earlier and nothing restarts.

**What is watched is the config file itself, not what it imports.** Editing `styleguide.meta.ts` changes nothing until you touch `styleguide.config.ts` (or restart), which is a fair trade for a shared module but is worth knowing before you spend ten minutes on it. Components and examples are a different matter — Vite watches those, and they hot-reload as always.

### Checking it without starting anything

`doctor` loads the config exactly the way `server` and `build` do, validates it, and prints what it found — the fastest way to see whether a `.ts` config is being picked up at all:

```bash
npx vite-styleguidist doctor --config examples/typescript/styleguide.config.ts
```

```
Config: …/examples/typescript/styleguide.config.ts
…
  7. Found 4 components
No problems found, your style guide config is ready to go.
```

If the `Config:` line names a file you did not expect, discovery found something earlier in the list — see [above](#why-there-is-no-styleguideconfigjs-any-more).

### Staying on JavaScript

A `.js` config gets most of the checking for free, with no import and nothing to compile — one comment above the export:

```javascript
// styleguide.config.js
/** @type {import('vite-styleguidist').StyleguidistConfig} */
export default {
  title: 'My Style Guide',
  components: 'src/components/**/*.js'
}
```

Completion, hovers and the `titel` error are all there. What it does not give you is a type on anything the config does not directly contain — a `sections` array in another module, a `propsParser` written as a function — where TypeScript would let you annotate the value where it lives. And a JSDoc comment can drift from the export it sits above without anything noticing, which is exactly what `defineConfig` prevents by being a function call.

Either way, the reference is [docs/Configuration.md](../../docs/Configuration.md).
