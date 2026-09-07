# 0018: Parse cache, parallel parsing and a parser with an identity

- **Date:** 2026-09-07
- **Status:** accepted

## Context

Profiling a 350-component design system (175 `.tsx` with an interface, 175 `.js` with PropTypes, a `Readme.md` of four to eight playgrounds each, twelve `@example` doclet files, ten sections) showed where a style guide build spends its time. Of the plugin's `load` hook, **74% is react-docgen and 21% is the Markdown pipeline** — remark plus a Sucrase-and-acorn pass over every playground. Both are synchronous CPU on the main thread, and both re-derive, on every run, an answer that depends only on files that have not changed.

The numbers on the machine of record (Mac14,6, M2 Max, 12 cores, 96 GB, macOS 27.0, Node v26.7.0, Vite 8.2.2), median of three, `/usr/bin/time -l` around the whole `styleguidist build` process:

| Components | Build | Peak RSS |
| --- | --- | --- |
| 50 | 1010 ms | 507 MB |
| 150 | 1520 ms | 641 MB |
| 350 | 2570 ms | 818 MB |

Two thirds of that is work that a second run repeats verbatim, and the whole of it runs on one core while the other eleven idle.

A third thing was found in the same pass. The `propsParser` option is a function, and a function has no identity across processes: two runs can pass different closures with the same source text, and the same closure can capture different state. Nothing an on-disk cache stores about a parse made by a function parser can be trusted on the next run — which is exactly backwards, because a `react-docgen-typescript` parser is the slowest thing a style guide does.

Four prototypes were built and measured before any of this was designed as a feature; the diffs and raw numbers are in the performance harness (`perf/README.md`, “The 350-component study”).

## Options considered

### Reusing previous parses

1. **An on-disk cache in Vite's `cacheDir`, keyed by file content** (chosen). Survives the process, so a second build, a dev-server restart and a `build` after a `server` all start warm. Content-addressed rather than timestamp-addressed, so a branch switch or a fresh clone still hits.
2. **Keying on mtime and size**, as the in-memory `ParseCache` does. Cheaper to compute, but wrong across a `git checkout`, a fresh clone or a CI cache restore — which is where a persistent cache earns most of its keep.
3. **Fingerprinting the whole config** instead of the options a parse can read. Safe, and measurably worse: it folds in `serverPort`, `styleguideDir` and `theme`, so a dev server on a different port or a build after a server discards a cache whose every entry was still valid. Measured at 350 components: a 0.6 s versus a 2.3 s dev-server start.
4. **No cache, and make the parse faster instead.** A prototype that replaced Sucrase+acorn with oxc in `getImports()` was worth 6% at 350 components. Real, orthogonal, and an order of magnitude smaller than what not parsing at all is worth.

### Using more than one core

1. **A pool of two to four worker threads** (chosen), running the default react-docgen and Markdown pipelines. A worker cannot be handed the config — it is full of functions, which are not structured-cloneable — so the parent sends the plain options the default paths read and the worker rebuilds the rest from the schema's own defaults. Any config hook a parse would call keeps that kind of parse on the main thread.
2. **Making the parse itself asynchronous** so rolldown can interleave it. It cannot: react-docgen and remark are synchronous, so an `async` wrapper around them still blocks the same thread.
3. **A child process per parse.** Simpler to reason about, and hopeless: process start-up dwarfs a 6 ms parse.
4. **Always on.** Measured at 50 components: 7% faster for 379 MB more peak memory. Not a trade to make on someone's behalf.

### Identifying a custom parser

1. **`propsParser` also accepts a module path** (chosen), resolved from the config folder, whose default export is the parser. Its identity is its resolved path plus the sha256 of its content — or, inside a package, that package's `name@version`.
2. **Hashing the source text of the function** (`Function.prototype.toString()`). Catches an edited body and misses everything the closure captured, which is the interesting half.
3. **Asking the user to declare a cache key.** An option whose only job is to make another option safe, that nobody would set, and that would be wrong when it was.

## Decision

Three additions, all measured, all default-safe.

### 1. `cache: boolean`, default `true`

Component and example parses are written to `node_modules/.vite/vite-styleguidist/parse-cache.json` — inside Vite's own `cacheDir`, so `viteConfig.cacheDir` moves it and a wiped `node_modules` clears it. Shared by `build` and `server`; `--no-cache` skips it for one run.

