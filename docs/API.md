<!-- Node.js API #api -->

# Node.js API

## Initialization

First, you need to initialize the API for your style guide config.

Using a JavaScript object:

```javascript
import styleguidist from 'vite-styleguidist'
const styleguide = styleguidist({
  logger: {
    warn: console.warn,
    info: console.log,
    debug: console.log
  },
  components: './lib/components/**/*.js',
  viteConfig: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname
      }
    }
  }
})
```

> **Info:** Any output is disabled by default, you may need to define your own [logger](Configuration.md#logger).

Using a config file:

```javascript
import styleguidist from 'vite-styleguidist'
const styleguide = styleguidist('../styleguide.config.js')
```

Or auto searching a config file:

```javascript
import styleguidist from 'vite-styleguidist'
const styleguide = styleguidist()
```

See all available [config options](Configuration.md).

> **Info:** Styleguidist is an ES module. CommonJS code can still `require('vite-styleguidist')` on the supported Node.js versions (22.12 or newer; Node 23 is not supported, 24 and later are, see [Compatibility](Compatibility.md)), the result is the same `styleguidist` function.

## Methods

### `build([callback])`

#### Arguments

1.  \[`callback(err, config, output)`\] (_Function_): A callback to be invoked when style guide is built:

    1.  `err` (_Object_): error details.
    2.  `config` (_Object_): normalized style guide config.
    3.  `output` (_Object_): Vite build output (the list of generated chunks and assets).

#### Returns

(_Promise_): resolves to the Vite build output. Without a callback, the promise rejects when the build fails; with a callback, the error is passed to the callback instead.

#### Example

```javascript
import styleguidist from 'vite-styleguidist'
const styleguide = styleguidist('../styleguide.config.js')
await styleguide.build()
console.log(
  'Style guide published to',
  styleguide.config.styleguideDir
)
```

### `server([callback])`

#### Arguments

1.  \[`callback(err, config, server)`\] (_Function_): A callback to be invoked when the dev server is listening:

    1.  `err` (_Object_): error details.
    2.  `config` (_Object_): normalized style guide config.
    3.  `server` (_Object_): the [ViteDevServer](https://vite.dev/guide/api-javascript#vitedevserver) instance.

#### Returns

(_Promise_): resolves to the `ViteDevServer` instance, already listening. Use `server.resolvedUrls` to get its URLs and `server.close()` to stop it.

#### Example

```javascript
import styleguidist from 'vite-styleguidist'
const server = await styleguidist('../styleguide.config.js').server()
console.log(`Listening at ${server.resolvedUrls.local[0]}`)
```

### `makeViteConfig([env])`

#### Arguments

1.  \[`env`=`'production'`\] (_String_): `production` or `development`.

#### Returns

(_Promise_): resolves to the Vite [inline config](https://vite.dev/guide/api-javascript#inlineconfig) Styleguidist would use, including your `viteConfig` (or `vite.config.js`) and the Styleguidist plugins.

#### Example

```javascript
import { createServer } from 'vite'
import styleguidist from 'vite-styleguidist'

const config = await styleguidist().makeViteConfig('development')
const server = await createServer(config)
await server.listen()
```

### `config`

(_Object_): the normalized style guide config, with defaults applied and paths resolved.

## `defineConfig(config)`

An identity function that types a config file: it returns `config` untouched, and TypeScript checks it against `StyleguidistConfig` on the way through. Use it in a TypeScript config file, where the object has no type of its own to be checked against:

```typescript
// styleguide.config.ts
import { defineConfig } from 'vite-styleguidist'

export default defineConfig({
  title: 'My Style Guide',
  components: 'src/components/**/*.tsx'
})
```

A JavaScript config file gets the same checking from a type comment instead, with no import at all — see [type checking your config](Configuration.md#type-checking-your-config).

## Types

The package ships its own TypeScript declarations; these are the ones a config file or a script around the Node.js API is likely to name:

| Type | What it is |
| --- | --- |
| `StyleguidistConfig` | A config file: every [option](Configuration.md), all of them optional |
| `SanitizedStyleguidistConfig` | The normalized config: what the `config` property above, and every callback, receives |
| `ConfigSection` | One entry of the [sections](Configuration.md#sections) option |
| `Theme` | Every [theme](Configuration.md#theme) token, all of them set |
| `RecursivePartial<T>` | The same with everything optional, which is what the `theme` option takes |
| `Styles` | The [styles](Configuration.md#styles) option (JSS’s own type) |
| `ColorScheme` | The [colorScheme](Configuration.md#colorscheme) option |
| `StyleguidistEnv` | `development` or `production`, the argument of `viteConfig` and `makeViteConfig` |

```typescript
import type {
  RecursivePartial,
  StyleguidistConfig,
  Theme
} from 'vite-styleguidist'

const theme: RecursivePartial<Theme> = { color: { link: 'tomato' } }

export const config: StyleguidistConfig = { theme }
```
