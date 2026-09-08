// On-demand component documentation (`lazyDocs`, docs/decisions/0019-on-demand-documentation.md).
//
// Most tests run against the basic example served by test/run.server.js (see
// playwright.config.ts); the `pagePerSection` one against the built sections example, like
// pagenav.spec.ts next to it (`npm run build:sections` first); and the last one against a
// style guide of its own, started with the option turned off.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { test as base, expect, type Page } from '@playwright/test';

const test = base;

const EXAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../examples');

/** The components of the basic example, in sidebar order. */
const FIRST = 'Button';
const LAST = 'WrappedButton';
/**
 * The one component of the basic example with no examples file of its own — and, as this
 * suite’s dev server is configured (test/run.server.js sets no `defaultExample`), with no
 * examples at all. Whether a component has any is in the section tree from the start, which
 * is why its hint does not wait for the documentation.
 */
const WITHOUT_EXAMPLES = 'PushButton';

/** A request for a component’s documentation: the `rsg-props:` module of one component. */
const isDocsRequest = (url: string) => url.includes('rsg-props');
const docsRequestFor = (url: string, name: string) =>
	isDocsRequest(url) && url.includes(`${name}/${name}`);

/**
 * Take the look-ahead out of the viewport rule for one page.
 *
 * The six components of the basic example fit, containers and all, inside the 1200 px the
 * observer looks ahead by (DOCS_ROOT_MARGIN), so every one of them would be “near the
 * viewport” on load and there would be nothing left to scroll to. Wrapping
 * IntersectionObserver so that it observes with no margin at all makes “near the viewport”
 * mean “in the viewport”, which is the same rule at a scale this example can show. The
 * margin itself is checked where it is set, in ReactComponent.spec.tsx.
 */
async function narrowTheObserverMargin(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const Native = window.IntersectionObserver;
		class NoMargin extends Native {
			constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
				super(callback, { ...options, rootMargin: '0px' });
			}
		}
		window.IntersectionObserver = NoMargin;
	});
}

/** Record every documentation request the page makes. */
function recordDocsRequests(page: Page): string[] {
	const requested: string[] = [];
	page.on('request', (request) => {
		if (isDocsRequest(request.url())) {
			requested.push(decodeURIComponent(request.url()));
		}
	});
	return requested;
}

