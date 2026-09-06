// Smoke test for the built example style guides: each one is opened in headless Chromium
// and must render without a JavaScript error. Replaces the puppeteer script test/browser.js
// and the eight `test:browser:*` npm scripts that ran it (see ADR 0009).
//
// The examples must be built first (`npm run build:basic` ... `npm run build:vite`, exactly
// what the CI integration job does); a missing build fails its test with a clear 404.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { test as base, expect } from '@playwright/test';

// One entry per example directory; keep in sync with the `build:*` scripts in package.json
// and the "Build all examples" step of .github/workflows/ci.yml.
const EXAMPLES = [
	'basic',
	'customised',
	'sections',
	'themed',
	'express',
	'preact',
	'styled-components',
	'vite',
];

const EXAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../examples');

// Runtime errors that React catches (error boundaries, hook failures) never surface as
// `pageerror`, they only show up as console errors, so those are matched too. The browser's
// implicit /favicon.ico 404 is also a console error and is deliberately not matched.
// Lifted verbatim from test/browser.js; tune with care, it is what decides pass or fail.
const RUNTIME_ERROR = /TypeError|ReferenceError|Invalid hook call|Minified React error/;

// The builds are served over HTTP rather than opened from file:// URLs: Vite emits
// `<script type="module">`, which browsers refuse to run from the file system. One
// worker-scoped static server (sirv is already a runtime dependency) covers all eight
// builds, because they reference their assets relatively (`./build/...`), so each is
// reachable at /<name>/styleguide/.
const test = base.extend<{}, { examplesServer: string }>({
	examplesServer: [
		// Playwright reads the destructuring pattern to learn which fixtures this one depends
		// on, so the first parameter has to be `{}` even though nothing is used.
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
			// `dev: true` disables sirv's startup file cache, so a rebuilt example is picked up
			// without restarting the server.
			const server = http.createServer(sirv(EXAMPLES_DIR, { dev: true }));
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			const { port } = server.address() as AddressInfo;
			await use(`http://127.0.0.1:${port}`);
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve()))
			);
		},
		{ scope: 'worker' },
	],
});

for (const name of EXAMPLES) {
	test(`the ${name} example renders without runtime errors`, async ({ page, examplesServer }) => {
		const url = `${examplesServer}/${name}/styleguide/`;
		const errors: string[] = [];
		const consoleLog: string[] = [];

		// Both listeners go on before navigation so nothing logged during load is missed.
		page.on('pageerror', (error) => {
			errors.push(`Uncaught: ${error.stack || error.message}`);
		});
		page.on('console', (message) => {
			consoleLog.push(`[${message.type()}] ${message.text()}`);
			if (message.type() === 'error' && RUNTIME_ERROR.test(message.text())) {
				errors.push(`Console error: ${message.text()}`);
			}
		});

		await page.goto(url);

		// A component or a section must have rendered, and so must some documentation prose:
		// a runtime that silently drops Markdown still shows the containers. Both assertions
		// auto-wait, which replaces the old `networkidle0` navigation wait.
		await expect(
			page.locator('[data-testid$="-container"], [data-testid^="section-"]').first()
		).toBeVisible();
		await expect(page.locator('p').filter({ hasText: /\S/ }).first()).toBeAttached();

		// Give late console errors (effects, lazy chunks) a chance to arrive before judging.
		// The builds are static, so "no network activity" is reached almost immediately.
		await page.waitForLoadState('networkidle');

		if (consoleLog.length > 0) {
			await test.info().attach('browser console', {
				body: consoleLog.join('\n'),
				contentType: 'text/plain',
			});
		}
		expect(errors, `runtime errors at ${url}`).toEqual([]);
	});
}
