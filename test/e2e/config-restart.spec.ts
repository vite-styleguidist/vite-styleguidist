// The dev server watches the config file it was started from and restarts itself when it
// changes (src/scripts/watchConfig.ts). The decisions are unit-tested in
// watchConfig.spec.ts; this is the proof that the whole thing works through the CLI, with a
// real Vite dev server and a browser looking at it.
//
// It runs a server of its own, on its own port, from a `.mts` config file — so it also
// covers loading a TypeScript config end to end — that shows the components of the basic
// example. The config lives in a folder of its own outside the repository: writing files
// inside it would reach the watcher of the dev server the rest of the suite shares, whose
// root is the whole repository, and reload the page a test in another worker is looking at.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const PORT = 6123;
const STYLEGUIDE_URL = `http://localhost:${PORT}/`;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exampleDir = path.join(repoRoot, 'examples/basic/src');
const configDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'rsg-restart-'));
const configPath = path.join(configDir, 'styleguide.config.mts');

/** A config for the components of the basic example, with a title this spec recognises. */
const configSource = (title: string, broken = false) => `
const components: string = ${JSON.stringify(path.join(exampleDir, 'components/**/[A-Z]*.js'))};

export default {
	title: ${JSON.stringify(title)},
	components: ${broken ? '42' : 'components'},
	moduleAliases: { 'rsg-example': ${JSON.stringify(exampleDir)} },
	serverPort: ${PORT},
	previewDelay: 0,
};
`;

let styleguide: ChildProcess;
let output = '';
let page: Page;

/** Wait until the style guide has printed something, or fail with everything it printed. */
async function waitForOutput(text: string, timeout = 90_000) {
	const start = Date.now();
	while (!output.includes(text)) {
		if (Date.now() - start > timeout) {
			throw new Error(`Timed out waiting for “${text}” in:\n${output}`);
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	// Give the restarted server a moment to accept connections again
	await new Promise((resolve) => setTimeout(resolve, 500));
}

test.beforeAll(async ({ browser }) => {
	test.setTimeout(120_000);
	fs.writeFileSync(configPath, configSource('Restart Before'));

	styleguide = spawn(
		process.execPath,
		['lib/bin/styleguidist.js', 'server', '--config', configPath],
		{ cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] }
	);
	styleguide.stdout?.on('data', (chunk) => (output += chunk));
	styleguide.stderr?.on('data', (chunk) => (output += chunk));

	await waitForOutput('You can now view your style guide');
	page = await browser.newPage();
});

test.afterAll(async () => {
	await page?.close();
	// Wait for the style guide to be gone before deleting the folder it was started from: a
	// dev server writes into it as it shuts down (Vite's dependency cache, and the parse
	// cache of the `cache` option, both under node_modules/.vite), and removing a directory
	// something is still writing to fails with ENOTEMPTY.
	const exited = new Promise<void>((resolve) => {
		if (!styleguide || styleguide.exitCode !== null) {
			resolve();
			return;
		}
		styleguide.once('exit', () => resolve());
		setTimeout(() => {
			styleguide?.kill('SIGKILL');
			resolve();
		}, 5000);
	});
	styleguide?.kill('SIGTERM');
	await exited;
	fs.rmSync(configDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

test('serves the style guide its TypeScript config file describes', async () => {
	await page.goto(STYLEGUIDE_URL);
	await expect(page).toHaveTitle('Restart Before');
	// The components the config names are really there, not just its title
	await expect.poll(() => page.locator('[data-testid$="-container"]').count()).toBeGreaterThan(0);
});

test('restarts when the config file changes', async () => {
	test.setTimeout(120_000);
	output = '';
	fs.writeFileSync(configPath, configSource('Restart After'));

	await waitForOutput('changed, restarting the style guide');

	await expect
		.poll(
			async () => {
				await page.goto(STYLEGUIDE_URL, { waitUntil: 'commit' });
				return page.title();
			},
			{ timeout: 60_000 }
		)
		.toBe('Restart After');
});

test('keeps serving the style guide when the changed config file is broken', async () => {
	test.setTimeout(120_000);
	output = '';
	fs.writeFileSync(configPath, configSource('Never Applied', true));

	await waitForOutput('Something is wrong with your style guide config');

	// The style guide the browser is looking at is the one that was running before the
	// mistake, and it is still running
	await page.goto(STYLEGUIDE_URL);
	await expect(page).toHaveTitle('Restart After');
});
