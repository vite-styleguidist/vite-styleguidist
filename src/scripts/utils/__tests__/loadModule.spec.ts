import fs from 'node:fs';
import nodeModule, { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import loadModule from '../loadModule.js';

// Every fixture here is written to the system temp directory, outside the repository and its
// node_modules: that is the whole point of these tests. `vite-styleguidist` is not resolvable
// from such a folder by any normal means, so a fixture that imports it and loads anyway is
// proof the loader resolved the package to itself.
//
// They import the package the way a user’s config does — through its `exports` map, which
// points at `lib/` — so `npm run compile` has to have run. CI compiles before the unit tests.
const tempDirs: string[] = [];

function writeFixture(name: string, source: string): string {
	// `realpathSync` because macOS’ temp directory is a symlink, and a fixture that reported
	// two different paths for itself would be a confusing thing to debug
	const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'rsg-load-module-'));
	tempDirs.push(dir);
	const file = path.join(dir, name);
	fs.writeFileSync(file, source);
	return file;
}

afterAll(() => {
	tempDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

describe('importing vite-styleguidist from the loaded file', () => {
	it('should resolve the package itself from a CommonJS file that cannot see it', () => {
		const file = writeFixture(
			'config.cjs',
			`const styleguidist = require('vite-styleguidist');
			module.exports = {
				styleguidist: typeof styleguidist,
				defineConfig: typeof styleguidist.defineConfig,
			};`
		);

		expect(loadModule(file)).toEqual({ styleguidist: 'function', defineConfig: 'function' });
	});

	it('should resolve a subpath of the package the same way', () => {
		const file = writeFixture(
			'config.cjs',
			`const styleguidist = require('vite-styleguidist/lib/scripts/index.js');
			module.exports = { styleguidist: typeof styleguidist };`
		);

		expect(loadModule(file)).toEqual({ styleguidist: 'function' });
	});

	// A `.mjs` file is resolved by the ES module loader, not the CommonJS one, which is why
	// the fallback is installed with `module.registerHooks()` where that exists
	it('should resolve the package from an ES module file', () => {
		const file = writeFixture(
			'config.mjs',
			`import styleguidist, { defineConfig } from 'vite-styleguidist';
			export default {
				styleguidist: typeof styleguidist,
				defineConfig: typeof defineConfig,
			};`
		);

		expect(loadModule(file)).toEqual({ styleguidist: 'function', defineConfig: 'function' });
	});

	it('should still fail on a module that really isn’t installed', () => {
		const file = writeFixture('config.cjs', `require('definitely-not-installed');`);

		expect(() => loadModule(file)).toThrow(`Cannot find module 'definitely-not-installed'`);
		try {
			loadModule(file);
		} catch (err) {
			expect((err as NodeJS.ErrnoException).code).toBe('MODULE_NOT_FOUND');
		}
	});

	it('should still fail on a module that really isn’t installed in an ES module file', () => {
		const file = writeFixture('config.mjs', `import 'definitely-not-installed';`);

		expect(() => loadModule(file)).toThrow(/definitely-not-installed/);
	});

	// Node 22.12–22.14 have no `module.registerHooks()`, and the loader falls back to wrapping
	// the private CommonJS resolver there. No CI job runs one of those three versions, so the
	// fallback is exercised by hiding the API the way those versions lack it.
	describe('without module.registerHooks() (Node 22.12–22.14)', () => {
		let registerHooks: typeof nodeModule.registerHooks;

		beforeEach(() => {
			registerHooks = nodeModule.registerHooks;
			// @ts-expect-error the property exists on every Node this package supports but three
			delete nodeModule.registerHooks;
		});
		afterEach(() => {
			nodeModule.registerHooks = registerHooks;
		});

		it('should resolve the package from a CommonJS file', () => {
			const file = writeFixture(
				'config.cjs',
				`module.exports = { styleguidist: typeof require('vite-styleguidist') };`
			);

			expect(loadModule(file)).toEqual({ styleguidist: 'function' });
		});

		it('should still fail on a module that really isn’t installed', () => {
			const file = writeFixture('config.cjs', `require('definitely-not-installed');`);

			expect(() => loadModule(file)).toThrow(`Cannot find module 'definitely-not-installed'`);
		});

		it('should put the resolver back', () => {
			const file = writeFixture('config.cjs', `module.exports = 42;`);
			loadModule(file);

			expect(() => createRequire(file).resolve('vite-styleguidist')).toThrow(
				`Cannot find module 'vite-styleguidist'`
			);
		});
	});

	// The fallback is scoped to the load: it must not leave the rest of the process resolving
	// `vite-styleguidist` from folders that have no business finding it
	it('should stop redirecting the specifier once the file is loaded', () => {
		const file = writeFixture('config.cjs', `module.exports = require('vite-styleguidist');`);
		expect(typeof loadModule(file)).toBe('function');

		expect(() => createRequire(file).resolve('vite-styleguidist')).toThrow(
			`Cannot find module 'vite-styleguidist'`
		);
	});
});
