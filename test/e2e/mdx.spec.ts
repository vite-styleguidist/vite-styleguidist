// The MDX example style guide (examples/mdx), built and served as a static site.
//
// examples.spec.ts already crawls every sidebar link of this build and fails on a runtime
// error, which is the broad coverage; this spec asserts the two things that are specific to
// MDX and that a crawl cannot see: the prose around the playgrounds is a React tree that can
// use an imported component, and a playground inside that tree is a real playground — it
// renders its component and its editor opens.
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