An entry is keyed by the sha256 of the file's content, under a fingerprint of everything else the answer depends on: this package's version, the versions the *project* resolves for `react-docgen`, `@mdx-js/mdx` and `remark-gfm`, and the eleven config options a parse can read — `configDir`, `context`, `defaultExample`, `getExampleFilename`, `handlers`, `mdx`, `propsParser`, `resolver`, `sortProps`, `updateDocs`, `updateExample`, functions included, by source text. A changed fingerprint discards the file.

That list is a contract, and it is enforced rather than promised: `parseRelevantOptions.spec.ts` runs every parse path against a proxied config that records which properties were read, and fails both if a parse touches an option the list does not contain and if the list contains one no parse reads.

Two things a content hash cannot see are re-checked on every read: whether the component's examples file exists, and whether the file an `@example` doclet names exists. Entries no run has touched for five runs are dropped and the file is capped at 96 MB (8.15 MB for 350 components). Writes go through a temporary file and a rename; an unreadable or corrupt file is deleted and the run continues as if there had been none.

A **function** `propsParser` turns off caching of component documentation — see decision 3 — and nothing else.

### 2. `parallel: boolean | number | 'auto'`, default `'auto'`

`'auto'` starts a pool when both are true: the style guide resolved **150 components or more**, and **at least 25 parses** have actually had to run. Two to four workers, never more by default. `true` always starts one, a number sets the count, `false` keeps everything on the main thread.

**Why 150.** The pool's cost is fixed (about 100 MB per worker, plus start-up) and its benefit scales with how much there is to parse:

| Components | No pool | 4 workers | Δ |
| --- | --- | --- | --- |
| 50 | 1010 ms / 507 MB | 940 ms / 886 MB | −7%, +379 MB |
| 150 | 1520 ms / 641 MB | 1160 ms / 1033 MB | −24%, +392 MB |
| 350 | 2570 ms / 818 MB | 1610 ms / 1329 MB | −37%, +511 MB |

At 50 the pool buys 70 ms for 379 MB, which is not a trade worth making silently. At 150 it buys 360 ms — a fifth of the build, visible to the person waiting for it — for the same memory. 150 is therefore where `'auto'` switches, and it is a measured point rather than an extrapolation.

**Why at most four.** At 350 components, with the cache off so every file is parsed:

| Workers | Wall | Peak RSS |
| --- | --- | --- |
| 0 | 2570 ms | 818 MB |
| 1 | 2720 ms | 879 MB |
| 2 | 2000 ms | 1056 MB |
| 4 | 1610 ms | 1329 MB |
| 6 | 1550 ms | 1568 MB |
| 8 | 1630 ms | 1764 MB |

One worker is *slower* than none — everything serialises in it and the messages are pure overhead. Six is 60 ms better than four for 239 MB more; eight is worse than four outright, because the workers start competing with rolldown's own thread pool for the same cores. Four is the last size that is clearly worth its memory, so it is the cap `'auto'` and `parallel: true` use; an explicit number is honoured as written.

**Why also wait for 25 parses.** With the cache on — the default — a rebuild after editing five components is 345 cache hits and five parses. Starting four workers for five parses costs more than it saves:

| Components changed | Pool off | Pool forced on | Δ |
| --- | --- | --- | --- |
| 5 | 1010 ms / 783 MB | 1110 ms / 1071 MB | +100 ms |
| 15 | 1040 ms / 777 MB | 1120 ms / 1079 MB | +80 ms |
| 30 | 1100 ms / 794 MB | 1140 ms / 1127 MB | +40 ms |
| 60 | 1200 ms / 804 MB | 1210 ms / 1158 MB | +10 ms |
| 120 | 1390 ms / 855 MB | 1270 ms / 1243 MB | −120 ms |

The pool only starts paying from about 60 changed components, but waiting that long costs a *cold* build the parses it could have parallelised (about 3 ms each). 25 is the compromise: it skips the common “I changed a handful of components” rebuild entirely — measured, 1000 ms and 781 MB instead of 1080 ms and 1068 MB — and costs a cold 350-component build roughly 110 ms of its 960 ms saving. Only `'auto'` waits; `true` and a number are instructions, not guesses.

