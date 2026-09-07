// The “on this page” navigation (`pageNav`, ADR 0016), against the built sections example —
// the one style guide in the repository that turns the option on, and the shape it is meant
// for: `pagePerSection`, one section or component per page.
//
// The example must be built first (`npm run build:sections`), like the examples spec next to
// this one; a missing build fails on the first locator.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { test as base, expect } from '@playwright/test';

const EXAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../examples');

/** The page of the sections example with the most headings (docs/One.md plus a component). */
const PAGE = '/sections/styleguide/#/Documentation/Files/First%20File';
/** A page whose only heading is its title: PageNav must render nothing at all there. */
const THIN_PAGE = '/sections/styleguide/#/Documentation/Files/Second%20File';

// `theme.mq.large` is `min-width: 1480px` (src/client/styles/theme.ts); these two widths sit
// on either side of it, and 390 is the Mobile artboard.
const WIDE = { width: 1500, height: 950 };
const LAPTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

// Same worker-scoped static server as examples.spec.ts: the builds reference their assets
// relatively, so one server over examples/ reaches every one of them.
const test = base.extend<{}, { examplesServer: string }>({
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

test.describe('page navigation', () => {
	test('renders a rail beside the content column from mq.large up', async ({
		page,
		examplesServer,
	}) => {
		await page.setViewportSize(WIDE);
		await page.goto(`${examplesServer}${PAGE}`);
		await page.waitForLoadState('networkidle');

		const nav = page.getByTestId('rsg-pagenav');
		await expect(nav).toBeVisible();
		// The rail, not the collapsible block
		await expect(page.getByTestId('rsg-pagenav-summary')).toHaveCount(0);
		await expect(nav).toHaveAccessibleName('On this page');

		// The h2/h3 of the page, in document order, and nothing else: h1 is the page title and
		// the h4–h6 of docs/One.md are below the window the rail lists
		await expect(page.getByTestId('rsg-pagenav-link')).toHaveText([
			'Heading 2',
			'Heading 3',
			'Details',
			'Label',
		]);

		// Beside the content column, not inside it, and the column keeps its 960 px
		const navBox = (await nav.boundingBox()) as { x: number; width: number };
		const columnBox = (await page.locator('#rsg-content > div:last-child').boundingBox()) as {
			x: number;
			width: number;
		};
		expect(columnBox.width).toBe(960);
		expect(navBox.x).toBeGreaterThan(columnBox.x + columnBox.width);
		// `theme.pageNavWidth`
		expect(Math.round(navBox.width)).toBe(168);
		// and nothing overflows sideways
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth
			)
		).toBe(true);
	});

	for (const [name, viewport] of [
		['a laptop', LAPTOP],
		['a phone', PHONE],
	] as const) {
		test(`renders a collapsible block above the content on ${name}`, async ({
			page,
			examplesServer,
		}) => {
			await page.setViewportSize(viewport);
			await page.goto(`${examplesServer}${PAGE}`);
			await page.waitForLoadState('networkidle');

			const summary = page.getByTestId('rsg-pagenav-summary');
			await expect(summary).toBeVisible();
			await expect(summary).toHaveText('On this page');
			// Closed by default, so it costs one line above the content until it is asked for
			const details = page.locator('[data-testid="rsg-pagenav"] details');
			await expect(details).not.toHaveAttribute('open', '');
			await expect(page.getByTestId('rsg-pagenav-link').first()).toBeHidden();

			await summary.click();
			await expect(page.getByTestId('rsg-pagenav-link').first()).toBeVisible();

			// Above the content it describes
			const navBox = (await page.getByTestId('rsg-pagenav').boundingBox()) as { y: number };
			const titleBox = (await page.getByRole('heading', { name: 'First File' }).boundingBox()) as {
				y: number;
			};
			expect(navBox.y).toBeLessThan(titleBox.y);
		});
	}

	test('moves the highlight to the heading the reader has scrolled to', async ({
		page,
		examplesServer,
	}) => {
		await page.setViewportSize(WIDE);
		await page.goto(`${examplesServer}${PAGE}`);
		await page.waitForLoadState('networkidle');

		const current = page.locator('[data-testid="rsg-pagenav-link"][aria-current="location"]');
		// At the top of the page the first entry is the current one
		await expect(current).toHaveText('Heading 2');

		await page.evaluate(() => {
			const heading = document.getElementById('heading-3') as HTMLElement;
			window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 4);
		});
		await expect(current).toHaveText('Heading 3');

		// At the bottom of the document the last entry wins, even though its heading never
		// reaches the activation line (ADR 0015)
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await expect(current).toHaveText('Label');
	});

	test('scrolls to the heading of the entry that is clicked', async ({ page, examplesServer }) => {
		await page.setViewportSize(WIDE);
		await page.goto(`${examplesServer}${PAGE}`);
		await page.waitForLoadState('networkidle');

		await page.getByTestId('rsg-pagenav-link').filter({ hasText: 'Heading 3' }).click();

		// The route is kept and the target travels in `?id=`, which is what src/client/index.ts
		// scrolls to; a plain `#heading-3` would have replaced the route
		await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('?id=heading-3');
		await expect
			.poll(() =>
				page.evaluate(() =>
					Math.round(
						(document.getElementById('heading-3') as HTMLElement).getBoundingClientRect().top
					)
				)
			)
			.toBeLessThan(8);
	});

	test('keeps the highlight on an entry clicked in the last screenful', async ({
		page,
		examplesServer,
	}) => {
		// The bottom rule of ADR 0015 answers “the last anchor” once the page cannot scroll
		// any further, so only the pin can hold the entry the reader clicked. The pin is a
		// `hashchange` to a watched id, and on a routed page that id travels in `?id=` —
		// which `readHashId` has to recognise, or clicking “Details” lights “Label”.
		await page.setViewportSize(WIDE);
		await page.goto(`${examplesServer}${PAGE}`);
		await page.waitForLoadState('networkidle');

		await page.getByTestId('rsg-pagenav-link').filter({ hasText: 'Details' }).click();

		const current = page.locator('[data-testid="rsg-pagenav-link"][aria-current="location"]');
		await expect(current).toHaveText('Details');
		// The page really is at its bottom, i.e. this is the case the pin exists for
		expect(
			await page.evaluate(
				() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
			)
		).toBe(true);
	});

	test('scrolls to the heading of a `?id=` link opened cold', async ({ page, examplesServer }) => {
		// The URL a reader copies out of the address bar after clicking an entry. It reaches a
		// fresh page with no `hashchange` of its own, so src/client/index.ts has to scroll once
		// after the first render, or the shared link opens at the top of the page.
		await page.setViewportSize(WIDE);
		await page.goto(`${examplesServer}${PAGE}?id=details`);
		await page.waitForLoadState('networkidle');

		await expect
			.poll(() =>
				page.evaluate(() =>
					Math.round(
						(document.getElementById('details') as HTMLElement).getBoundingClientRect().top
					)
				)
			)
			.toBeLessThan(8);
		// …and the entry the link names is the current one, not the last one
		await expect(
			page.locator('[data-testid="rsg-pagenav-link"][aria-current="location"]')
		).toHaveText('Details');
	});

	test('clears the sticky header when an entry is clicked on a phone', async ({
		page,
		examplesServer,
	}) => {
		await page.setViewportSize(PHONE);
		await page.goto(`${examplesServer}${PAGE}`);
		await page.waitForLoadState('networkidle');

		await page.getByTestId('rsg-pagenav-summary').click();
		await page.getByTestId('rsg-pagenav-link').filter({ hasText: 'Heading 3' }).click();

		// The heading has to land *below* the sticky header, not underneath it: index.ts
		// subtracts the same `--rsg-sticky-offset` the scroll padding uses. Polled, because the
		// scroll follows the `hashchange` by a frame or two.
		await expect
			.poll(() =>
				page.evaluate(() => {
					const offset = Number.parseFloat(
						document.documentElement.style.getPropertyValue('--rsg-sticky-offset')
					);
					const { top } = (
						document.getElementById('heading-3') as HTMLElement
					).getBoundingClientRect();
					// > 0 asserts the sticky header is being measured at all, which is what makes
					// this different from “scrolled to the very top”
					return offset > 0 && Math.abs(top - offset) < 4;
				})
			)
			.toBe(true);
	});

	test('renders nothing on a page with fewer than two headings', async ({
		page,
		examplesServer,
	}) => {
		await page.setViewportSize(WIDE);
		await page.goto(`${examplesServer}${THIN_PAGE}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Second File' })).toBeVisible();

		await expect(page.getByTestId('rsg-pagenav')).toHaveCount(0);
		// and the content column stays where it is without the option: centred in the space
		// beside the sidebar (the empty slot collapses, StyleGuideRenderer's `$pageNav:empty`)
		const heading = (await page.getByRole('heading', { name: 'Second File' }).boundingBox()) as {
			x: number;
		};
		// sidebarWidth 232 + half of the space left over by the 1056 px column at 1500 px
		expect(Math.round(heading.x)).toBe(386);
	});

	test('is off by default, in the all-in-one example', async ({ page, examplesServer }) => {
		await page.setViewportSize(WIDE);
		await page.goto(`${examplesServer}/basic/styleguide/`);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('[data-testid$="-container"]').first()).toBeVisible();
		await expect(page.getByTestId('rsg-pagenav')).toHaveCount(0);
	});
});
