// The MDX example style guide (examples/mdx), built and served as a static site.
//
// examples.spec.ts already crawls every sidebar link of this build and fails on a runtime
// error, which is the broad coverage; this spec asserts the three things that are specific to
// MDX and that a crawl cannot see: the prose around the playgrounds is a React tree that can
// use an imported component, a playground inside that tree is a real playground — it renders
// its component and its editor opens — and the headings of the compiled page carry the ids a
// `#!/Page?id=heading` link needs (src/loaders/utils/mdx.ts; @mdx-js/mdx emits none itself).
//
// Needs `npm run compile` and `npm run build:mdx` first, like the examples spec.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { test as base, expect } from '@playwright/test';

const EXAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../examples');

// Same static server as examples.spec.ts: Vite emits `<script type="module">`, which browsers
// refuse to run from a file:// URL, and the build references its assets relatively.
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

// The built-in CodeMirror 6 editor is a contenteditable; a replacement configured through
// styleguideComponents.Editor is most likely a <textarea>. Same selector as component.spec.ts.
const EDITOR_SELECTOR = 'textarea, [contenteditable="true"].cm-content';

// Button is documented in src/components/Button/Readme.mdx.
const buttonPage = (server: string) => `${server}/mdx/styleguide/#!/Button`;

test.describe('MDX documentation page', () => {
	test('renders prose, an imported component and a GFM table', async ({ page, examplesServer }) => {
		await page.goto(buttonPage(examplesServer));

		// Prose goes through the style guide's own renderers, so it is a paragraph on the page.
		await expect(page.locator('p').filter({ hasText: /every fenced code block/ })).toBeVisible();

		// `Callout` is imported at the top of Readme.mdx and used as a JSX element in the prose:
		// the thing a .md page cannot do. Its own markup (src/docs/Callout.js) is on the page.
		await expect(page.locator('.callout-info').first()).toBeVisible();

		// remark-gfm is on by default, so the sizes table is a table and not a paragraph.
		await expect(page.locator('table').filter({ hasText: 'Dense toolbars' })).toBeVisible();
	});

	test('gives its headings ids and scrolls to one through a fragment link', async ({
		page,
		examplesServer,
	}) => {
		// A short viewport so that the target heading can actually reach the top of the window:
		// the browser cannot scroll past the end of the document, and `Sizes` is near it.
		await page.setViewportSize({ width: 1024, height: 320 });
		await page.goto(buttonPage(examplesServer));

		// The ids themselves — before src/loaders/utils/mdx.ts assigned them, an MDX heading had
		// no id at all and every fragment link into the page silently did nothing
		const sizes = page.getByRole('heading', { name: 'Sizes', exact: true });
		await expect(sizes).toHaveAttribute('id', 'sizes');
		await expect(page.getByRole('heading', { name: 'What this page exercises' })).toHaveAttribute(
			'id',
			'what-this-page-exercises'
		);

		// …and the link written in Readme.mdx, which is what a reader actually uses. The style
		// guide routes on the hash, so a heading link is `#!/Button?id=sizes`, handled by
		// scrollToOrigin() in src/client/index.ts.
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
		await page.getByRole('link', { name: 'jump to the sizes table' }).click();
		await expect(page).toHaveURL(/#!\/Button\?id=sizes$/);

		// The heading ends up under the sticky offset (0 on a wide screen, the height of the
		// small-screen header otherwise — see STICKY_OFFSET_PROPERTY in src/client/styles/styles.ts)
		await expect
			.poll(async () => Math.round((await sizes.boundingBox())?.y ?? Number.NaN))
			.toBeLessThanOrEqual(4);
		const box = await sizes.boundingBox();
		expect(box?.y).toBeGreaterThanOrEqual(-4);
		expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	});

	test('renders a playground and opens its editor', async ({ page, examplesServer }) => {
		await page.goto(buttonPage(examplesServer));

		// The first playground of the page: ```jsx <Button>Push Me</Button>.
		const example = page.locator('[data-testid*="-example-"]').first();
		const preview = example.getByTestId('preview-wrapper');
		await expect(preview.getByRole('button', { name: 'Push Me', exact: true })).toBeVisible();

		// The editor is collapsed until View Code is clicked, exactly as on a Markdown page.
		await expect(example.locator(EDITOR_SELECTOR)).toHaveCount(0);
		await example.getByRole('button', { name: 'View Code' }).click();
		await expect(example.locator(EDITOR_SELECTOR).first()).toBeVisible();
		await expect(example.locator(EDITOR_SELECTOR).first()).toContainText('Push Me');
	});
});
