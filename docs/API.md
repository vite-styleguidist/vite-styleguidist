<!-- Node.js API #api -->

# Node.js API

## Initialization

First, you need to initialize the API for your style guide config.

Using a JavaScript object:

```javascript
import styleguidist from 'react-styleguidist'
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
import styleguidist from 'react-styleguidist'
const styleguide = styleguidist('../styleguide.config.js')
```

Or auto searching a config file:

```javascript
import styleguidist from 'react-styleguidist'
const styleguide = styleguidist()
```

See all available [config options](Configuration.md).

> **Info:** Styleguidist is an ES module. CommonJS code can still `require('react-styleguidist')` on the supported Node.js versions (20.19 or 22.12 and newer), the result is the same `styleguidist` function.

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
import styleguidist from 'react-styleguidist'
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
import styleguidist from 'react-styleguidist'
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
import styleguidist from 'react-styleguidist'

const config = await styleguidist().makeViteConfig('development')
const server = await createServer(config)
await server.listen()
```

### `config`

(_Object_): the normalized style guide config, with defaults applied and paths resolved.
