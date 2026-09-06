# 0009: End-to-end testing

- **Date:** 2026-09-06
- **Status:** accepted

## Context

The fork inherited two browser test rigs from React Styleguidist, and the last substantive change to either predates the fork. Twelve Cypress tests (two spec files) checked the style guide UI against a dev server, and a hand-written puppeteer script opened each of the eight built example style guides and failed on JavaScript errors; CI ran both, one after the other, in the `integration` job.

Neither toolchain was in `package-lock.json`. Cypress, `wait-on` and puppeteer were installed mid-job with `npm i --no-save` and versions pinned inside npm script strings, which put them outside `npm ci`, outside the weekly `npm audit`, and outside Dependabot (which cannot see a version inside a script). Every other dependency of the fork is managed deliberately; this was the one place still running on inherited defaults. The cost was also visible: roughly 1.7 GB of browser binaries (Cypress’s Electron, puppeteer’s Chrome) downloaded on every run, uncached, with a 45-minute job timeout, and no screenshots or traces uploaded when something failed. Cypress’s support scaffolding (two files, every line commented out) and a stock fixture nobody referenced shipped along with the tests.

At the same time the 1.0 work replaces the code editor with CodeMirror 6, which the UI tests exercise, so the tests had to be touched anyway.

## Options considered

1. **Port the Cypress tests to Playwright, keep the puppeteer smoke script.** The smaller diff, but it leaves one of the two out-of-lockfile installs in place and most of the download (puppeteer’s ~1.1 GB Chrome) with it.
2. **Move both rigs to a single Playwright install.** One browser (Chromium, ~0.5 GB, cacheable), one dependency in the lockfile, one `test:e2e` command; the eight near-identical smoke scripts collapse into one parameterised spec, and failure screenshots, traces and an HTML report come with the tool. Playwright is also the browser provider Vitest’s browser mode uses, so it keeps the door open to browser-mode unit tests later without adding a second tool.
3. **Keep Cypress and puppeteer as they are through 1.0.** No risk to a green job, but the pinned versions would keep rotting silently (Cypress was already a major behind) and CI failures would stay undebuggable from the log alone.
4. **Vitest browser mode instead of a separate end-to-end runner.** Tempting for coherence with the unit tests, but it is built for component tests, not for driving a server-rendered page or checking a static build for runtime errors, and it runs on Playwright underneath anyway.

## Decision

**Playwright is the only browser test tool** (option 2). `@playwright/test` is a regular devDependency, the specs live in `test/e2e/` (`core.spec.ts` and `component.spec.ts` are the twelve Cypress tests ported one to one; `examples.spec.ts` is the smoke test over the eight builds), and `playwright.config.ts` starts and stops the dev server itself. `npm run test:e2e` runs everything, `test:e2e:examples` the smoke test alone, `test:e2e:ui` the interactive mode. CI installs Chromium once per Playwright version through `actions/cache` and uploads the report only when the job fails.

The ported tests keep their original shape on purpose: each spec file loads its page once and its tests share it, which is how Cypress ran them (`testIsolation: false`). Playwright would normally isolate every test; the port uses serial mode plus a page created in `beforeAll` instead, so the twelve tests keep asserting exactly what they asserted before. Restructuring them into independent tests is a follow-up, not part of the migration. The console-error filter of the old smoke script is carried over unchanged, since it is what decides pass or fail.

## Consequences

- Cypress, puppeteer and `wait-on` are gone from the repository, together with `cypress.config.js`, `test/cypress/`, `test/browser.js` and fourteen npm scripts. The browser toolchain is now visible to `npm ci`, `npm audit` and Dependabot like every other dependency.
- Contributors install one browser build once (`npx playwright install chromium`); [CONTRIBUTING.md](../../.github/CONTRIBUTING.md) documents the flow. The three-terminal Cypress procedure is no longer needed.
- The `integration` CI job downloads ~0.5 GB instead of ~1.7 GB, and only on a cache miss; its timeout dropped from 45 to 30 minutes, with the example builds now the dominant cost.
- A failing browser test on CI leaves a screenshot, a trace (on retry) and an HTML report as a downloadable artifact, where before it left a log line.
- The code editor test does not assume a `<textarea>`: it finds either react-simple-code-editor’s textarea or CodeMirror’s `.cm-content` and edits through the keyboard, so the editor swap planned for 1.0 does not need to touch it.
- Ubuntu 24.04 runners restrict unprivileged user namespaces, which can affect sandboxed Chromium. Playwright’s Chromium on `ubuntu-latest` is the tool’s most common setup; if it ever fails, the known-good fallback is `launchOptions.args: ['--no-sandbox']`, which the old puppeteer script passed unconditionally.
- Two suites share one config, so the dev server also starts for the smoke test that never uses it. That is one idle node process per run; splitting into two configs is easy if it ever matters.
