// Playwright configuration for the end-to-end tests in test/e2e/ (see ADR 0009,
// docs/decisions/0009-end-to-end-testing.md, for why Playwright replaced Cypress and the
// puppeteer smoke script). Everything here runs against the compiled package in lib/, so
// `npm run compile` first; the examples spec additionally needs the 8 `npm run build:*`
// example builds on disk.
import { defineConfig } from '@playwright/test';

// Same port as test/run.server.js; the two must agree.
const BASE_URL = 'http://localhost:8082';

export default defineConfig({
	testDir: 'test/e2e',
	// The ported Cypress specs share one page per file (see test/e2e/*.spec.ts), so tests
	// within a file must not run in parallel. Files can still run in separate workers.
	fullyParallel: false,
	// A stray `test.only` would silently shrink the suite; fail CI instead of passing it.
	forbidOnly: !!process.env.CI,
	// One retry on CI absorbs the occasional slow runner without hiding real failures
	// (a test that only passes on retry is reported as "flaky", not as "passed").
	retries: process.env.CI ? 1 : 0,
	// The HTML report is what the CI job uploads on failure; locally the list output is enough.
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: BASE_URL,
		// Failure diagnostics come for free from Playwright instead of a hand-written
		// screenshot path; traces are only recorded when a test is being retried, so a green
		// run costs nothing extra.
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
		video: 'off',
		// The viewport the old puppeteer smoke script used (test/browser.js).
		viewport: { width: 1024, height: 768 },
	},
	// One browser is enough for a build tool's own UI checks, and one is what CI downloads
	// (`npx playwright install chromium`). If a headless-Chromium sandbox problem ever shows
	// up on ubuntu-latest (Ubuntu 24.04 restricts unprivileged user namespaces), the known-good
	// fallback is `use: { launchOptions: { args: ['--no-sandbox'] } }`, which is what the old
	// puppeteer script passed unconditionally.
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	// Playwright starts the style guide dev server for the whole run and stops it afterwards,
	// which replaces the "start in one terminal, wait-on in another" dance the Cypress setup
	// needed. `webServer` is global, so it also runs for the examples spec, which serves the
	// static builds itself and never talks to this server; that costs one idle node process
	// and keeps a single config.
	webServer: {
		command: 'node test/run.server.js',
		url: BASE_URL,
		// Locally, a server left running from a previous run (or `npm start` on this port) is
		// reused; on CI a fresh one is always started.
		reuseExistingServer: !process.env.CI,
		// The first Vite start after `npm run compile` also pre-bundles dependencies.
		timeout: 120_000,
	},
});
