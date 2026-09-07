// Ported from the Cypress spec test/cypress/integration/core_spec.js (removed in ADR 0009).
// Runs against the basic example served by test/run.server.js (see playwright.config.ts).
import { test, expect, type Page } from '@playwright/test';

// The Cypress suite loaded the page once per file and let the tests share it
// (`testIsolation: false`), so the tests below are order-dependent by design. Serial mode
// plus one page created in `beforeAll` keeps exactly those semantics: a failure skips the
// rest of the file, and a retry starts the whole file over in a fresh worker. Splitting
// them into independent tests is a separate change, not part of the port.
test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	await page.goto('/');
});

test.afterAll(async () => {
	await page.close();
});

test.describe('Styleguidist core', () => {
	test('loads the page', async () => {
		await expect(page).toHaveTitle(/Vite Styleguidist/);
	});

	test('shows multiple components in normal mode', async () => {
		await expect.poll(() => page.locator('[data-testid$="-container"]').count()).toBeGreaterThan(1);
	});

	test('toggles isolated component mode correctly', async () => {
		const containers = page.locator('[data-testid$="-container"]');
		const sidebar = page.getByTestId('sidebar');
		// Locators are lazy, so the same locator finds the "exit" button once we are isolated.
		const isolateButton = page.locator('[data-testid$="-isolate-button"]').first();

		// Toggle into isolated mode
		await isolateButton.click();

		// Only one component is showing and the sidebar is gone
		await expect(containers).toHaveCount(1);
		await expect(sidebar).toHaveCount(0);

		// Toggle out of isolated mode
		await isolateButton.click();

		// More than one component is showing again, and so is the sidebar
		await expect.poll(() => containers.count()).toBeGreaterThan(1);
		await expect(sidebar).toHaveCount(1);
	});

	test('switches the colour scheme and remembers it across reloads', async () => {
		const html = page.locator('html');
		const toggle = page.getByRole('group', { name: 'Color scheme' });

		// Default: nothing forced, the page follows the OS (no data-rsg-theme attribute)
		await expect(toggle.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
		await expect(html).not.toHaveAttribute('data-rsg-theme');

		await toggle.getByRole('button', { name: 'Dark' }).click();
		await expect(html).toHaveAttribute('data-rsg-theme', 'dark');

		// The inline head script applies the stored choice before first paint
		await page.reload();
		await expect(html).toHaveAttribute('data-rsg-theme', 'dark');
		await expect(toggle.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');

		// Back to the default so the shared page (and localStorage) is clean for later tests
		await toggle.getByRole('button', { name: 'System' }).click();
		await expect(html).not.toHaveAttribute('data-rsg-theme');
	});

	// `scrollSync: 'selection'`, the default in the all-in-one display mode (ADR 0015).
	test('moves the sidebar selection with the scroll without touching the URL', async () => {
		// A clean scroll position, whatever the tests above left behind
		await page.goto('/');
		// The lazily loaded editor chunks keep changing the height of the page as they
		// arrive, and “what is at the bottom” is a different question for each height
		await page.waitForLoadState('networkidle');

		const current = page.locator('[data-testid="rsg-toc-link"][aria-current="true"]');
		const entries = page.locator('[data-testid="rsg-toc-link"]');
		const names = {
			first: await entries.first().textContent(),
			last: await entries.last().textContent(),
		};
		const historyLength = await page.evaluate(() => history.length);

		// The top of the document selects the first entry, not nothing
		await expect(current).toHaveText(names.first as string);

		// Re-scrolled on every poll, so that a page still growing underneath cannot make
		// this a test of the wrong document. The last component sits in the last screenful,
		// where only the “document bottom” rule can select it: its heading never reaches the
		// activation line.
		await expect
			.poll(async () => {
				await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
				return current.textContent();
			})
			.toBe(names.last);

		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(current).toHaveText(names.first as string);

		// The default mode writes neither the URL nor the history stack
		expect(new URL(page.url()).hash).toBe('');
		expect(await page.evaluate(() => history.length)).toBe(historyLength);
	});

	test('keeps a clicked entry selected while the page scrolls to it', async () => {
		const current = page.locator('[data-testid="rsg-toc-link"][aria-current="true"]');
		const last = page.locator('[data-testid="rsg-toc-link"]').last();
		const name = (await last.textContent()) as string;

		await last.click();

		// The scroll spy must not take the selection back to whatever is on the activation
		// line: the bottom of the page cannot put the last component's heading there
		await expect(current).toHaveText(name);
		await page.waitForTimeout(500);
		await expect(current).toHaveText(name);
	});
});