test.describe('on-demand documentation', () => {
	test('renders every container and heading before any documentation arrives', async ({
		page,
	}) => {
		// Hold every documentation module back: what is on the page until they arrive is
		// exactly what the section tree alone can draw
		let release = () => undefined as void;
		const held = new Promise<void>((resolve) => {
			release = resolve as () => void;
		});
		await page.route(
			(url) => isDocsRequest(url.href),
			async (route) => {
				await held;
				await route.continue();
			}
		);

		await page.goto('/');

		// Every component has its container, its heading and its sidebar entry…
		await expect(page.locator('[data-testid$="-container"]')).toHaveCount(6);
		await expect(page.getByTestId(`${FIRST}-container`)).toBeVisible();
		await expect(page.getByTestId(`${LAST}-container`)).toBeVisible();
		await expect(page.getByTestId('rsg-toc-link').first()).toHaveText(FIRST);
		// …and its anchor, which is what a deep link and the scroll spy need
		expect(await page.locator('#wrappedbutton').count()).toBe(1);
		// …but no examples, and not the “add examples to this component” placeholder for a
		// component that may still turn out to have some
		await expect(page.getByTestId(`${FIRST}-examples`)).toHaveCount(0);
		await expect(
			page.getByTestId(`${FIRST}-container`).getByText(/add examples to this component/i)
		).toHaveCount(0);
		// …while the one component the tree already knows has none says so at once
		await expect(
			page
				.getByTestId(`${WITHOUT_EXAMPLES}-container`)
				.getByText(/add examples to this component/i)
		).toBeVisible();
		await expect(page.getByText(/add examples to this component/i)).toHaveCount(1);

		release();
		await expect(page.getByTestId(`${FIRST}-examples`)).toBeVisible();
	});

	test('loads a component’s documentation when it scrolls into view', async ({ page }) => {
		await narrowTheObserverMargin(page);
		const requested = recordDocsRequests(page);

		await page.goto('/');

		// The top of the page is documented…
		await expect(page.getByTestId(`${FIRST}-examples`)).toBeVisible();
		// …and the bottom of it is not asked for yet
		await expect(page.getByTestId(`${LAST}-container`)).toBeVisible();
		await expect(page.getByTestId(`${LAST}-examples`)).toHaveCount(0);
		expect(requested.some((url) => docsRequestFor(url, LAST))).toBe(false);

		await page.getByTestId(`${LAST}-container`).scrollIntoViewIfNeeded();

		await expect(page.getByTestId(`${LAST}-examples`)).toBeVisible();
		expect(requested.some((url) => docsRequestFor(url, LAST))).toBe(true);
	});

	test('renders the examples of the component a deep link points at', async ({ page }) => {
		await narrowTheObserverMargin(page);

		// The last component of the page, which is below the fold: this only renders because
		// the route asked for it, not because it is in view
		await page.goto(`/#${LAST.toLowerCase()}`);

		await expect(page.getByTestId(`${LAST}-examples`)).toBeVisible();
		// …and the page is at it, not at the top
		expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

		// …and it is still at it once everything on screen has filled in. The components
		// between the viewport and the target load *after* the scroll and grow the document
		// under it, which used to leave the reader a screenful or more above what they asked
		// for (deepLinks.ts). Either the target is at the top of the viewport or the page is
		// scrolled as far as it goes, which is as close to the top as it can be put.
		await page.waitForLoadState('networkidle');
		const placed = await page.evaluate((id) => {
			const element = document.getElementById(id);
			return {
				top: element ? element.getBoundingClientRect().top : null,
				fromBottom:
					document.documentElement.scrollHeight - window.innerHeight - Math.round(window.scrollY),
			};
		}, LAST.toLowerCase());
		expect(placed.top === null || placed.top < 8 || placed.fromBottom < 8).toBe(true);
	});

	test('renders the one example an isolated example route shows', async ({ page }) => {
		// The route picks an example out of a list that is empty until the documentation is
		// loaded, so the page has to be routed again once it is
		await page.goto(`/#!/${FIRST}/1`);

		await expect(page.getByTestId(`${FIRST}-examples`)).toBeVisible();
		await expect(page.locator(`[data-testid^="${FIRST}-example-"]`)).toHaveCount(1);
	});

	// What the reader sees while a component’s documentation is on its way, and what they
	// see instead when it never arrives (DocsLoading)
	test('shows a spinner while a component’s documentation is slow, and nothing after', async ({
		page,
	}) => {
		// Held until this test lets go rather than delayed by a timeout: a fixed delay makes
		// the window in which the spinner exists a race against a busy machine. How long the
		// spinner waits before appearing is where the wait is set, in DocsLoading.spec.tsx.
		let release = () => undefined as void;
		const held = new Promise<void>((resolve) => {
			release = resolve as () => void;
		});
		await page.route(
			(url) => isDocsRequest(url.href),
			async (route) => {
				await held;
				await route.continue();
			}
		);

		await page.goto('/');

		const loading = page.getByTestId('docs-loading').first();
		await expect(loading).toBeVisible();
		await expect(loading).toHaveText(/loading documentation/i);
		await expect(page.getByTestId('docs-loading-spinner').first()).toBeVisible();

		// …and once the documentation is there it is the documentation, not a spinner
		release();
		await expect(page.getByTestId(`${FIRST}-examples`)).toBeVisible();
		await expect(page.getByTestId('docs-loading')).toHaveCount(0);
	});

	test('says so when a component’s documentation cannot be fetched', async ({ page }) => {
		await page.route(
			(url) => isDocsRequest(url.href),
			async (route) => {
				await route.abort();
			}
		);

		await page.goto('/');

		await expect(page.getByTestId('docs-loading-error').first()).toHaveText(
			new RegExp(`The documentation of ${FIRST} could not be loaded\\.`)
		);
		// The one recovery a built style guide has: the browser will not fetch a module URL
		// whose fetch failed a second time (ADR 0019)
		await expect(page.getByRole('button', { name: 'Reload the page' }).first()).toBeVisible();
		// …and the container, its heading and its anchor are still there
		await expect(page.getByTestId(`${FIRST}-container`)).toBeVisible();
	});

	test('loads only the component the isolated view shows', async ({ page }) => {
		const requested = recordDocsRequests(page);

		await page.goto(`/#!/${FIRST}`);

		await expect(page.getByTestId(`${FIRST}-examples`)).toBeVisible();
		await expect(page.locator('[data-testid$="-container"]')).toHaveCount(1);
		expect(requested.some((url) => docsRequestFor(url, FIRST))).toBe(true);
		expect(requested.some((url) => docsRequestFor(url, LAST))).toBe(false);
	});
});

