// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import glogg from 'glogg';
import type { Plugin } from 'vite';
import deepImports, { isLegacyPackageInstalled, LEGACY_PACKAGE_NOTICE } from '../deepImports.js';

// Vite hooks may be plain functions or `{ handler }` objects; our plugin uses functions
// but the types don’t know that
const hook = <T>(value: T | { handler: T } | undefined): T => {
	if (!value) {
		throw new Error('Hook not defined');
	}
	return typeof value === 'function' ? value : (value as { handler: T }).handler;
};

/**
 * A package folder to resolve out of: `lib/client/rsg-components/Link/index.js` (a folder
 * import), `lib/client/rsg-components/Link/LinkRenderer.js` (a file) and nothing else.
 */
const createPackageDir = (): string => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-deep-imports-'));
	const components = path.join(dir, 'lib/client/rsg-components/Link');
	fs.mkdirSync(components, { recursive: true });
	fs.writeFileSync(
		path.join(components, 'index.js'),
		'export { default } from "./LinkRenderer.js";'
	);
	fs.writeFileSync(
		path.join(components, 'LinkRenderer.js'),
		'export default function LinkRenderer() {}'
	);
	return fs.realpathSync(dir);
};

/**
 * A plugin context whose `this.resolve()` behaves like Vite’s: it knows the ids in
 * `resolvable` and, for an absolute path, tries the extension and the folder’s `index.js`
 * the way Vite’s file system probing does.
 */
const createContext = (resolvable: string[] = []) => ({
	resolve: vi.fn(async (id: string) => {
		if (resolvable.includes(id)) {
			return { id };
		}
		if (path.isAbsolute(id)) {
			for (const candidate of [id, `${id}.js`, path.join(id, 'index.js')]) {
				if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
					return { id: candidate };
				}
			}
		}
		return null;
	}),
});

const resolveId = (plugin: Plugin, id: string, context: any, importer = '/project/src/Custom.js') =>
	(hook(plugin.resolveId) as any).call(context, id, importer, {});

let packageDir: string;
beforeAll(() => {
	packageDir = createPackageDir();
});

describe('deepImports', () => {
	const createPlugin = (aliasLegacyPackage = true) =>
		deepImports({ packageDir, aliasLegacyPackage });

	it('should ignore imports of anything but Styleguidist', async () => {
		const context = createContext();
		const plugin = createPlugin();
		await expect(resolveId(plugin, 'react', context)).resolves.toBe(null);
		await expect(resolveId(plugin, './Button.js', context)).resolves.toBe(null);
		// A different package whose name merely starts the same way
		await expect(resolveId(plugin, 'vite-styleguidist-theme/x.js', context)).resolves.toBe(null);
		expect(context.resolve).not.toHaveBeenCalled();
	});

	// The `exports` map appends `.js`, so a folder no longer resolves through the package
	// name; this is what keeps `…/rsg-components/Link` working inside a style guide
	it('should resolve a folder import from the running package', async () => {
		await expect(
			resolveId(createPlugin(), 'vite-styleguidist/lib/client/rsg-components/Link', createContext())
		).resolves.toEqual({ id: path.join(packageDir, 'lib/client/rsg-components/Link/index.js') });
	});

	it('should resolve an extensionless file the package name cannot resolve', async () => {
		await expect(
			resolveId(
				createPlugin(),
				'vite-styleguidist/lib/client/rsg-components/Link/LinkRenderer',
				createContext()
			)
		).resolves.toEqual({
			id: path.join(packageDir, 'lib/client/rsg-components/Link/LinkRenderer.js'),
		});
	});

	it('should leave an unknown file to the resolver that reported it missing', async () => {
		await expect(
			resolveId(createPlugin(), 'vite-styleguidist/lib/nope/Nope.js', createContext())
		).resolves.toBe(null);
	});

	// `lib/` is the only published folder: a subpath may not walk out of the package
	it('should refuse to serve anything outside lib/', async () => {
		const context = createContext();
		const plugin = createPlugin();
		await expect(resolveId(plugin, 'vite-styleguidist/src/client/index.ts', context)).resolves.toBe(
			null
		);
		await expect(resolveId(plugin, 'vite-styleguidist/lib/../../secret.js', context)).resolves.toBe(
			null
		);
		expect(context.resolve).not.toHaveBeenCalled();
	});

	describe('the old package name', () => {
		const logger = glogg('rsg');
		const messages: string[] = [];
		beforeEach(() => {
			messages.length = 0;
			logger.on('info', (message: string) => messages.push(message));
		});
		afterEach(() => {
			logger.removeAllListeners();
		});

		it('should serve deep imports from the package installed in the project', async () => {
			// The project has vite-styleguidist: the import must land on that copy, the one
			// every other import of Styleguidist in the same bundle resolves to
			const context = createContext([
				'vite-styleguidist/lib/client/rsg-components/Link/LinkRenderer',
			]);
			await expect(
				resolveId(
					createPlugin(),
					'react-styleguidist/lib/client/rsg-components/Link/LinkRenderer',
					context
				)
			).resolves.toEqual({ id: 'vite-styleguidist/lib/client/rsg-components/Link/LinkRenderer' });
		});

		it('should fall back to the running package when the project cannot resolve the name', async () => {
			await expect(
				resolveId(
					createPlugin(),
					'react-styleguidist/lib/client/rsg-components/Link/LinkRenderer',
					createContext()
				)
			).resolves.toEqual({
				id: path.join(packageDir, 'lib/client/rsg-components/Link/LinkRenderer.js'),
			});
		});

		it('should serve the bare package name too', async () => {
			const context = createContext(['vite-styleguidist']);
			await expect(resolveId(createPlugin(), 'react-styleguidist', context)).resolves.toEqual({
				id: 'vite-styleguidist',
			});
		});

		it('should log the notice once, and only when an import is actually served', async () => {
			const plugin = createPlugin();
			const context = createContext(['vite-styleguidist/lib/x.js']);
			await resolveId(plugin, 'vite-styleguidist/lib/client/rsg-components/Link', context);
			expect(messages).toEqual([]);
			await resolveId(plugin, 'react-styleguidist/lib/x.js', context);
			await resolveId(plugin, 'react-styleguidist/lib/x.js', context);
			expect(messages).toEqual([LEGACY_PACKAGE_NOTICE]);
		});

		it('should keep out of the way when the old package is installed', async () => {
			const context = createContext();
			await expect(
				resolveId(createPlugin(false), 'react-styleguidist/lib/x.js', context)
			).resolves.toBe(null);
			expect(context.resolve).not.toHaveBeenCalled();
			expect(messages).toEqual([]);
		});
	});
});

describe('isLegacyPackageInstalled', () => {
	/** A project folder whose node_modules holds react-styleguidist, or doesn’t. */
	const createProject = (installed: boolean): string => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsg-legacy-installed-'));
		fs.writeFileSync(path.join(dir, 'package.json'), '{ "name": "pizza" }');
		if (installed) {
			const pkgDir = path.join(dir, 'node_modules/react-styleguidist');
			fs.mkdirSync(pkgDir, { recursive: true });
			fs.writeFileSync(
				path.join(pkgDir, 'package.json'),
				'{ "name": "react-styleguidist", "version": "13.1.4", "main": "index.js" }'
			);
			fs.writeFileSync(path.join(pkgDir, 'index.js'), 'module.exports = {};');
		}
		return dir;
	};

	it('should find the old package in the project', () => {
		expect(isLegacyPackageInstalled(createProject(true))).toBe(true);
	});

	it('should report a project without it', () => {
		expect(isLegacyPackageInstalled(createProject(false))).toBe(false);
	});
});
