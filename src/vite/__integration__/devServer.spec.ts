// @vitest-environment node
/**
 * Integration test of the dev server: boots Styleguidist from the TypeScript sources
 * on a temporary project and checks, over HTTP and the HMR WebSocket, that:
 * - the HTML page, static assets (`assetsDir`), custom middlewares (`configureServer`)
 *   and the `template` option work;
 * - the whole module graph (virtual modules, user components, theme file, `require`
 *   entries) is served;
 * - editing Markdown examples, components, theme files and adding/removing component
 *   files produces the expected hot updates (see the `hotUpdate` hook in ../plugin.ts).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import styleguidist from '../../scripts/index.esm.js';
import { RESOLVED_STYLEGUIDE_ID, propsId } from '../ids.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const FIXTURES = path.join(REPO_ROOT, 'test/components');
// The OS picks a free port (Styleguidist forces strictPort, so guessing could collide);
// BASE is derived from the server's resolved URL after startup.
let BASE = '';
const STYLEGUIDE_URL = `/@id/${RESOLVED_STYLEGUIDE_ID.replace('\0', '__x00__')}`;

/** The URL the browser fetches one component’s documentation module from. */
const propsUrl = (componentPath: string) => `/@id/__x00__${propsId(componentPath)}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let projectDir: string;
let server: ViteDevServer | undefined;
let socket: WebSocket | undefined;
const payloads: any[] = [];

/**
 * Fetch a module and, recursively, every module it imports, like a browser would.
 *
 * Dynamic imports count: with `lazyDocs` on (ADR 0019) a component’s documentation is
 * behind `import()` in the style guide module, and a browser reaches it as soon as the
 * component is on screen.
 */
async function crawl(url: string, seen = new Set<string>(), depth = 0): Promise<Set<string>> {
	if (seen.has(url) || depth > 5) {
		return seen;
	}
	seen.add(url);
	const response = await fetch(BASE + url);
	expect(response.status, `${url} should be served`).toBe(200);
	const code = await response.text();
	const imports = [
		...code.matchAll(/from\s+"([^"]+)"|import\s+"([^"]+)"|import\("([^"]+)"\)/g),
	].map((match) => match[1] || match[2] || match[3]);
	for (const imported of imports) {
		if (imported.startsWith('/')) {
			await crawl(imported.split('?t=')[0], seen, depth + 1);
		}
	}
	return seen;
}

/** Wait for HMR payloads and return a compact description of them. */
async function collectUpdates(): Promise<string[]> {
	await sleep(1500);
	return payloads
		.splice(0)
		.flatMap((payload) =>
			payload.type === 'update'
				? payload.updates.map(
						(update: any) => `${update.type} ${update.path} <- ${update.acceptedPath}`
					)
				: [payload.type]
		);
}

beforeAll(async () => {
	// realpath: on macOS `os.tmpdir()` is a symlink (`/var` -> `/private/var`) and the file
	// watcher reports resolved paths, so a fixture built on the unresolved one would compare
	// unequal to every path the plugin sees — and the hot-update assertions below would pass
	// or fail for reasons that have nothing to do with the plugin.
	projectDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-devserver-')));
	fs.cpSync(FIXTURES, path.join(projectDir, 'components'), { recursive: true });
	fs.mkdirSync(path.join(projectDir, 'assets'));
	fs.writeFileSync(path.join(projectDir, 'assets/hello.txt'), 'hello assets');
	fs.writeFileSync(
		path.join(projectDir, 'theme.js'),
		"export default { color: { link: '#f50' } };\n"
	);
	fs.writeFileSync(path.join(projectDir, 'global.css'), 'body { --rsg-test: 1; }\n');
	// Dependencies (react, prop-types, ...) resolve from the repository
	fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(projectDir, 'node_modules'));
	fs.writeFileSync(
		path.join(projectDir, 'styleguide.config.mjs'),
		`import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