// Same worker-scoped static server as examples.spec.ts and pagenav.spec.ts.
const sectionsTest = base.extend<{}, { examplesServer: string }>({
	examplesServer: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use) => {
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

sectionsTest.describe('on-demand documentation with pagePerSection', () => {
	sectionsTest(
		'loads the documentation of the route’s components and of no others',
		async ({ page, examplesServer }) => {
			// The chunks a production build actually served, by content: the file names are
			// hashed, so what identifies a component’s documentation is what is inside it
			const chunks: string[] = [];
			page.on('response', async (response) => {
				if (/\/build\/[^/]+\.js$/.test(response.url()) && response.status() === 200) {
					chunks.push(await response.text().catch(() => ''));
				}
			});

			await page.goto(`${examplesServer}/sections/styleguide/#/Components/Buttons`);
			await expect(page.getByTestId('ThemeButton-examples')).toBeVisible();
			await page.waitForLoadState('networkidle');

			const served = chunks.join('\n');
			// The two components of the Buttons section
			expect(served).toContain('React Context with a component');
			// …and not the ones of the sections the page does not show
			expect(served).not.toContain('fantasy');
		}
	);
});


// `lazyDocs: false` puts every component's documentation back in the entry chunk, so there
// is never anything to wait for and neither state can appear. It needs a style guide of its
// own: the shared dev server runs with the defaults. Same shape as config-restart.spec.ts —
// a config in a folder outside the repository, so writing it does not reach the watcher of
// the server the rest of the suite is looking at.
const PORT = 6124;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const eagerDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'rsg-eager-docs-'));
const eagerConfig = path.join(eagerDir, 'styleguide.config.cjs');

let eagerServer: ChildProcess | undefined;
let eagerOutput = '';

const eagerTest = base;

eagerTest.describe('with on-demand documentation turned off', () => {
	eagerTest.describe.configure({ mode: 'serial' });

	eagerTest.beforeAll(async () => {
		eagerTest.setTimeout(180_000);
		const componentsDir = path.join(EXAMPLES_DIR, 'basic/src');
		fs.writeFileSync(
			eagerConfig,
			`module.exports = {
	components: ${JSON.stringify(path.join(componentsDir, 'components/**/[A-Z]*.js'))},
	moduleAliases: { 'rsg-example': ${JSON.stringify(componentsDir)} },
	serverPort: ${PORT},
	previewDelay: 0,
	lazyDocs: false,
};
`
		);
		eagerServer = spawn(
			process.execPath,
			['lib/bin/styleguidist.js', 'server', '--config', eagerConfig],
			{ cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] }
		);
		eagerServer.stdout?.on('data', (chunk) => (eagerOutput += chunk));
		eagerServer.stderr?.on('data', (chunk) => (eagerOutput += chunk));

		const start = Date.now();
		while (!eagerOutput.includes('You can now view your style guide')) {
			if (Date.now() - start > 150_000) {
				throw new Error(`Timed out starting the style guide:\n${eagerOutput}`);
			}
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	});

	eagerTest.afterAll(async () => {
		if (eagerServer) {
			const exited = new Promise<void>((resolve) => eagerServer?.on('exit', () => resolve()));
			eagerServer.kill();
			await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
		}
		fs.rmSync(eagerDir, { recursive: true, force: true });
	});

	eagerTest('never shows a spinner or a failure', async ({ page }) => {
		await page.goto(`http://localhost:${PORT}/`);

		// Every component is documented from the first render, the last one included: there
		// is nothing on its way, so there is nothing to say about it
		await expect(page.getByTestId(`${FIRST}-examples`)).toBeVisible();
		await expect(page.getByTestId(`${LAST}-examples`)).toBeVisible();
		await expect(page.getByTestId('docs-loading')).toHaveCount(0);
		await expect(page.getByTestId('docs-loading-error')).toHaveCount(0);
	});
});
