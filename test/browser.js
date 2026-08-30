// Smoke test: opens a built style guide in headless Chrome and fails on any JavaScript error.
//
// Usage: node test/browser.js <styleguide directory or URL> [screenshot.png]
//
// A directory is served over HTTP first: Vite builds use `<script type="module">`,
// which browsers refuse to run from file:// URLs.
import http from 'node:http';
import path from 'node:path';
import puppeteer from 'puppeteer';
import sirv from 'sirv';

const args = process.argv.slice(2);

let browser;
let server;

async function cleanup() {
	if (browser) {
		await browser.close();
	}
	if (server) {
		server.close();
	}
}

process.on('unhandledRejection', (reason) => {
	console.log('Unhandled Promise rejection:', reason);
	cleanup().then(() => process.exit(1));
});

async function onerror(err) {
	console.error(err.stack || err);
	await cleanup();
	process.exit(1);
}

function serve(dir) {
	return new Promise((resolve) => {
		server = http.createServer(sirv(dir, { dev: true }));
		server.listen(0, '127.0.0.1', () => {
			resolve(`http://127.0.0.1:${server.address().port}/`);
		});
	});
}

(async () => {
	const url = /^https?:/.test(args[0]) ? args[0] : await serve(path.resolve(args[0]));

	browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
	const page = await browser.newPage();
	await page.setViewport({ width: 1024, height: 768 });
	page.on('error', onerror);
	page.on('pageerror', onerror);

	page.on('console', (msg) => {
		if (msg.type() !== 'clear') {
			console.log('PAGE LOG:', msg.text());
		}
	});

	await page.goto(url, { waitUntil: 'networkidle0' });

	// Make sure the style guide actually rendered something, including documentation
	// prose (a runtime that silently drops Markdown still shows the containers)
	const rendered = await page.evaluate(() => ({
		containers:
			document.querySelector('[data-testid$="-container"], [data-testid^="section-"]') !== null,
		prose: [...document.querySelectorAll('p')].some((p) => p.textContent.trim().length > 0),
	}));
	if (!rendered.containers) {
		throw new Error(`No component was rendered at ${url}`);
	}
	if (!rendered.prose) {
		throw new Error(`No documentation text was rendered at ${url}`);
	}

	if (args[1]) {
		await page.screenshot({ path: args[1] });
	}

	await cleanup();
})().catch(onerror);
