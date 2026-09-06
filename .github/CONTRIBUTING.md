# How to contribute

We love pull requests. And following these guidelines will make your pull request easier to merge.

If you want to contribute but don’t know what to do, take a look at these two labels: [help wanted](https://github.com/vite-styleguidist/vite-styleguidist/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) and [good first issue](https://github.com/vite-styleguidist/vite-styleguidist/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). Our [docs](../docs) and the [documentation site](../site) (it lives in this repository, under `site/`) are also far from perfect and could use a little love.

## This is a fork

Vite Styleguidist is a maintained fork of React Styleguidist. It is not affiliated with or endorsed by the original React Styleguidist maintainers. Read [About this fork](../docs/Fork.md) for the history, the relationship with the original project and what we do differently. Bugs in `react-styleguidist` 13.x and older belong in the [original repository](https://github.com/styleguidist/react-styleguidist), not here.

## Prerequisites

- Use a supported [Node.js](https://nodejs.org/) version: 22.12 or newer, or 24 or newer (see `engines` in [package.json](../package.json), `.nvmrc` has the version we develop with).
- Install the [EditorConfig](https://editorconfig.org/) plugin for your code editor to make sure it uses correct settings.
- Fork the repository and clone your fork.
- Install dependencies: `npm ci` (installs exactly what `package-lock.json` says; plain `npm install` works too but may rewrite the lock file).
- Install the Git hooks once: `npm run hooks:install`. They run lint-staged and commitlint on every commit. This is a separate step, not part of `npm ci`, so that the published package has no install scripts.
- Read the [developer guide](../docs/Development.md).

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

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(optional scope): summary`, all lowercase, no trailing period.

- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`.
- A breaking change gets a `!` after the type or scope (`feat!: drop node 20`) and a `BREAKING CHANGE:` footer explaining what breaks and how to migrate.
- Examples: `fix: keep single-line jsx examples on one line`, `docs(configuration): document the vite option`, `chore: update dev dependencies`.

Releases are automated: the release tooling reads the commit history to decide whether the next version is a patch, a minor or a major, and it writes the release notes from the commit summaries. That is why the convention is enforced by [commitlint](https://commitlint.js.org/) in two places: a Git hook checks every commit message locally, and a CI check validates the pull request title. Pull requests are squash-merged, and the squash commit takes the pull request title, so **the pull request title is what ends up in the changelog**. A typo in the title ships verbatim into the release notes, so please write it as carefully as the code.

## Licensing of contributions

This project is licensed under the [MIT License](../License.md). Contributions are accepted under the same terms (“inbound = outbound”): by submitting a pull request, an issue or any other contribution, you agree that your contribution is licensed under the project’s MIT License, and you confirm that you have the right to license it that way. There is no Contributor License Agreement (CLA) and no Developer Certificate of Origin (DCO) sign-off to deal with.

## Reporting security issues

Please don’t report security vulnerabilities in public issues or pull requests. Follow the process in [SECURITY.md](../SECURITY.md) instead.

## Other notes

- If you have commit access to repository and want to make big change or not sure about something, make a new branch and open pull request.
- We’re using [Prettier](https://github.com/prettier/prettier) to format JavaScript, so don’t worry much about code formatting.
- Don’t commit generated files, like minified JavaScript.
- Don’t change the version number or the changelog: releases are cut automatically from the commit messages (see [Commit messages](#commit-messages)).
- If you're updating examples other then `examples/basic`, you'll need to modify your start commands:

```bash
npm run start:customised # if making changes to examples/customised
npm run start:sections # if making changes to examples/sections
```

See the `scripts` section of the top level [package.json](../package.json). If an example doesn't have a script just point to its config:

```bash
node lib/bin/styleguidist.js server --config examples/path/to/example/styleguide.config.js
```

## Need help?

- Ask usage questions in [GitHub Discussions](https://github.com/vite-styleguidist/vite-styleguidist/discussions) (the Q&A category), so the answer helps the next person too.
- Report bugs and request features in [GitHub Issues](https://github.com/vite-styleguidist/vite-styleguidist/issues): the issue forms ask for everything we need to help you.
