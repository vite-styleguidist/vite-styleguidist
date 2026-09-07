<!-- CLI commands #cli -->

# CLI commands and options

## Commands

- `styleguidist server`: Run dev server.
- `styleguidist build`: Generate a static HTML style guide.
- `styleguidist doctor`: Check the config, the environment and the project, and print what to do about every problem found.
- `styleguidist help`: Print the list of commands and options (running `styleguidist` without a command does the same).

## Options

| Option            | Description                                   |
| ----------------- | --------------------------------------------- |
| `--config <file>` | Specify path to a config file                 |
| `--port <port>`   | Specify port to run the development server on |
| `--open`          | Open Styleguidist in the default browser      |
| `--verbose`       | Print debug information                       |
| `--json`          | Print the `doctor` report as JSON             |

## Usage

Add these commands into your `package.json`’s `scripts` section:

```json
{
  "scripts": {
    "styleguide": "styleguidist server",
    "styleguide:build": "styleguidist build"
  }
}
```

Or run them directly from your terminal:

```bash
npx styleguidist server
npx styleguidist build
```

> **Tip:** [npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) is a part of npm and will run locally-installed `styleguidist` package.

## Restarting on a config change

`styleguidist server` watches the config file it was started from — the one `--config` names, or the one it found. When you save it, the style guide reads it again, rebuilds its Vite config and restarts:

```bash
5:32:07 PM [vite] styleguide.config.ts changed, restarting the style guide...
5:32:07 PM [vite] server restarted.
```

The style guide keeps its address, so the browser needs nothing but a reload.

If the config you saved has a mistake in it, the error is printed and the style guide keeps running with the last config that worked:

```bash
5:32:19 PM [vite] styleguide.config.ts has an error, the style guide is still running with the previous config:
Something is wrong with your style guide config

components config option should be string, function, or array, received number.
```

> **Note:** Only the config file itself is watched, and only it is read again. Your `vite.config.js` is read again too, on every restart, but a module your config file imports keeps the value it had when the style guide started — Node.js cannot unload a module — so stop and start the server by hand after changing one.

## The doctor command

`styleguidist doctor` looks at a project without building anything and reports what would go wrong. It is the fastest way to find out how much work an upgrade from `react-styleguidist` 13 will be, and it is safe to run at any time: it only reads files.

```bash
npx vite-styleguidist doctor
```

The package installs two binaries with the same content, `styleguidist` and `vite-styleguidist`, so this command also works in a project that has not installed anything yet: npm downloads the package for the run. In a project that already depends on Vite Styleguidist, `npx styleguidist doctor` is the same thing without the download.

The second name is also there for the one case where the first one is ambiguous: `react-styleguidist` installs a `styleguidist` binary too, so while both packages are installed side by side, `npx styleguidist` runs whichever of them npm linked last. `npx vite-styleguidist` always runs this one — and the doctor says so when it finds that the project’s `styleguidist` command belongs to the old package.

It checks three things:

- **The config.** Every unknown, removed, deprecated and invalid option, all of them in one run, each with its replacement. Unknown options get a “did you mean” when a real option looks like what you typed.
- **The environment.** Your Node.js version against the [supported range](Compatibility.md), the `react` and `react-dom` your project resolves against the peer range, which React root the style guide will mount with, whether `react-styleguidist` is still installed, and which package manager the project uses.
- **The project.** Your components (found with the same patterns the style guide uses) and the files named by the `theme`, `styles`, `require`, `styleguideComponents` and `mdxComponents` options, scanned for the four things Vite does not understand: CommonJS in a theme or styles file, or in a project file one of those imports, `require.context()`, `process.env` variables other than `NODE_ENV` and `STYLEGUIDIST_ENV`, and imports of the old package name.

Findings are grouped as errors, warnings and info, and every error and warning carries a one-line fix and a link to the documentation section that explains it. The command exits with `1` when there is at least one error and `0` otherwise, so it can guard a migration in CI.

Options:

| Option            | Description                              |
| ----------------- | ---------------------------------------- |
| `--config <file>` | Config file to check                     |
| `--json`          | Print the report as JSON instead of text |

The `--json` shape is meant to be read by scripts: a `reportVersion`, an `ok` boolean, the `counts` per level, and a `findings` array whose entries have a stable `id` (`config.removed-option`, `project.require-context`, …), a `level`, a `title`, and optional `detail`, `fix`, `docs`, `file`, `files` and `meta` fields. New findings and new optional fields can appear in a minor release; an existing `id` never changes its meaning without a bump of `reportVersion`.
