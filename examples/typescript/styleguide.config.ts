import { defineConfig } from 'vite-styleguidist';
import { version } from './package.json';
import { sections, title } from './styleguide.meta.ts';

// A TypeScript config file. Styleguidist finds it by name — see CONFIG_FILENAMES in
// docs/Configuration.md#config-file-formats — strips its types with Sucrase and loads the
// result; no `ts-node`, no `tsx`, no loader flag. The `.js` config this example used to ship
// is gone on purpose: discovery stops at the first name it finds, and `styleguide.config.js`
// comes before `styleguide.config.ts` in that list, so keeping both would have left this file
// dead in the water. Readme.md walks through all of it.
//
// What is checked here, before anything runs: every option name and its type (`defineConfig`),
// the `sections` tree (annotated in styleguide.meta.ts), and `version`, which is a `string`
// in package.json and would not be accepted as anything else.
//
// ── CommonJS or ES module? Same rule as any other file ────────────────────────────────────
// The compiled file is written next to this one, so it belongs to the same package.json —
// and this example's has no `"type"` field, which makes it CommonJS. In *this* file,
// therefore, `require`, `module`, `__dirname` and `__filename` all work, and `import.meta` is
// a syntax error. A project with `"type": "module"` gets exactly the reverse. (`.mts` is
// always an ES module and `.cts` always CommonJS, if you would rather say it in the
// extension than depend on the package.)
//
// One thing to know either way: the file that actually runs is a temporary sibling, so
// `__filename` (or `import.meta.filename`) names *it*, not this file. The directory is right
// — the sibling is written next to the original — so `__dirname` and `import.meta.dirname`
// can be trusted and the file names cannot.
//
// Most configs never need any of that: Styleguidist resolves the paths in a config against
// the folder the config file is in, which is why the component paths in styleguide.meta.ts
// are plain relative strings and nothing here has to build an absolute one.
//
// ── No `propsParser` here, on purpose ─────────────────────────────────────────────────────
// The default parser (react-docgen) reads the type annotations of these `.tsx` files as they
// are written, and Vite compiles TypeScript with no configuration of its own. That is the
// whole setup for components you own.
//
// The other road — react-docgen-typescript, for components re-exported from another package —
// is described in Readme.md and spelled out as a copy-paste recipe in docs/Cookbook.md. See
// decision 0017 for the measurements behind that split.
export default defineConfig({
	title,
	version,
	sections,
});