The pool is started on demand and torn down at `closeBundle` and when the dev server closes. A worker that dies fails the modules it was parsing with a message that says so, and the pool reports itself dead so later parses fall back to the main thread — it never hangs. Warnings raised inside a worker are collected per job and replayed on the main thread, because glogg's emitter only has listeners in the parent.

Output is byte-identical either way. `verify.mjs` in the harness builds the 350-component tree eight ways — plain, two workers, four workers, cold cache, warm cache, the shipped defaults, and after edits and restores — and compares `docs.json` (without its timestamp), both llms files, `index.html` and every bundle chunk against a plain single-threaded build.

### 3. `propsParser` also accepts a module path

A string is resolved from the config folder (a package name works too), validated when the config is read, and loaded once per process with `createRequire()` — which handles both CommonJS and ES modules on the supported Node range. A module whose default export is not a function, that cannot be resolved, that throws, or that uses a top-level `await` fails with a message naming the option, at `buildStart`, before anything is parsed.

Its identity is `name@version` for a parser inside a package and the sha256 of the file for one in the project. That is what makes it cacheable, and it is why the cookbook's `react-docgen-typescript` recipe is now written as a `styleguide.parser.js`. The function form is unchanged and keeps working exactly as before.

**A module-path parser runs on the main thread, not in a worker.** It could be imported by every worker — that is one line — and it must not be. The parsers people reach for build a shared TypeScript program, measured at about a gigabyte, and four workers would build four of them; the recipe exists precisely to build *one*. A single dedicated worker was considered instead and rejected: all component parses would serialise in it, so the only win would be overlapping component parsing with example parsing, which is 21% of the load hook — and the persistent cache already removes the repeat cost of the parse entirely, which is worth more than parallelising it once. Examples still go to the pool under a module-path parser; only component documentation is pinned to the main thread.

### 4. `styleguidist doctor` reports both

Two info findings: `perf.cache` (where the cache is, how large, and whether component documentation is being cached at all) and `perf.parallel` (the decision for this project, and which config function — if any — is keeping parses on the main thread). Info, never warnings: how fast a build is must not change the doctor's exit code.

## Consequences

- **A style guide writes into `node_modules/.vite/` now.** It is a build artefact next to Vite's own, it is deleted with `node_modules`, and it is not in anyone's `.gitignore` because `node_modules` already is. CI that caches `node_modules/.vite` between jobs gets the warm numbers; CI that does not gets the cold ones, which are still better than before.
- **Peak memory goes up on large guides.** The defaults on a 350-component guide peak at 1360 MB on a cold build against 818 MB before. `parallel: false` with the cache on is the memory-conscious configuration and is documented as such: 940 ms at 770 MB on a warm build.
- **A dev server killed within two seconds of its last parse loses that increment.** Nothing installs a signal handler, so `Ctrl-C` and `kill` end the process without a shutdown hook; the cache is written on a 750 ms quiet period with a 2 s maximum wait instead. Losing an increment is never wrong — the next run re-parses and writes it — and a real session flushes many times.
- **`closeBundle` is asynchronous now**, because it terminates the workers. A worker that outlived the build would keep the process alive, so this is what lets `styleguidist build` and `styleguidist server` exit.
- **The 25-parse wait counts over the life of the process, not over a window.** A dev server that has re-parsed twenty-five files one edit at a time eventually starts a pool it will only use one file at a time. That costs memory and saves nothing, and it is the price of a rule with no state to reset; a windowed counter was not worth the machinery for a case that takes an hour of editing to reach.
- **The parse-relevant option list has to be maintained.** Any new option read under `generatePropsModule`, `generateExamplesModule` or `generateMdxModule` must be added to `PARSE_RELEVANT_OPTIONS`; the spec fails otherwise, which is the point.
- **A parser module's own imports are not part of its identity.** Only the file named by the option is hashed, so changing a helper it imports does not invalidate the cache. Documented next to the option, with `--no-cache` as the escape hatch. A dependency walk would be the honest fix and is deferred: it needs a module graph the config loader does not have.
- **The oxc `getImports()` prototype (6% at 350 components) is not part of this record.** It is orthogonal, it changes a parser rather than a policy, and it belongs to its own change.
