// Ported from the Cypress spec test/cypress/integration/component_spec.js (removed in ADR 0009).
// Runs against the basic example served by test/run.server.js (see playwright.config.ts).
import { test, expect, type Locator, type Page } from '@playwright/test';

// Same shared-page, order-dependent design as core.spec.ts (the Cypress original ran with
// `testIsolation: false`): "changes the render after code change" only works because
// "shows code on click" opened the editor just before it. Serial mode keeps that contract.
test.describe.configure({ mode: 'serial' });

// The code editor, whatever renders it. Today that is react-simple-code-editor's
// <textarea>; the CodeMirror 6 editor renders a contenteditable `.cm-content` instead.
// Both are matched so this spec survives the editor swap without changes.
const EDITOR_SELECTOR = 'textarea, [contenteditable="true"].cm-content';

let page: Page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	// Open the simple Button component in isolation
	await page.goto('/#!/Button');
});

test.afterAll(async () => {
	await page.close();
});

test.describe('Single component', () => {
	test.describe('props and methods section', () => {
		// Playwright locators are lazy (they re-resolve on every use), so unlike the Cypress
		// aliases they are computed once here rather than in a `beforeEach`.
		let propsButton: Locator;
		let tabs: Locator;

		test.beforeAll(() => {
			propsButton = page.getByRole('button', { name: 'Props & methods' });
			// The Cypress spec walked up with `.closest('[class^=rsg--tabs]')`; Playwright has no
			// "closest", so pick the tabs container that contains the button instead. The class
			// prefix comes from the JSS `tabs` rule in ReactComponentRenderer (see setupjss.ts).
			tabs = page.locator('[class^="rsg--tabs"]').filter({ has: propsButton });
		});

		test('is present', async () => {
			await expect(propsButton).toBeVisible();
		});

		test('does not show table initially', async () => {
			await expect(tabs.locator('table')).toHaveCount(0);
		});

		test('shows the table on button click', async () => {
			await propsButton.click();
			await expect(tabs.locator('table')).toContainText('Prop name');
		});
	});

	test.describe('preview section', () => {
		let example: Locator;
		let preview: Locator;
		let viewCodeButton: Locator;

		test.beforeAll(() => {
			// The first playground on the page: `<Button>Push Me</Button>` in the Button readme.
			example = page.locator('[data-testid*="-example-"]').first();
			preview = example.getByTestId('preview-wrapper');
			viewCodeButton = example.getByRole('button', { name: 'View Code' });
		});

		test('renders component preview', async () => {
			await expect(preview.getByRole('button', { name: 'Push Me', exact: true })).toBeVisible();
		});

		test('has view code button', async () => {
			await expect(viewCodeButton).toBeVisible();
		});

		test('does not show code initially', async () => {
			await expect(example.locator(EDITOR_SELECTOR)).toHaveCount(0);
		});

		test('shows code on click', async () => {
			await viewCodeButton.click();
			await expect(example.locator(EDITOR_SELECTOR).first()).toBeVisible();
		});

		test('changes the render after code change', async () => {
			const editor = example.locator(EDITOR_SELECTOR).first();
			// Keyboard-only editing works the same in a <textarea> and in CodeMirror: put the
			// caret at the end of the (single) line, step back over the closing tag and type.
			// `locator.fill()` would not, CodeMirror ignores it.
			await editor.click();
			await page.keyboard.press('End');
			const codeToSkip = '</Button>';
			for (let i = 0; i < codeToSkip.length; i++) {
				await page.keyboard.press('ArrowLeft');
			}
			await page.keyboard.type(' Harder');

			await expect(preview.getByRole('button', { name: 'Push Me Harder' })).toBeVisible();
		});

		test('toggles isolated example mode correctly', async () => {
			const componentExamples = page.locator('[data-testid$="-examples"]');
			const examples = componentExamples.locator('[data-testid*="-example-"]');

			// Toggle into isolated example mode
			await componentExamples.locator('[data-testid$="-isolate-button"]').first().click();

			// Only one example is showing
			await expect(examples).toHaveCount(1);

			// Toggle out of isolated example mode. Like the Cypress original this expects exactly
			// one isolate button on the page: Playwright's strict mode fails on more than one.
			await page.locator('[data-testid$="-isolate-button"]').click();

			// The other examples are showing again
			await expect.poll(() => examples.count()).toBeGreaterThan(1);

			// Check that we've returned to isolated component mode instead of normal mode
			// TODO: this is currently bugged (returns to normal mode rather than isolated component mode)
			// await expect(page.locator('[data-testid$="-container"]')).toHaveCount(1);
		});
	});
});
