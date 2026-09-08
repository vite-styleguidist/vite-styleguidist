// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * What the published `exports` map lets a project import.
 *
 * Nothing else in the repository takes this path: the examples and the tests reach
 * Styleguidist through relative paths or Vite aliases, both of which ignore `exports`
 * entirely. Here the package is installed the way npm installs it — a `node_modules`
 * entry pointing at the repository — and Node’s own resolver answers the questions.
 *
 * Skipped when the package hasn’t been compiled (`npm run compile`), like the CLI spec.
 */
const ROOT = path.resolve(import.meta.dirname, '../../..');
const LIB = path.join(ROOT, 'lib');

const describeCompiled = fs.existsSync(LIB) ? describe : describe.skip;

/** Every file under lib/, as a path relative to the package root (`lib/vite/html.js`). */
const libFiles = (): string[] => {
	const walk = (dir: string): string[] =>
		fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
			const file = path.join(dir, entry.name);
			return entry.isDirectory() ? walk(file) : [path.relative(ROOT, file)];
		});
	return walk(LIB).sort();
};

/**
 * Resolve `vite-styleguidist/<subpath>` with Node, from a project that has the package
 * installed. One child process answers every specifier: `import.meta.resolve()` is
 * synchronous and does not check that the file exists, so the result is stat’ed too.
 */
const resolveAll = (specifiers: string[]): Record<string, string | null> => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-exports-'));
	try {
		fs.mkdirSync(path.join(dir, 'node_modules'));
		fs.symlinkSync(ROOT, path.join(dir, 'node_modules/vite-styleguidist'), 'dir');
		fs.writeFileSync(path.join(dir, 'package.json'), '{ "name": "pizza", "type": "module" }');
		const probe = path.join(dir, 'probe.mjs');
		fs.writeFileSync(
			probe,
			`import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = {};
for (const specifier of ${JSON.stringify(specifiers)}) {
	try {
		const file = fileURLToPath(import.meta.resolve(specifier));
		out[specifier] = fs.existsSync(file) ? fs.realpathSync(file) : null;
	} catch {
		out[specifier] = null;
	}
}
console.log(JSON.stringify(out));
`
		);
		return JSON.parse(execFileSync(process.execPath, [probe], { encoding: 'utf8', cwd: dir }));
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
};

const specifierOf = (file: string) => `vite-styleguidist/${file.split(path.sep).join('/')}`;

describeCompiled('the published exports map', () => {
	let files: string[];
	let resolved: Record<string, string | null>;

	beforeAll(() => {
		files = libFiles();
		resolved = resolveAll([
			'vite-styleguidist',
			'vite-styleguidist/package.json',
			// Deep imports as written by a user: the file itself…
			...files.map(specifierOf),
			// …and, for JavaScript, the extensionless form 13.x users are used to
			...files.filter((file) => file.endsWith('.js')).map((file) => specifierOf(file.slice(0, -3))),
			// Not exported: no reaching into the sources or into our dependencies
			'vite-styleguidist/src/client/index.ts',
			'vite-styleguidist/node_modules/vite/package.json',
			'vite-styleguidist/lib/nope/Nope.js',
		]);
	}, 30000);

	it('should resolve the package entry and its package.json', () => {
		expect(resolved['vite-styleguidist']).toBe(path.join(LIB, 'scripts/index.js'));
		expect(resolved['vite-styleguidist/package.json']).toBe(path.join(ROOT, 'package.json'));
	});

	// A new kind of file in lib/ (a stylesheet, a JSON asset copied by scripts/copy-assets.js)
	// needs its own `./lib/*.<ext>` pattern, or the `./lib/*` catch-all appends `.js` to it
	it('should resolve every file it publishes', () => {
		const unreachable = files.filter(
			(file) => resolved[specifierOf(file)] !== path.join(ROOT, file)
		);
		expect(unreachable).toEqual([]);
	});

	// The whole point of the map: `…/SectionsRenderer` resolves to `…/SectionsRenderer.js`
	it('should resolve JavaScript deep imports without the extension', () => {
		const scripts = files.filter((file) => file.endsWith('.js'));
		expect(scripts.length).toBeGreaterThan(100);
		const unreachable = scripts.filter(
			(file) => resolved[specifierOf(file.slice(0, -3))] !== path.join(ROOT, file)
		);
		expect(unreachable).toEqual([]);
	});

	it('should publish nothing but lib/ and package.json', () => {
		expect(resolved['vite-styleguidist/src/client/index.ts']).toBe(null);
		expect(resolved['vite-styleguidist/node_modules/vite/package.json']).toBe(null);
		expect(resolved['vite-styleguidist/lib/nope/Nope.js']).toBe(null);
	});
});