export default {
	title: 'Integration test',
	components: 'components/**/[A-Z]*.js',
	assetsDir: path.join(dir, 'assets'),
	theme: 'theme.js',
	require: [path.join(dir, 'global.css')],
	// Test-only escape hatch: let the OS assign a free port
	dangerouslyUpdateViteConfig(viteConfig) {
		viteConfig.server = { ...viteConfig.server, port: 0, strictPort: false };
		return viteConfig;
	},
	template: { favicon: 'favicon.ico', head: { raw: '<meta name="x-test" content="yes">' } },
	configureServer(app, env) {
		app.use('/custom', (req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ response: 'Server invoked', env }));
		});
	},
};
`
	);

	server = await styleguidist(path.join(projectDir, 'styleguide.config.mjs')).server();
	BASE = (server?.resolvedUrls?.local[0] ?? '').replace(/\/$/, '');
	if (!BASE) {
		throw new Error('The dev server did not report a URL');
	}
	socket = new WebSocket(BASE.replace(/^http/, 'ws') + '/', 'vite-hmr');
	socket.addEventListener('message', (event) => {
		payloads.push(JSON.parse(String(event.data)));
	});
	await new Promise<void>((resolve, reject) => {
		socket?.addEventListener('open', () => resolve());
		socket?.addEventListener('error', () => reject(new Error('Cannot connect to the HMR socket')));
	});
}, 60000);

afterAll(async () => {
	socket?.close();
	// Keep-alive connections opened by fetch() would otherwise keep the server alive
	(server?.httpServer as import('node:http').Server | null)?.closeAllConnections();
	await server?.close();
	fs.rmSync(projectDir, { recursive: true, force: true });
});

test('serves the HTML page built from the template option', async () => {
	const html = await (await fetch(BASE + '/')).text();
	expect(html).toContain('<title>Integration test</title>');
	expect(html).toContain('favicon.ico');
	expect(html).toContain('<meta name="x-test" content="yes">');
	expect(html).toContain('/@id/__x00__virtual:rsg-entry');
	// Injected by Vite / plugin-react
	expect(html).toContain('/@vite/client');
});

test('serves static assets and custom middlewares', async () => {
	expect((await (await fetch(BASE + '/hello.txt')).text()).trim()).toBe('hello assets');
	expect(await (await fetch(BASE + '/custom')).json()).toEqual({
		response: 'Server invoked',
		env: 'development',
	});
});

test('serves the machine-readable docs, regenerated from the sources', async () => {
	const response = await fetch(BASE + '/docs.json');
	expect(response.status).toBe(200);
	expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
	const manifest = await response.json();
	expect(manifest).toMatchObject({ source: 'vite-styleguidist', name: 'Integration test' });
	const names = manifest.sections[0].components.map((component: any) => component.name);
	expect(names).toContain('Button');

	const llms = await fetch(BASE + '/llms.txt');
	expect(llms.headers.get('content-type')).toBe('text/plain; charset=utf-8');
	expect(await llms.text()).toContain('- [Button](index.html#button)');

	// An edit shows up on the next request, no restart needed
	const readme = path.join(projectDir, 'components/Button/Readme.md');
	fs.appendFileSync(readme, '\nA fresh example:\n\n```jsx\n<Button>Fresh</Button>\n```\n');
	const updated = await (await fetch(BASE + '/docs.json')).json();
	const button = updated.sections[0].components.find((c: any) => c.name === 'Button');
	expect(button.examples.at(-1)).toMatchObject({
		code: '<Button>Fresh</Button>',
		description: 'A fresh example:',
	});
});

test('serves the whole module graph', async () => {
	const urls = await crawl('/@id/__x00__virtual:rsg-entry');
	const list = [...urls];
	expect(list).toContain(STYLEGUIDE_URL);
	expect(list.some((url) => url.includes('/components/Button/Button.js'))).toBe(true);
	expect(list.some((url) => url.includes('__x00__virtual:rsg-props?'))).toBe(true);
	expect(list.some((url) => url.includes('__x00__virtual:rsg-examples?'))).toBe(true);
	expect(list.some((url) => url.endsWith('/theme.js'))).toBe(true);
	expect(list.some((url) => url.includes('global.css'))).toBe(true);
	payloads.splice(0);
}, 30000);

test('hot updates the style guide when a Markdown example changes', async () => {
	const readme = path.join(projectDir, 'components/Button/Readme.md');
	fs.appendFileSync(readme, '\nEdited example\n');
	const updates = await collectUpdates();
	expect(updates.some((update) => update.endsWith(`<- ${STYLEGUIDE_URL}`))).toBe(true);
});

test('hot updates the component and its documentation when a component changes', async () => {
	const component = path.join(projectDir, 'components/Button/Button.js');
	fs.appendFileSync(component, '\n// edited\n');
	const updates = await collectUpdates();
	// Fast Refresh of the component itself…
	expect(updates.some((update) => /Button\.js <- .*Button\.js$/.test(update))).toBe(true);
	// …and the re-generated react-docgen documentation, pushed through the styleguide module
	expect(updates.some((update) => update.endsWith(`<- ${STYLEGUIDE_URL}`))).toBe(true);
});

test('hot updates the style guide when a component file is added or removed', async () => {
	const file = path.join(projectDir, 'components/Newby.js');
	fs.writeFileSync(
		file,
		"import React from 'react';\nexport default function Newby() { return <b>new</b>; }\n"
	);
	expect((await collectUpdates()).some((update) => update.endsWith(`<- ${STYLEGUIDE_URL}`))).toBe(
		true
	);
	fs.unlinkSync(file);
	expect((await collectUpdates()).some((update) => update.endsWith(`<- ${STYLEGUIDE_URL}`))).toBe(
		true
	);
});

test('hot updates the style guide when the theme file changes', async () => {
	fs.writeFileSync(
		path.join(projectDir, 'theme.js'),
		"export default { color: { link: '#0f0' } };\n"
	);
	expect((await collectUpdates()).some((update) => update.endsWith(`<- ${STYLEGUIDE_URL}`))).toBe(
		true
	);
});

// A component can get its first examples file while the server is running — writing the
// Readme.md of a component you have just started documenting is the ordinary way to use
// the dev server. The answer to “which file is this component’s examples file” comes from a
// memoized directory listing, which is why this needs a hot update of its own.
test('hot updates a component’s documentation when its first examples file appears', async () => {
	const component = path.join(projectDir, 'components/Price/Price.js');
	const url = propsUrl(component);

	const before = await (await fetch(BASE + url)).text();
	expect(before).not.toContain('rsg-examples');

	const readme = path.join(projectDir, 'components/Price/Readme.md');
	fs.writeFileSync(readme, 'An example:\n\n```jsx\n<Price fallback="Free" />\n```\n');
	try {
		await collectUpdates();
		const after = await (await fetch(BASE + url)).text();
		expect(after).toContain('rsg-examples');
	} finally {
		fs.unlinkSync(readme);
		await collectUpdates();
	}

	// …and disappears again when the file does
	const removed = await (await fetch(BASE + url)).text();
	expect(removed).not.toContain('rsg-examples');
}, 30000);
