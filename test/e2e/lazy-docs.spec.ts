// On-demand component documentation (`lazyDocs`, docs/decisions/0019-on-demand-documentation.md).
//
// The first four tests run against the basic example served by test/run.server.js (see
// playwright.config.ts); the `pagePerSection` one against the built sections example, like
// pagenav.spec.ts next to it (`npm run build:sections` first).
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { test as base, expect, type Page } from '@playwright/test';

const test = base;

const EXAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../examples');

/** The components of the basic example, in sidebar order. */
const FIRST = 'Button';
const LAST = 'WrappedButton';

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
		// …but no examples, and not the “add examples to this component” placeholder either
		await expect(page.getByTestId(`${FIRST}-examples`)).toHaveCount(0);
		await expect(page.getByText(/add examples to this component/i)).toHaveCount(0);

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
