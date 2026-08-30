# How to contribute

We love pull requests. And following these guidelines will make your pull request easier to merge.

If you want to contribute but don’t know what to do, take a look at these two labels: [help wanted](https://github.com/styleguidist/react-styleguidist/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) and [good first issue](https://github.com/styleguidist/react-styleguidist/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). Our [docs](https://github.com/styleguidist/react-styleguidist/tree/master/docs) and [site](https://github.com/styleguidist/site) are also far from perfect and could use a little love.

## Prerequisites

- If it’s your first pull request, watch [this amazing course](http://makeapullrequest.com/) by [Kent C. Dodds](https://twitter.com/kentcdodds).
- Install [EditorConfig](http://editorconfig.org/) plugin for your code editor to make sure it uses correct settings.
- Fork the repository and clone your fork.
- Install dependencies: `npm install`.
- Read the [developer guide](https://react-styleguidist.js.org/docs/development).

## Development workflow

Compile the TypeScript sources to `lib/` in watch mode:

```bash
npm run compile:watch
```

Then open a new terminal and start an example style guide (it runs the compiled `lib/bin/styleguidist.js`):

```bash
npm start
```

Open [localhost:6060](http://localhost:6060) in a browser. The style guide runs from the compiled `lib/` folder: changes to the UI components (`src/client`) are hot reloaded by Vite as soon as `tsc` has recompiled them, changes to the Node side (`src/scripts`, `src/vite`, `src/loaders`) need a restart of the style guide.

(There are other example style guides to test particular features too, run `npm run` to see a list.)

Run linters, the type checker and tests:

```bash
npm test
```

Or run tests ([Vitest](https://vitest.dev/)) in watch mode:

```bash
npm run test:watch
```

To update snapshots:

```bash
npx vitest -u
```

To build the example style guides and check that they work in a real browser (no JavaScript errors on load):

```bash
npm run build:basic
npm run test:browser:pre
npm run test:browser:basic
```

**Don’t forget to add tests and update documentation for your changes.**

**Please update npm lock file (`package-lock.json`) if you add or update dependencies.**

## Integration tests (Cypress)

First install dependencies:

```bash
npm run test:cypress:pre
```

Then compile the sources:

```bash
npm run compile
```

Then open a new terminal and start Styleguidist server:

```bash
npm run test:cypress:startServer
```

And, finally, in another separate terminal run tests:

```bash
npm run test:cypress:run
```

Or open Cypress UI:

```bash
npm run test:cypress:open
```

## Other notes

- If you have commit access to repository and want to make big change or not sure about something, make a new branch and open pull request.
- We’re using [Prettier](https://github.com/prettier/prettier) to format JavaScript, so don’t worry much about code formatting.
- Don’t commit generated files, like minified JavaScript.
- Don’t change version number and change log.
- If you're updating examples other then `examples/basic`, you'll need to modify your start commands:

```bash
npm run start:customised # if making changes to examples/customised
npm run start:sections # if making changes to examples/sections
```

See the `scripts` section of the top level [package.json](https://github.com/styleguidist/react-styleguidist/blob/master/package.json). If an example doesn't have a script just point to its config:

```bash
node lib/bin/styleguidist.js server --config examples/path/to/example/styleguide.config.js
```

## Need help?

- Join our [Gitter](https://gitter.im/styleguidist/styleguidist) or [Spectrum](https://spectrum.chat/styleguidist) chats and ask everything you need.
