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
});
